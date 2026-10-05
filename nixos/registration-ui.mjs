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

export async function registerWithUI({link,screen,ui,t,options={}}){
  const controller=new AbortController();
  let close;
  try{
    return await link({...options,signal:controller.signal,display:()=>{},onFlow:async flow=>{close=await screen(flow,controller,t);}});
  }catch(e){
    if(controller.signal.aborted)return null;
    // Close the waiting dialog before opening the error dialog on the same TTY.
    await close?.();close=null;
    ui.message(registrationFailure(e,t));
    return null;
  }finally{await close?.();}
}
