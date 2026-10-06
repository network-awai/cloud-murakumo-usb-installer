import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';

export function registrationFailure(error, t) {
  if(error.code==='service'&&error.status===404)return t('登録機能が接続先で公開されていません（HTTP 404）。Wi-Fiやスマホの設定変更、再インストールは不要です。この端末だけでセットアップを完了し、公開後に連携できます。','The registration route is not published (HTTP 404). No Wi-Fi or phone changes or reinstallation are needed. Complete local setup and link after the service is published.');
  if(error.code==='service')return t('登録サービスがまだ利用できません。ネット接続とOSは保持されています。「この端末だけでセットアップを完了する」を選べます。連携はサービスの準備後に再試行してください。','The registration service is unavailable. Your installed OS and network settings are preserved. Complete local setup without a phone, or retry when the service is ready.');
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
  const content=[t('スマホでQRを読む、または別のPCでURLを開く → Passkeyでログイン → 端末IDとコードを照合して承認','Scan QR or open the URL on another computer → Sign in with a Passkey → Check Device ID and code → Approve'),
    `Code: ${flow.userCode}`,`Device ID: ${flow.deviceDid}`,
    qr.stdout.trimEnd(),
    t('承認待ち · 有効期限5分 · 承認後は自動で次へ進みます','Waiting for approval · Expires in 5 minutes · Continues automatically'),
    t('連携に使う機器にもネット接続が必要です。Enter / Escであとで登録。','The approving device needs Internet. Enter / Esc to link later.'),
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
export async function runSetup({ui,t,readSaved,network,register,poweroff,readLocal=async()=>null,completeLocal}) {
  let saved=null,local=null,verified=false,failure=null,state='choose',storageError=false,wantsLink=false;
  try {saved=await readSaved();local=await readLocal();if(saved||local)state='complete';}
  catch {storageError=true;state='complete';}
  for (;;) {
    if(state==='choose') {
      const choice=ui.menu(t('使い方を選んでください。ローカルのセットアップはスマホ・アカウント・インターネットなしで完了します。','Choose how to use this device. Local setup needs no phone, account or Internet.'),[
        ...(completeLocal?[['local',t('この端末だけでセットアップを完了する','Complete setup on this device')]]:[]),
        ['connect',t('Murakumoアカウントに連携する','Link a Murakumo account')],
        ['network',t('Wi-Fi / 有線の接続設定','Wi-Fi / Ethernet settings')],
        ['shutdown',t('電源を切る','Shut down')],
      ]);
      if(choice==='local'){
        try {local=await completeLocal();state='complete';failure=null;}
        catch {failure=t('ローカル設定を保存できませんでした。再試行できます。','Could not save local setup. Please retry.');state='complete';}
      } else if(choice==='connect'||choice==='network'){wantsLink=choice==='connect';state='network';}
      else if(choice==='shutdown'&&await poweroff())return;
      continue;
    }
    if(state==='network') {
      try {
        const result=await network({registered:!!saved});
        state=result==='connected'&&wantsLink?'register':'complete';
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
      t('OS：インストール完了','OS: installed'),
      ...(local?[t('セットアップ：この端末で完了（スマホ不要）','Setup: completed locally (no phone needed)'),`Device ID: ${local.deviceDid}`,t('共有ネットワーク・推論・報酬の利用には別途確認が必要です。','Shared network participation, inference and rewards require separate verification.')]:[]),
      t(saved?'アカウント：連携情報を保存済み':'アカウント：あとで登録できます',saved?'Account: linking information saved':'Account: registration pending'),
      ...(saved?[t(verified?'登録状態：今回の起動で確認済み':'登録状態：オンライン確認前',verified?'Registration: verified during this boot':'Registration: online verification pending'),`Account ID: ${saved.accountDid}`,`Device ID: ${saved.deviceDid}`]:[]),
      t('Wi-Fi / 有線の設定は保存されます。再インストールは不要です。','Network settings are saved. Reinstallation is not needed.'),
      ...(failure?['',failure]:[]),
      ...(storageError?[t('保存済みの登録情報を読み取れません。登録情報を保持したまま、保守担当者に確認してください。','Saved registration cannot be read. Contact maintenance; registration information is preserved.')]:[]),
      ...(verified?[t('モデルと推論の稼働確認は別の手順です。','Model and inference readiness are verified separately.')]:[]),
    ].join('\n');
    const action=ui.menu(status,[
      ...(!storageError?[[state==='retry'?'retry':'connect',t(state==='retry'?'登録を再試行する':saved?'オンラインで登録状態を確認する':'ネットに接続してスマホで登録する',state==='retry'?'Retry registration':saved?'Verify registration online':'Connect and register using your phone')]]:[]),
      ...(!storageError&&!local&&completeLocal? [['local',t('この端末だけでセットアップを完了する','Complete setup on this device')]]:[]),
      ['network',t('Wi-Fi / 有線の接続設定','Wi-Fi / Ethernet settings')],
      ...(state==='retry'?[['later',t('あとで登録する','Register later')]]:[]),
      ['shutdown',t('電源を切る','Shut down')],
    ]);
    if(action==='shutdown') {
      if(await poweroff())return;
      failure=t('電源を切れませんでした。もう一度お試しください。','Could not shut down. Please retry.');
    } else if(action==='local'&&!storageError&&completeLocal){
      try{local=await completeLocal();failure=null;state='complete';}
      catch{failure=t('ローカル設定を保存できませんでした。再試行できます。','Could not save local setup. Please retry.');}
    } else if(action==='retry'&&!storageError)state='register';
    else if(action==='connect'&&!storageError){wantsLink=true;state='network';}
    else if(action==='network') {
      wantsLink=false;
      // An unreadable receipt must never start an automatic replacement claim.
      if(storageError){try{await network({registered:true});}catch{}state='complete';}
      else state='network';
    } else if(action==='later'||!action)state='complete';
  }
}
