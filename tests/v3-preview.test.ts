import test from "node:test";
import assert from "node:assert/strict";
import {initialData} from "../src/lib/portal-model";
import {seedPreview,previewAction,previewWorkspace,previewActor} from "../src/lib/v3-preview";
const hash=async(p:string)=>"test-hash:"+p;
test("browser seed creates four demo roles and is idempotent",()=>{
 const d=seedPreview(structuredClone(initialData));
 assert.equal(seedPreview(d),d);
 for(const [id,level] of [["platform","root"],["manager","country_admin"],["demo-state-admin","state_admin"],["employee","employee"]]){
  assert.equal(previewActor(d.users.find(u=>u.id===id)!,d).level,level);
 }
});
test("state admin cannot access another company or create admins",async()=>{
 const d=seedPreview(structuredClone(initialData)),u=d.users.find(u=>u.id==="demo-state-admin")!;
 await assert.rejects(previewAction(u,d,{action:"country",organization_id:"contoso",country_code:"IN",name:"India"},hash));
 await assert.rejects(previewAction(u,d,{action:"provision",level:"state_admin",organization_id:"northwind",country_code:"IN",state_id:"northwind-gj",name:"Test",email:"test@northwind.example"},hash));
});
test("provisioning employee sets expiration, scope and hashed credentials",async()=>{
 const d=seedPreview(structuredClone(initialData)),u=d.users.find(u=>u.id==="demo-state-admin")!;
 const result=await previewAction(u,d,{action:"provision",level:"employee",organization_id:"northwind",country_code:"IN",state_id:"northwind-gj",branch_id:"northwind-ahm",name:"Demo New",email:"new@northwind.example"},hash);
 const person=result.data.users.find(x=>x.email==="new@northwind.example")!;
 assert.equal(person.mustChangePassword,true);assert.ok(person.id.startsWith("EMP-"));assert.equal(person.password,"test-hash:"+result.credentials?.temporaryPassword);assert.ok(Date.parse(person.temporaryPasswordExpiresAt!)>Date.now());
 assert.equal(d.users.some(x=>x.id===person.id),false);
});
test("attendance is only counted after verification",async()=>{
 const d=seedPreview(structuredClone(initialData)),admin=d.users.find(u=>u.id==="demo-state-admin")!,employee=d.users.find(u=>u.id==="employee")!;
 d.events=d.events.map(e=>e.id==="event-5"?{...e,endsAt:"2020-01-01T00:00:00Z"}:e);
 assert.equal(previewWorkspace(employee,d).contributions?.length,0);
 const r=await previewAction(admin,d,{action:"verify",organization_id:"northwind",country_code:"IN",state_id:"northwind-gj",event_id:"event-5",user_id:"employee",volunteer_minutes:60,contribution:"Orientation"},hash);
 assert.equal(previewWorkspace(employee,r.data).contributions?.length,1);
});
