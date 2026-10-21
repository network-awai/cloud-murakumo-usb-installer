import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const out='/mnt/output', expected=JSON.parse(fs.readFileSync(`${out}/voice-installed-expected.json`));
const sourceHashes={};
for(const name of Object.keys(expected))sourceHashes[name]=crypto.createHash('sha256').update(fs.readFileSync(`/etc/nixos/${name}`)).digest('hex');
const permissions=[];
function record(path){const s=fs.statSync(path);permissions.push({name:path.split('/').pop(),mode:(s.mode&0o777).toString(8),uid:s.uid,gid:s.gid,directory:s.isDirectory()});}
record('/run/murakumo-voice');
for(const name of fs.readdirSync('/run/murakumo-voice')){const path=`/run/murakumo-voice/${name}`;record(path);if(fs.statSync(path).isDirectory())for(const file of fs.readdirSync(path))record(`${path}/${file}`);}
const proof={runtimeSource:'481cd28',bootId:fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim(),system:fs.realpathSync('/run/current-system'),rootSource:execFileSync('findmnt',['-n','-o','SOURCE','/'],{encoding:'utf8'}).trim(),interfaces:Object.keys(os.networkInterfaces()),language:fs.readFileSync('/var/lib/murakumo/ui-language','utf8').trim(),sourceHashes,retainedSourcesMatch:Object.entries(expected).every(([n,h])=>sourceHashes[n]===h),permissions,service:execFileSync('systemctl',['show','murakumo-account-link','-p','ActiveState','-p','SubState','-p','ProtectSystem','-p','NoNewPrivileges'],{encoding:'utf8'}).trim(),physicalMicrophone:false,realPasskey:false,publicAccountReceiptExists:fs.existsSync('/var/lib/murakumo/account-link.json')};
proof.voiceRuntimePermissionsMatch=permissions.some(x=>x.name==='murakumo-voice'&&x.mode==='711'&&x.uid===0)&&permissions.some(x=>x.name.startsWith('session.')&&x.directory&&x.mode==='700'&&x.uid!==0)&&permissions.some(x=>x.name==='llm-key'&&x.mode==='600'&&x.uid!==0);
proof.localModelHealth=(await fetch('http://127.0.0.1:18086/health',{signal:AbortSignal.timeout(5000)})).status;
proof.localSetupExists=fs.existsSync('/var/lib/murakumo/local-setup.json');
proof.physicalNetworkInterfaces=fs.readdirSync('/sys/class/net').filter(name=>fs.existsSync(`/sys/class/net/${name}/device`));
proof.defaultRoutes=[...JSON.parse(execFileSync('ip',['-j','route','show','default'],{encoding:'utf8'})),...JSON.parse(execFileSync('ip',['-6','-j','route','show','default'],{encoding:'utf8'}))];
fs.writeFileSync(`${out}/voice-installed-proof.json`,JSON.stringify(proof,null,2)+'\n');
if(!proof.retainedSourcesMatch||!proof.voiceRuntimePermissionsMatch||proof.localModelHealth!==200||proof.physicalNetworkInterfaces.length||proof.defaultRoutes.length||!proof.localSetupExists||proof.language!=='ja'||!proof.rootSource.includes('nvme0n1p2')||!proof.service.includes('ProtectSystem=strict')||!proof.service.includes('NoNewPrivileges=yes'))throw Error('Installed proof did not match');
console.log('VOICE_INSTALLED_SOURCE_AND_OFFLINE_BOOT_PASS');
