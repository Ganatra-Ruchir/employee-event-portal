import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createDemoData} from "../src/lib/demo-data";
import {employeeImpact,eventGoal} from "../src/lib/employee-impact";
import {previewWorkspace} from "../src/lib/v3-preview";
const now=Date.parse("2026-11-17T10:00:00Z");
test("employee charts use verified records, not RSVP counts",()=>{
 const d=createDemoData(now),u=d.users.find(p=>p.email==="employee@elixir.example")!,verified=previewWorkspace(u,d).contributions||[];
 const result=employeeImpact(d,u.id,u.companyId,verified,now);
 assert.equal(result.attended,verified.length);
 assert.equal(result.goals.reduce((s,g)=>s+g.count,0)+result.unassigned,result.attended);
 assert.equal(result.goals.length,17);
 assert.equal(result.monthly.length,6);
 assert.ok(result.monthly.some(m=>m.hours>0));
 assert.ok(result.goals.filter(g=>g.count>0).length>2);
 assert.equal(employeeImpact(d,u.id,u.companyId,[...verified,...verified],now).attended,result.attended);
 assert.equal(employeeImpact(d,u.id,u.companyId,[],now).goals.reduce((s,g)=>s+g.count,0),0);
});
test("explicit SDG overrides demo fallback and ordinary events stay unassigned",()=>{
 const e=createDemoData(now).events[0];
 assert.equal(eventGoal({...e,primarySdg:4}),4);
 assert.equal(eventGoal({...e,primarySdg:0}),null);
 assert.equal(eventGoal({...e,id:"user-created",primarySdg:undefined}),null);
});
test("employee dashboard follows KPI then analytics then details order",()=>{
 const c=readFileSync(new URL("../src/components/v3-workspace.tsx",import.meta.url),"utf8");
 const k=c.indexOf("Verified events attended"),charts=c.indexOf("<ImpactCharts"),events=c.indexOf("My next registered events"),history=c.indexOf("My verified contributions");
 assert.ok(k>=0&&k<charts&&charts<events&&events<history);
});
