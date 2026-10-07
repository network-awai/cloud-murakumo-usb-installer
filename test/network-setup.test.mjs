import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rows, networks, displayText, networkBackend, setupNetwork} from '../nixos/network-setup.mjs';

test('SSID delimiters and backslashes round trip; strongest duplicate wins', () => {
  assert.deepEqual(rows('home\\:lab:70:WPA2\nslash\\\\net:80:--'),[['home:lab','70','WPA2'],['slash\\net','80','--']]);
  assert.deepEqual(networks('home:20:WPA2\nhome:90:WPA2\n:99:WPA2\nopen:70:--').map(n => [n.ssid,n.signal]),[['home',90],['open',70]]);
  assert.ok(!displayText('bad\u001b[31m\n\\Z1').includes('\u001b'));
  assert.ok(!displayText('\\Z1').includes('\\'));
});
test('Wi-Fi secrets go to stdin, never command arguments; failures do not expose output', () => {
  let call;
  const backend = networkBackend((...args) => {call=args;return {status:10,stdout:'private',stderr:'private'};});
  assert.equal(backend.connectWifi('wlan0','home:lab','fixture-secret'),false);
  assert.ok(!call[1].join(' ').includes('fixture-secret'));
  assert.equal(call[2].input,'fixture-secret\n');
  assert.ok(call[1].includes('home:lab'));
});
function fixture(choices, devices = [], overrides = {}) {
  const messages=[];const calls=[];
  const ui={menu:(message,items)=>{messages.push(message);const next=choices.shift();assert.ok(next === null || items.some(i=>i[0] === next),`invalid choice ${next}`);return next;},
    message:m=>messages.push(m),busy:m=>messages.push(m),password:()=> 'fixture-secret',input:()=> 'hidden-home'};
  const backend={devices:()=>devices,scan:()=>[{ssid:'home',signal:80,security:'WPA2'}],
    connectWifi:(...args)=>{calls.push(args);return true;},connectWired:()=>true,probe:async()=>({internet:true,murakumo:true}),...overrides};
  return {ui,backend,messages,calls};
}
test('no NIC and Wi-Fi missing remain actionable and can finish installation offline',async()=>{
  const f=fixture(['wifi','later']);
  assert.equal(await setupNetwork(f),'offline');
  assert.ok(f.messages.some(m=>m.includes('No Wi-Fi adapter')));
});
test('a saved connection skips password entry and proceeds only after connection confirmation',async()=>{
  const f=fixture(['next'],[{name:'wlan0',type:'wifi',connected:true}]);
  assert.equal(await setupNetwork(f),'connected');assert.equal(f.calls.length,0);
});
test('Wi-Fi failure returns to method selection and a second attempt succeeds',async()=>{
  let attempts=0;
  const f=fixture(['wifi','0','wifi','0','next'],[{name:'wlan0',type:'wifi',connected:false}],{connectWifi:()=> ++attempts === 2});
  assert.equal(await setupNetwork(f),'connected');assert.equal(attempts,2);
});
test('LAN association without Internet must not be presented as ready for registration',async()=>{
  const f=fixture(['wired','later'],[{name:'eth0',type:'ethernet',connected:false}],{probe:async()=>({internet:false,murakumo:false})});
  assert.equal(await setupNetwork({...f,stage:'installed'}),'offline');
  assert.ok(f.messages.some(m=>m.includes('Internet: not confirmed')));
});
test('cancel Wi-Fi selection returns without connecting or erasing',async()=>{
  const f=fixture(['wifi',null,'later'],[{name:'wlan0',type:'wifi',connected:false}]);
  assert.equal(await setupNetwork(f),'offline');assert.equal(f.calls.length,0);
});
test('TLS/captive probe failure is not reported as successful connectivity',async()=>{
  const backend=networkBackend(()=>({status:0}),async()=>{throw Error('offline');});
  assert.deepEqual(await backend.probe(),{internet:false,murakumo:false});
});

test('saved connection that becomes ready at the chooser skips scanning and secrets',async()=>{
  let checks=0;
  const f=fixture(['wifi','next'],[],{devices:()=>[{name:'wlan0',type:'wifi',connected:++checks > 1}],scan:()=>{throw Error('must not scan');}});
  assert.equal(await setupNetwork(f),'connected');assert.equal(f.calls.length,0);
});

test('Bluetooth success closes its pairing window and checks Internet before proceeding',async()=>{
  const events=[];const f=fixture(['bluetooth','next'],[],{bluetoothAvailable:()=>true,bluetoothStart:()=>{events.push('start');return true;},bluetoothStop:()=>events.push('stop'),probe:async()=>{events.push('probe');return {internet:true,murakumo:true};}});
  f.ui.bluetooth=()=>{events.push('companion');return true;};
  assert.equal(await setupNetwork(f),'connected');assert.deepEqual(events,['start','companion','stop','probe']);
});
test('Bluetooth cancellation closes its pairing window and offers offline completion',async()=>{
  let stopped=false;const f=fixture(['bluetooth','later'],[],{bluetoothAvailable:()=>true,bluetoothStart:()=>true,bluetoothStop:()=>{stopped=true;},probe:()=>{throw Error('no connection');}});
  f.ui.bluetooth=()=>false;assert.equal(await setupNetwork(f),'offline');assert.equal(stopped,true);
});
