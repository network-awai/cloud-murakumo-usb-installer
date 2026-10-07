import test from 'node:test';
import assert from 'node:assert/strict';
import {runSetup,registerWithUI} from '../nixos/registration-ui.mjs';
const t=(_ja,en)=>en;
async function guide(actions,{readSaved=async()=>null,network=async()=> 'connected',register=async()=>null,poweroff=async()=>true}={}) {
  const screens=[],events=[];
  await runSetup({t,readSaved,
    ui:{busy:()=>{},menu:(message,items)=>{
      if(message.startsWith('Choose how to use'))return 'connect';
      screens.push(message);const action=actions.shift();assert.notEqual(action,undefined,'unexpected screen');
      if(action!==null)assert.ok(items.some(([key])=>key===action),`missing action ${action}`);return action;
    }},
    network:async options=>{events.push('network');return network(options);},
    register:async fail=>{events.push('register');return register(fail);},
    poweroff:async()=>{events.push('shutdown');return poweroff();}});
  assert.equal(actions.length,0);return {screens,events};
}
test('service unavailable offers retry directly, then defer without background claims',async()=>{
  const {screens,events}=await guide(['retry','later',null,'shutdown'],{register:async fail=>fail({code:'service'})});
  assert.deepEqual(events,['network','register','register','shutdown']);
  assert.match(screens[0],/OS: installed/);assert.match(screens[0],/service is unavailable/);
  assert.match(screens[2],/registration pending/);
});
test('offline install finishes on a page, connect resumes phone approval and shows owner',async()=>{
  let count=0;
  const {screens,events}=await guide(['connect','shutdown'],{
    network:async()=>++count===1?'offline':'connected',
    register:async()=>({accountDid:'did:key:owner',deviceDid:'did:key:node'})});
  assert.deepEqual(events,['network','network','register','shutdown']);
  assert.match(screens[0],/registration pending/);assert.match(screens[1],/verified during this boot/);
  assert.match(screens[1],/did:key:owner/);
});
test('phone cancellation returns to finished page without silently retrying',async()=>{
  const {events}=await guide(['shutdown']);assert.deepEqual(events,['network','register','shutdown']);
});
test('expired approval closes QR before showing retry options',async()=>{
  const order=[];
  await guide(['retry','shutdown'],{register:async fail=>registerWithUI({t,onFailure:fail,ui:{message:()=>assert.fail()},
    screen:async()=>async()=>order.push('close'),link:async({onFlow})=>{await onFlow({});throw Object.assign(Error(),{code:'expired'});}})});
  assert.deepEqual(order,['close','close']);
});
test('unreadable saved receipt blocks claims but still allows network settings and shutdown',async()=>{
  const {screens,events}=await guide(['network','shutdown'],{readSaved:async()=>{throw Error();},register:()=>assert.fail()});
  assert.deepEqual(events,['network','shutdown']);assert.match(screens[0],/registration information is preserved/);
});
test('network and unexpected registration errors stay in the guide; shutdown failure can retry',async()=>{
  let shutdowns=0,networks=0;
  const {screens}=await guide(['connect','retry','shutdown','shutdown'],{
    network:async()=>{if(!networks++)throw Error();return 'connected';},
    register:async()=>{throw Error('invalid registration flow');},
    poweroff:async()=>++shutdowns>1});
  assert.match(screens[0],/Could not check the network/);
  assert.match(screens[1],/Reinstallation is not needed/);
  assert.match(screens[3],/Could not shut down/);
});
