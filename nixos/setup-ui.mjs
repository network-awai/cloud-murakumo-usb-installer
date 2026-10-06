import {dialogUI, setupNetwork, text} from '/etc/murakumo/network-setup.mjs';
import {link,savedLink} from '/etc/murakumo/account-link.mjs';
import {approvalScreen,registerWithUI,runSetup} from '/etc/murakumo/registration-ui.mjs';
import {spawnSync} from 'node:child_process';

const ui=dialogUI('installed');
await runSetup({
  ui,t:text,readSaved:savedLink,
  network:options=>setupNetwork({stage:'installed',ui,...options}),
  register:onFailure=>registerWithUI({link,screen:approvalScreen,ui,t:text,onFailure}),
  poweroff:()=>spawnSync('systemctl',['poweroff'],{stdio:'inherit'}).status===0,
});
