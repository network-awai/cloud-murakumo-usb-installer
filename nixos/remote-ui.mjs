import {control} from './remote-access.mjs';import {spawnSync} from 'node:child_process';
export async function showRemote(ui,t,request=control,addresses=()=>spawnSync('hostname',['-I'],{encoding:'utf8'}).stdout.trim().split(/\s+/).filter(x=>/^\d+\.\d+\.\d+\.\d+$/.test(x))){
 try{
 await request({action:'open'});
 for(;;){const info=await request({action:'info'}),ips=addresses();const message=[t('別のPCから設定する','Set up from another computer'),...ips.map(ip=>'https://'+ip+':8443/'),info.window?t('接続コード：','Connection code: ')+info.window.code:t('コード受付終了（承認待ち・接続中・期限切れ）','Code window closed (pending, connected or expired)'),t('同じLANのPCでURLを開き、証明書のSHA256指紋をこの画面と照合してから8桁コードを入力してください。','Open the URL on a computer on the same LAN. Compare its certificate SHA256 fingerprint with this screen before entering the 8-digit code.'),info.certificate,t('コードは5分・最大5回。接続は10分。アカウント登録は不要です。','Code: 5 minutes, 5 attempts. Session: 10 minutes. No account required.'),...(info.pending?[t('接続を要求しています：','Connection requested: ')+info.pending.name+' / '+info.pending.address]:[]),...(info.session?[t('接続中：','Connected: ')+info.session.name]:[]),...(info.ssh?[t('SSH管理権限の申請：','Administrative SSH key request: ')+info.ssh.fingerprint,t('承認すると、この鍵の所有者はsudoで本体を管理できます。','Approval grants the key holder administrative sudo access.')]:[])].join('\n');
 const items=[...(info.pending?[['approve',t('このPCを承認する','Approve this computer')]]:[]),...(info.ssh?[['ssh',t('このSSH鍵を承認する','Approve this SSH key')]]:[]),['refresh',t('接続状況を更新','Refresh connection status')],['new',t('コードを再発行（現在の接続を終了）','New code (end current session)')],['revoke',t('SSH鍵を削除・新規SSH接続を停止','Remove SSH key and stop new SSH connections')],['back',t('接続受付を終了して戻る','End session and go back')]];
 const action=ui.menu(message,items);if(!action||action==='back')break;
 if(action==='approve')await request({action:'approve'});
 else if(action==='ssh'){if(ui.menu(t('SSHの管理権限を許可しますか？\n','Allow administrative SSH access?\n')+info.ssh.fingerprint,[['yes',t('許可する','Allow')],['no',t('戻る','Back')]])==='yes'){await request({action:'approve-ssh',fingerprint:info.ssh.fingerprint});ui.message(t('SSHを有効にしました。ユーザー：murakumo-admin。削除するまで鍵を保持します。','SSH enabled. User: murakumo-admin. The key remains until revoked.')+'\n'+ips.map(ip=>'ssh murakumo-admin@'+ip).join('\n'));}}
 else if(action==='new')await request({action:'open'});
 else if(action==='revoke'){if(ui.menu(t('保存済みSSH鍵を削除しますか？既存SSHセッションの強制終了は行いません。','Remove the saved SSH key? Existing SSH sessions are not forcibly terminated.'),[['yes',t('削除する','Remove')],['no',t('戻る','Back')]])==='yes')await request({action:'revoke-ssh'});}
 }
 }catch{ui.message(t('遠隔管理サービスを利用できません。本体の画面で続けられます。','Remote management unavailable. Continue using this screen.'));}
 finally{await request({action:'close'}).catch(()=>{});}
}
