import {dialogUI, setupNetwork, text} from '/etc/murakumo/network-setup.mjs';
import {link} from '/etc/murakumo/account-link.mjs';
import {spawnSync} from 'node:child_process';

const ui = dialogUI('installed');
for (;;) {
  const network = await setupNetwork({stage:'installed',ui});
  if (network === 'offline') {
    const action = ui.menu(text('インストールは完了しています。登録はまだ完了していません。ネットにつながったら、ここから登録できます。','OS installation is complete. Account registration is pending. Connect when ready.'),[
      ['connect',text('ネットに接続して登録する','Connect and register')],['shutdown',text('電源を切る','Shut down')],
    ]);
    if (action === 'shutdown') spawnSync('systemctl',['poweroff'],{stdio:'inherit'});
    continue;
  }
  try {
    console.clear();
    console.log(text('スマートフォンでQRを読み取り、端末IDを確認して承認してください。','Scan the QR on your phone, check the Device ID, and approve.'));
    await link();
    ui.message(text('Murakumoへのアカウント登録が完了しました。モデルの設定と推論の確認は別の手順です。','Murakumo account registration is complete. Model setup and inference verification are separate.'));
    ui.menu(text('この端末は登録済みです。','This device is registered.'),[['settings',text('ネット設定を確認する','Network settings')],['status',text('登録状態を確認する','Check registration status')]]);
  } catch {
    ui.message(text('Murakumoへの登録を完了できませんでした。ネットの状態、登録サービスの準備状況、または承認の有効期限を確認してください。OSの再インストールは不要です。','Registration could not complete. Check connectivity, registration service availability, or approval expiry. Reinstallation is not needed.'));
  }
}
