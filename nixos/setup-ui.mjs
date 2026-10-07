import {dialogUI, setupNetwork, text} from '/etc/murakumo/network-setup.mjs';
import {link,savedLink} from '/etc/murakumo/account-link.mjs';
import {approvalScreen,registerWithUI,runSetup} from '/etc/murakumo/registration-ui.mjs';
import {spawnSync} from 'node:child_process';

import {completeLocal,readLocal} from '/etc/murakumo/local-setup.mjs';
import {chooseLanguage} from '/etc/murakumo/language.mjs';
const ui=dialogUI('installed');
chooseLanguage(ui);
await runSetup({
  ui,t:text,readSaved:savedLink,readLocal,completeLocal,
  network:options=>setupNetwork({stage:'installed',ui,...options}),
  register:onFailure=>registerWithUI({link,screen:approvalScreen,ui,t:text,onFailure}),
  poweroff:()=>spawnSync('systemctl',['poweroff'],{stdio:'inherit'}).status===0,
});
