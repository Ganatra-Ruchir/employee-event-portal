import test from "node:test";
import assert from "node:assert/strict";
import {fetchV3Workspace,invalidateV3Workspace} from "../src/lib/v3-client-cache";

test("concurrent V3 components share one request and reuse the short cache",async()=>{
 const previous=globalThis.fetch;
 let calls=0;
 globalThis.fetch=(async()=>{
  calls++;
  await Promise.resolve();
  return {ok:true,json:async()=>({level:"state_admin",members:[{user_id:"qa"}]})} as Response;
 }) as typeof fetch;
 try{
  invalidateV3Workspace();
  const [a,b,c]=await Promise.all([fetchV3Workspace(),fetchV3Workspace(),fetchV3Workspace()]);
  assert.equal(calls,1);
  assert.deepEqual(a,b);
  assert.deepEqual(b,c);
  await fetchV3Workspace();
  assert.equal(calls,1,"moving between tabs should not refetch immediately");
  invalidateV3Workspace();
  await fetchV3Workspace();
  assert.equal(calls,2,"a mutation or logout must discard cached data");
 }finally{invalidateV3Workspace();globalThis.fetch=previous;}
});
test("failed V3 requests are never cached",async()=>{
 const previous=globalThis.fetch;
 let calls=0;
 globalThis.fetch=(async()=>{
  calls++;
  return calls===1?{ok:false,status:503,json:async()=>({error:"Unavailable"})} as Response:{ok:true,json:async()=>({level:"employee"})} as Response;
 }) as typeof fetch;
 try{
  invalidateV3Workspace();
  await assert.rejects(fetchV3Workspace(),/Unavailable/);
  assert.deepEqual(await fetchV3Workspace(),{level:"employee"});
  assert.equal(calls,2);
 }finally{invalidateV3Workspace();globalThis.fetch=previous;}
});
