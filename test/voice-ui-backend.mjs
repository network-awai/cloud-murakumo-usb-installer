import {connect} from 'node:net';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
async function dialog(args){return new Promise((resolve,reject)=>{let data='';const c=connect(process.env.MURAKUMO_UI_SOCKET);c.on('connect',()=>c.write(JSON.stringify({args})+'\n'));c.on('error',reject);c.on('data',b=>{data+=b;if(data.includes('\n')){c.end();resolve(JSON.parse(data.split('\n')[0]));}});});}
assert.equal((await dialog(['--menu','接続方法を選ぶ','20','80','10','wifi','Wi-Fi','offline','オフライン'])).value,'wifi');
assert.equal((await dialog(['--passwordbox','Wi-Fiパスワード','10','80'])).value,'a7');
assert.equal((await dialog(['--inputbox','製造番号：QA1234\nType exactly: ERASE /dev/vda','10','80'])).value,'ERASE /dev/vda');
assert.equal((await dialog(['--msgbox','Fixture setup completed. No disk was erased.','10','80'])).status,0);
await writeFile('/mnt/output/voice-ui-result.json',JSON.stringify({nativeGTK:true,language:'ja',networkChoice:'wifi',secretPassed:true,serialBoundConfirmation:true,continue:true,actualDiskErased:false},null,2));
