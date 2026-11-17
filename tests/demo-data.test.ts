import test from "node:test";
import assert from "node:assert/strict";
import {createDemoData} from "../src/lib/demo-data";
import {previewActor,previewWorkspace} from "../src/lib/v3-preview";
import {attendanceRoster} from "../src/lib/event-attendance";
const d=createDemoData(Date.parse("2026-11-17T10:00:00Z"));
test("three complete demo companies and valid relationships",()=>{
 assert.equal(d.companies.length,3);assert.equal(d.users.length,193);assert.equal(d.events.length,72);assert.equal(d.v3!.branches.length,18);assert.equal(d.v3!.states.length,9);
 assert.equal(d.v3!.members.filter(m=>m.level==="employee").length,180);
 assert.equal(d.registrations.length,1932);assert.equal(d.v3!.attendanceMarks!.length,1062);assert.equal(d.v3!.walkIns!.length,78);assert.equal(d.v3!.contributions.length,936);
 assert.equal(new Set(d.users.map(u=>u.id)).size,d.users.length);
 assert.equal(new Set(d.registrations.map(r=>r.eventId+":"+r.userId)).size,d.registrations.length);
 for(const r of d.registrations){const e=d.events.find(e=>e.id===r.eventId)!;const u=d.users.find(u=>u.id===r.userId)!;assert.equal(e.companyId,u.companyId);}
 for(const e of d.events)assert.ok(d.registrations.filter(r=>r.eventId===e.id&&r.status==="going").length<=e.capacity);
});
test("all company demo roles have usable impact and attendance fixtures",()=>{
 for(const org of d.companies){
  const employee=d.users.find(u=>u.email==="employee@"+org.id+".example")!,admin=d.users.find(u=>u.email==="country@"+org.id+".example")!,state=d.users.find(u=>u.email==="state@"+org.id+".example")!;
  assert.equal(previewActor(admin,d).level,"country_admin");assert.equal(previewActor(state,d).level,"state_admin");assert.equal(previewActor(employee,d).level,"employee");
  assert.ok((previewWorkspace(employee,d).contributions?.length||0)>=12);
  const roster=attendanceRoster(admin,d,org.id+"-event-1");assert.equal(roster.rows.length,24);assert.equal(roster.extras.length,2);assert.ok(roster.rows.some(r=>r.status==="present"));assert.ok(roster.rows.some(r=>r.status==="absent"));
  assert.ok(attendanceRoster(state,d,org.id+"-event-1").rows.length<roster.rows.length);
 }
});
