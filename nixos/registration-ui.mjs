import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';

export function registrationFailure(error, t) {
  if(error.code==='service')return t('登録サービスがまだ利用できません。ネット接続とOSのインストールは保持されています。サービスの準備後に再試行してください。','The registration service is unavailable. Your installed OS and network settings are preserved. Retry when the service is ready.');
  if(error.code==='expired')return t('承認の有効期限が切れました。もう一度登録すると、新しいQRが表示されます。','Approval expired. Retry to display a new QR.');
  if(error.code==='revoked')return t('この端末の登録は解除されています。アカウントの所有者に確認してください。自動で別のアカウントに登録することはありません。','This device registration was revoked. Contact the account owner.');
  return t('連携を確認できませんでした。接続を確認して再試行できます。再インストールは不要です。','Could not verify account linking. Check the connection and retry. Reinstallation is not needed.');
}

// A local dialog owns cancellation; the HTTP poll owns approval. Closing the
// screen aborts polling and never saves a receipt or resets the device identity.
export async function approvalScreen(flow, controller, t, root='/run/murakumo-ui') {
  const dir=await mkdtemp(join(root,'approval.'));
  const path=join(dir,'qr.txt');
  const qr=spawnSync('qrencode',['-t','UTF8',flow.verificationUriComplete],{encoding:'utf8'});
  if(qr.status!==0){await rm(dir,{recursive:true,force:true});throw Error('QR generation failed');}
  const content=[t('QRをスマホで読む → Passkeyでログイン → 端末IDとコードを照合して承認','Scan QR → Sign in with a Passkey → Check Device ID and code → Approve'),
    `Code: ${flow.userCode}`,`Device ID: ${flow.deviceDid}`,
    qr.stdout.trimEnd(),
    t('承認待ち · 有効期限5分 · 承認後は自動で次へ進みます','Waiting for approval · Expires in 5 minutes · Continues automatically'),
    t('スマホにもネット接続が必要です。Enter / Escであとで登録。','Your phone needs Internet. Enter / Esc to register later.'),
    flow.verificationUriComplete].join('\n');
  try{await writeFile(path,content,{mode:0o600});}catch(e){await rm(dir,{recursive:true,force:true});throw e;}
  const child=spawn('dialog',['--clear','--title','Murakumo','--exit-label',t('あとで登録','Register later'),'--textbox',path,'0','0'],{stdio:'inherit',env:{...process.env,TERM:'linux',LC_ALL:'C.UTF-8'}});
  let closing=false;
  const ended=new Promise(resolve=>{
    child.once('error',e=>{if(!closing)controller.abort(e);resolve();});
    child.once('exit',()=>{if(!closing)controller.abort(new DOMException('Registration deferred','AbortError'));resolve();});
  });
  return async()=>{closing=true;child.kill();await ended;await rm(dir,{recursive:true,force:true});};
}

export async function registerWithUI({link,screen,ui,t,options={},onFailure}){
  const controller=new AbortController();
  let close;
  try{
    return await link({...options,signal:controller.signal,display:()=>{},onFlow:async flow=>{close=await screen(flow,controller,t);}});
  }catch(e){
    if(controller.signal.aborted)return null;
    // Close the waiting dialog before opening the error dialog on the same TTY.
    await close?.();close=null;
    if(onFailure)onFailure(e);
    else ui.message(registrationFailure(e,t));
    return null;
  }finally{await close?.();}
}


// The guide owns retries. Network or registration failures remain on an
// actionable screen instead of exiting into a systemd restart loop.
export async function runSetup({ui,t,readSaved,network,register,poweroff}) {
  let saved=null,verified=false,failure=null,state='network',storageError=false;
  try {saved=await readSaved();if(saved)state='complete';}
  catch {storageError=true;state='complete';}
  for (;;) {
    if(state==='network') {
      try {
        const result=await network({registered:!!saved});
        state=result==='connected'?'register':'complete';
        failure=null;
      } catch {
        failure=t('接続設定を確認できませんでした。接続設定から再試行できます。','Could not check the network. Retry from connection settings.');
        state='complete';
      }
      continue;
    }
    if(state==='register') {
      ui.busy(t(saved?'Murakumoの登録状態を確認しています…':'スマホで登録するためのQRを準備しています…',saved?'Verifying registration…':'Preparing your phone registration QR…'));
      let error;
      let receipt;
      try {receipt=await register(e=>{error=e;});}catch(e){error=e;}
      if(receipt){saved=receipt;verified=true;failure=null;state='complete';}
      else if(error){failure=registrationFailure(error,t);verified=false;state='retry';}
      else {failure=null;state='complete';}
      continue;
    }
    const status=[
      t('1 OS：インストール完了','1 OS: installed'),
      t(saved?'3 アカウント：連携情報を保存済み':'3 アカウント：あとで登録できます',saved?'3 Account: linking information saved':'3 Account: registration pending'),
      ...(saved?[t(verified?'登録状態：今回の起動で確認済み':'登録状態：オンライン確認前',verified?'Registration: verified during this boot':'Registration: online verification pending'),`Account ID: ${saved.accountDid}`,`Device ID: ${saved.deviceDid}`]:[]),
      t('Wi-Fi / 有線の設定は保存されます。再インストールは不要です。','Network settings are saved. Reinstallation is not needed.'),
      ...(failure?['',failure]:[]),
      ...(storageError?[t('保存済みの登録情報を読み取れません。登録情報を保持したまま、保守担当者に確認してください。','Saved registration cannot be read. Contact maintenance; registration information is preserved.')]:[]),
      ...(verified?[t('モデルと推論の稼働確認は別の手順です。','Model and inference readiness are verified separately.')]:[]),
    ].join('\n');
    const action=ui.menu(status,[
      ...(!storageError?[[state==='retry'?'retry':'connect',t(state==='retry'?'登録を再試行する':saved?'オンラインで登録状態を確認する':'ネットに接続してスマホで登録する',state==='retry'?'Retry registration':saved?'Verify registration online':'Connect and register using your phone')]]:[]),
      ['network',t('Wi-Fi / 有線の接続設定','Wi-Fi / Ethernet settings')],
      ...(state==='retry'?[['later',t('あとで登録する','Register later')]]:[]),
      ['shutdown',t('電源を切る','Shut down')],
    ]);
    if(action==='shutdown') {
      if(await poweroff())return;
      failure=t('電源を切れませんでした。もう一度お試しください。','Could not shut down. Please retry.');
    } else if(action==='retry'&&!storageError)state='register';
    else if(action==='connect'&&!storageError)state='network';
    else if(action==='network') {
      // An unreadable receipt must never start an automatic replacement claim.
      if(storageError){try{await network({registered:true});}catch{}state='complete';}
      else state='network';
    } else if(action==='later'||!action)state='complete';
  }
}
