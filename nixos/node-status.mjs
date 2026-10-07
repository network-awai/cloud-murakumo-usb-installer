import {spawnSync} from 'node:child_process';
import {hostname,uptime,totalmem,freemem,loadavg,cpus} from 'node:os';
import {readFile} from 'node:fs/promises';
const services=['murakumo-account-link.service','murakumo-ble-controller.service','murakumo-ble-gatt.service','tailscaled.service','NetworkManager.service'];
const command=(name,args)=>{const r=spawnSync(name,args,{encoding:'utf8',timeout:3000,maxBuffer:16384});return r.status===0?r.stdout.trim():null;};
export async function collectStatus({run=command,read=readFile,host=hostname,up=uptime,memory=()=>({total:totalmem(),available:freemem()}),load=loadavg,cpu=cpus}={}) {
 const result={schema:'murakumo.node-status.v1',observedAt:new Date().toISOString(),host:host(),uptimeSeconds:Math.floor(up()),cpuCount:cpu().length,load:load(),memory:memory(),services:{},network:run('nmcli',['-t','-f','DEVICE,TYPE,STATE','device','status']),disk:run('df',['-h','/']),account:'pending',participation:'unverified'};
 for(const service of services)result.services[service]=run('systemctl',['show',service,'--property=ActiveState','--value'])||'unknown';
 try{const os=await read('/etc/os-release','utf8');result.os=os.match(/^PRETTY_NAME="?([^"\n]+)"?$/m)?.[1]||'unknown';}catch{result.os='unknown';}
 // Read only the registration receipt; never NetworkManager connection secrets.
 try{const receipt=JSON.parse(await read('/var/lib/murakumo/account-link.json','utf8'));if(typeof receipt.deviceDid==='string'&&typeof receipt.accountDid==='string')result.account='saved-unverified';}catch{}
 return result;
}
export function formatStatus(s,t=(ja,en)=>en){return [t('Nodeの詳細状態','Node details'),`${t('ホスト','Host')}: ${s.host}`,`${t('システム','System')}: ${s.os}`,`${t('取得時刻','Observed')}: ${s.observedAt}`,`${t('起動時間','Uptime')}: ${s.uptimeSeconds}s`,`CPU: ${s.cpuCount} · Load: ${s.load.map(x=>x.toFixed(2)).join(' / ')}`,`${t('メモリ','Memory')}: ${(s.memory.available/2**30).toFixed(1)} / ${(s.memory.total/2**30).toFixed(1)} GiB ${t('空き','available')}`,'',t('接続機器','Network interfaces'),s.network||t('取得できません','Unavailable'),'',t('ディスク使用量','Disk usage'),s.disk||t('取得できません','Unavailable'),'',...Object.entries(s.services).map(([name,state])=>`${name}: ${state}`),'',t('アカウント','Account')+': '+s.account,t('分散ジョブ・推論・報酬：未検証','Distributed jobs, inference and rewards: unverified')].join('\n');}
export async function showNodeStatus(ui,t,collect=collectStatus){for(;;){const s=await collect();const action=ui.menu(formatStatus(s,t),[['refresh',t('更新','Refresh')],['back',t('戻る','Back')]]);if(action!=='refresh')return;}}
