import test, {after} from 'node:test';
import {generateKeyPairSync} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,stat,writeFile,chmod,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {identity,link,savedLink,validateReceipt,didFromPublicKey} from '../nixos/account-link.mjs';
const flow={flowId:'f'.repeat(43),userCode:'ABCD123456',expiresIn:300,verificationUriComplete:'https://murakumo.cloud/portal/#device-link?code=ABCD123456'};
const directories=[];
const dir=async()=>{const value=await mkdtemp(join(tmpdir(),'murakumo-account-test-'));directories.push(value);return value;};
after(async()=>{await Promise.all(directories.map(d=>rm(d,{recursive:true,force:true})));});
function receipt(body){return {registered:true,flowId:flow.flowId,deviceDid:body.deviceDid,challenge:body.challenge,model:body.model,accountDid:'did:key:account',principalId:'test-principal'};}
test('key survives restart and private files are 0600',async()=>{const d=await dir();assert.equal((await identity(d)).did,(await identity(d)).did);assert.equal((await stat(join(d,'account-device.json'))).mode&0o777,0o600);});
test('approval persists public receipt only and repeated boot does not enroll again',async()=>{const d=await dir();let start;const fetcher=async(url,opts)=>{const b=JSON.parse(opts.body);if(url.endsWith('/start')){start=b;return new Response(JSON.stringify(flow),{status:201});}return new Response(JSON.stringify(receipt(start)));};await link({dir:d,fetcher,display:()=>{}});const saved=await readFile(join(d,'account-link.json'),'utf8');assert(!saved.includes(start.pollToken));assert(!saved.includes('PRIVATE KEY'));assert.equal(JSON.parse(saved).registrationState,'registered');await link({dir:d,fetcher:async()=>new Response(JSON.stringify({registered:true,deviceDid:JSON.parse(saved).deviceDid,accountDid:'did:key:account'})),display:()=>{}});});
test('wrong device, challenge, model or unregistered receipt never persists',async()=>{const id=await identity(await dir());const b={deviceDid:id.did,challenge:'challenge',model:'Murakumo-NixOS',deviceSigningPublicKey:id.signingPublicKey,deviceEncryptionPublicKey:id.encryptionPublicKey};const good=receipt(b);validateReceipt(good,flow,id,b.challenge,b.model);for(const [k,v] of Object.entries({deviceDid:'did:key:other',challenge:'other',model:'other',registered:false,flowId:'other'}))assert.throws(()=>validateReceipt({...good,[k]:v},flow,id,b.challenge,b.model));});
test('disconnect retries within deadline; expired approval never succeeds',async()=>{const d=await dir();let clock=0,requests=0;await assert.rejects(link({dir:d,now:()=>clock,pause:async()=>{clock+=150000;},display:()=>{},fetcher:async(url)=>{requests++;if(url.endsWith('/start'))return new Response(JSON.stringify(flow),{status:201});throw Error('offline');}}),/Approval expired/);assert.equal(requests,3);await assert.rejects(readFile(join(d,'account-link.json')),/ENOENT/);});


test('an existing factory signing identity is preserved without the factory daemon',async()=>{
  const d=await dir(),pair=generateKeyPairSync('ed25519'),did=didFromPublicKey(pair.publicKey);
  await writeFile(join(d,'device-identity.json'),JSON.stringify({version:1,did,privateKeyPem:pair.privateKey.export({type:'pkcs8',format:'pem'})}),{mode:0o600});
  assert.equal((await identity(d)).did,did);
});
test('a device key with group or world permissions is refused',async()=>{
  const d=await dir();await identity(d);await chmod(join(d,'account-device.json'),0o644);
  await assert.rejects(identity(d),/permissions/);
});
test('deferred approval never saves even if approval arrives during cancellation',async()=>{
  const d=await dir(),controller=new AbortController();let start;
  await assert.rejects(link({dir:d,signal:controller.signal,onFlow:()=>{},display:()=>{},fetcher:async(url,opts)=>{
    if(url.endsWith('/start')){start=JSON.parse(opts.body);return new Response(JSON.stringify(flow),{status:201});}
    controller.abort(new DOMException('Deferred','AbortError'));return new Response(JSON.stringify(receipt(start)));
  }}),{name:'AbortError'});
  assert.equal(await savedLink(d),null);
});
test('unpublished registration service is distinct from an approval refusal',async()=>{
  const d=await dir();await assert.rejects(link({dir:d,display:()=>{},fetcher:async()=>new Response('{"error":"unknown devices route"}',{status:404})}),{code:'service'});
  assert.equal(await savedLink(d),null);
});
