import test from "node:test";
import assert from "node:assert/strict";
import type {PortalData} from "../src/lib/portal-model";
import {peopleMetrics,stateMetrics} from "../src/lib/v3-dashboard";

const now=new Date(2026,10,24,12).getTime();
const start=new Date(2026,10,18,11).toISOString();
const data={
 users:[{id:"a",status:"active"},{id:"b",status:"suspended"}],
 events:[{id:"e1",status:"published",startsAt:start},{id:"draft",status:"draft",startsAt:start}],
 registrations:[{eventId:"e1",userId:"a",status:"going"},{eventId:"e1",userId:"a",status:"going"},{eventId:"e1",userId:"b",status:"cancelled"},{eventId:"draft",userId:"b",status:"going"}]
} as unknown as PortalData;
const members=[
 {user_id:"a",level:"employee",organization_id:"org",state_id:"bihar",branch_id:null,status:"active"},
 {user_id:"b",level:"employee",organization_id:"org",state_id:"gujarat",branch_id:"a",status:"suspended"}
];
test("monthly people KPIs count unique confirmed registrations, not attendance",()=>{
 const m=peopleMetrics(members,data,now);
 assert.equal(m.total,2);assert.equal(m.active,1);assert.equal(m.suspended,1);
 assert.equal(m.registeredThisMonth,1);assert.equal(m.notRegisteredThisMonth,1);
 assert.equal(m.eventCount,1);
});
test("state cards use only assigned members, not other state members",()=>{
 const states=stateMetrics([{id:"bihar",name:"Bihar"},{id:"gujarat",name:"Gujarat"}],[{id:"a",state_id:"gujarat"}],members,data,now);
 assert.deepEqual(states.map(x=>x.total),[1,1]);
 assert.deepEqual(states.map(x=>x.registeredThisMonth),[1,0]);
 assert.deepEqual(states.map(x=>x.branches),[0,1]);
});
