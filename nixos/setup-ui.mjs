import {dialogUI, setupNetwork, text} from '/etc/murakumo/network-setup.mjs';
import {link,savedLink} from '/etc/murakumo/account-link.mjs';
import {approvalScreen,registerWithUI} from '/etc/murakumo/registration-ui.mjs';
import {spawnSync} from 'node:child_process';

const ui = dialogUI('installed');
let verified=false;
for (;;) {
  let saved;
  try {saved=await savedLink();}catch{
    ui.message(text('保存済みの登録情報を確認できません。端末の保守が必要です。登録情報を自動で消すことはありません。','Saved registration could not be read. Device maintenance is needed.'));
  }
  if(saved){
    const action=ui.menu([
      text('OS：インストール完了','OS: installed'),
      text('アカウント：連携済み','Account: linked'),
      text(verified?'登録状態：今回の起動で確認済み':'登録状態：保存済み（オンライン確認前）',verified?'Registration: verified during this boot':'Registration: saved (online verification pending)'),
      `Account ID: ${saved.accountDid}`,`Device ID: ${saved.deviceDid}`,
      text('モデルと推論の稼働確認は別の手順です。','Model and inference readiness are verified separately.'),
    ].join('\n'),[['verify',text('オンラインで登録状態を確認する','Verify registration online')],['network',text('Wi-Fi / 有線の設定','Wi-Fi / Ethernet settings')],['shutdown',text('電源を切る','Shut down')]]);
    if(!action)continue;
    if(action==='shutdown'){spawnSync('systemctl',['poweroff'],{stdio:'inherit'});continue;}
  }
  const network = await setupNetwork({stage:'installed',ui,registered:!!saved});
  if (network === 'offline') {
    const action = ui.menu(text(saved?'インストールとアカウント連携の情報は保存されています。ネットにつながったら登録状態を確認できます。':'インストールは完了しています。アカウント連携はまだ完了していません。ネットにつながったら、ここから登録できます。',saved?'OS and account linking are saved. Connect to verify registration.':'OS installation is complete. Account linking is pending. Connect when ready.'),[
      ['connect',text(saved?'ネットに接続して状態を確認する':'ネットに接続して登録する',saved?'Connect and verify':'Connect and register')],['shutdown',text('電源を切る','Shut down')],
    ]);
    if (action === 'shutdown') spawnSync('systemctl',['poweroff'],{stdio:'inherit'});
    continue;
  }
  ui.busy(text(saved?'Murakumoの登録状態を確認しています…':'Murakumoへの連携を準備しています…',saved?'Verifying registration…':'Preparing account linking…'));
  const result=await registerWithUI({link,screen:approvalScreen,ui,t:text});
  verified=!!result;
  if(result)ui.message(text('Murakumoアカウントとの連携を確認しました。次の画面で連携先と端末IDを確認できます。','Murakumo account linking verified. Review the account and Device ID on the next screen.'));
}
