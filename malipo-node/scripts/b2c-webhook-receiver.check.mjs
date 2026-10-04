import test from 'node:test';import assert from 'node:assert/strict';
import{mkdtemp,rm}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import{createHmac}from'node:crypto';
import Malipo from '../dist/index.js';import{createReceiver}from'./b2c-webhook-receiver.mjs';
const secret='synthetic-webhook-signing-secret';const key='synthetic-sandbox-key-id';
const client=new Malipo({apiKey:'sk_test_synthetic'});
function envelope(id='evt_test',status='succeeded'){return{id,environment:'sandbox',type:'payout.'+status,data:{object:{id:'synthetic-disbursement',environment:'sandbox',payout_kind:'b2c',api_key_id:key,reference:'synthetic-ref',amount:'20.00',currency:'USD',status}}};}
function signed(event,timestamp=new Date().toISOString()){const raw=JSON.stringify(event);return{raw,headers:{'x-webhook-timestamp':timestamp,'x-webhook-signature':createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex')}};}
async function setup(reconcile=async()=>envelope().data.object){const folder=await mkdtemp(join(tmpdir(),'malipo-receiver-'));const database=join(folder,'receipt.sqlite');const args={database,secret,apiKeyId:key,verifyEvent:client.webhooks.constructEvent,reconcile};const receiver=createReceiver(args);return{folder,args,receiver,cleanup:async()=>{await receiver.close();await rm(folder,{recursive:true,force:true});}};}
test('receiver requires timestamp and rejects bad raw bytes, signatures and stale captures without recording an effect',async()=>{
 const t=await setup();try{
  const x=signed(envelope());assert.equal((await t.receiver.consume(x.raw,{})).status,400);
  assert.equal((await t.receiver.consume(x.raw+' ',x.headers)).status,401);
  assert.equal((await t.receiver.consume(x.raw,{...x.headers,'x-webhook-signature':'bad'})).status,401);
  const old=signed(envelope(),new Date(Date.now()-600_000).toISOString());assert.equal((await t.receiver.consume(old.raw,old.headers)).status,401);
  assert.equal((await t.receiver.consume('x'.repeat(65_537),x.headers)).status,413);
  assert.equal(t.receiver.stats().effects.length,0);
 }finally{await t.cleanup();}
});
test('receiver verifies exact formatted bytes and deduplicates concurrent deliveries atomically',async()=>{
 const t=await setup();try{
  const raw=JSON.stringify(envelope(),null,2),timestamp=new Date().toISOString();const headers={'x-webhook-timestamp':timestamp,'x-webhook-signature':createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex')};
  const results=await Promise.all(Array.from({length:8},()=>t.receiver.consume(raw,headers)));
  assert.ok(results.every(r=>r.status===200));assert.equal(t.receiver.stats().events.length,1);assert.equal(t.receiver.stats().effects.length,1);assert.equal(t.receiver.stats().attempts.filter(a=>a.duplicate).length,7);
 }finally{await t.cleanup();}
});
test('receiver rejects a reused event id with a different signed payload',async()=>{
 const t=await setup();try{let x=signed(envelope());assert.equal((await t.receiver.consume(x.raw,x.headers)).status,200);x=signed(envelope('evt_test','pending'));assert.equal((await t.receiver.consume(x.raw,x.headers)).status,409);assert.equal(t.receiver.stats().effects.length,1);}finally{await t.cleanup();}
});
test('receiver reconciles old events to terminal API state and never applies the terminal effect twice',async()=>{
 const t=await setup();try{
  for(const[id,status]of[['evt_final','succeeded'],['evt_old','pending'],['evt_older','processing']]){const x=signed(envelope(id,status));assert.equal((await t.receiver.consume(x.raw,x.headers)).status,200);}
  const state=t.receiver.stats();assert.equal(state.effects.length,1);assert.equal(state.states[0].status,'succeeded');assert.equal(state.attempts.filter(a=>a.ignored_old).length,2);
 }finally{await t.cleanup();}
});
test('receiver retains deduplication across process restart and refuses conflicting canonical terminal status',async()=>{
 const t=await setup();let second;try{
  const x=signed(envelope());assert.equal((await t.receiver.consume(x.raw,x.headers)).status,200);await t.receiver.close();
  second=createReceiver({...t.args,reconcile:async()=>envelope('evt_new','failed').data.object});
  assert.equal((await second.consume(x.raw,x.headers)).status,200);
  const y=signed(envelope('evt_new','failed'));assert.equal((await second.consume(y.raw,y.headers)).status,409);assert.equal(second.stats().effects.length,1);assert.equal(second.stats().states[0].status,'succeeded');
 }finally{if(second)await second.close();await rm(t.folder,{recursive:true,force:true});}
});
test('receiver refuses another key, live environment and unavailable reconciliation',async()=>{
 const t=await setup(async()=>{throw Error('unavailable');});try{
  for(const change of[{api_key_id:'other'},{environment:'live'},{payout_kind:'merchant'}]){const e=envelope();Object.assign(e.data.object,change);const x=signed(e);assert.equal((await t.receiver.consume(x.raw,x.headers)).status,403);}
  const x=signed(envelope());assert.equal((await t.receiver.consume(x.raw,x.headers)).status,503);assert.equal(t.receiver.stats().effects.length,0);
 }finally{await t.cleanup();}
});
test('receiver HTTP surface publishes no receipts and accepts only verified webhook POSTs',async()=>{
 const t=await setup();try{
  await new Promise(resolve=>t.receiver.server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+t.receiver.server.address().port;
  assert.equal((await fetch(url+'/health')).status,200);assert.equal((await fetch(url+'/receipts')).status,404);assert.equal((await fetch(url+'/webhook')).status,404);
  const x=signed(envelope());assert.equal((await fetch(url+'/webhook',{method:'POST',headers:x.headers,body:x.raw})).status,200);assert.equal(t.receiver.stats().effects.length,1);
 }finally{await t.cleanup();}
});
