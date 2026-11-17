import test from "node:test";
import assert from "node:assert/strict";
import {initialData} from "../src/lib/portal-model";
import {seedPreview,previewWorkspace} from "../src/lib/v3-preview";
import {attendanceRoster,saveEventAttendance,employeeId,type AttendanceRow} from "../src/lib/event-attendance";
const setup=()=>{
 const data=seedPreview(structuredClone(initialData));
 const admin=data.users.find(u=>u.id==="manager")!,employee=data.users.find(u=>u.id==="employee")!;
 const event=data.events.find(e=>e.id==="event-5")!;
 event.startsAt="2020-01-01T09:00:00Z";event.endsAt="2020-01-01T12:00:00Z";
 data.registrations=data.registrations.filter(r=>r.eventId!==event.id);
 data.registrations.push({id:"attendance-test",eventId:event.id,userId:employee.id,status:"going",createdAt:"2019-12-01T00:00:00Z"});
 return {data,admin,employee,event};
};
test("manual attendance is separate from registration, and present records update employee impact",()=>{
 const {data,admin,employee,event}=setup();
 const initial=attendanceRoster(admin,data,event.id);
 assert.equal(initial.rows[0].status,"unmarked");
 const rows:AttendanceRow[]=[{userId:employee.id,status:"present",minutes:"30",contribution:"Event support"}];
 const saved=saveEventAttendance(admin,data,event.id,rows,[{employeeId:"WALK-001",phone:"+919876543210"}]);
 assert.equal(attendanceRoster(admin,saved,event.id).rows[0].status,"present");
 assert.equal(attendanceRoster(admin,saved,event.id).extras.length,1);
 assert.equal(previewWorkspace(employee,saved).contributions?.[0].volunteer_minutes,30);
 assert.equal(saved.registrations.length,data.registrations.length);
 const changed=saveEventAttendance(admin,saved,event.id,[{...rows[0],status:"absent"}],[]);
 assert.equal(attendanceRoster(admin,changed,event.id).rows[0].status,"absent");
 assert.equal(previewWorkspace(employee,changed).contributions?.length,0);
 assert.equal(attendanceRoster(admin,changed,event.id).extras.length,0);
});
test("reject duplicate or registered walk-ins and invalid phone numbers",()=>{
 const {data,admin,employee,event}=setup();
 const rows=attendanceRoster(admin,data,event.id).rows;
 const extra={employeeId:"WALK-001",phone:"9876543210"};
 assert.throws(()=>saveEventAttendance(admin,data,event.id,rows,[extra,extra]),/Duplicate/);
 assert.throws(()=>saveEventAttendance(admin,data,event.id,rows,[{...extra,employeeId:employeeId(employee)}]),/already registered/);
 assert.throws(()=>saveEventAttendance(admin,data,event.id,rows,[{...extra,phone:"12"}]),/phone/);
 assert.throws(()=>attendanceRoster(employee,data,event.id),/administrators/);
});
test("saving future or incomplete roster is blocked",()=>{
 const {data,admin,event}=setup();
 assert.throws(()=>saveEventAttendance(admin,data,event.id,[],[]),/Registration list changed/);
 event.startsAt="2099-01-01T09:00:00Z";
 assert.throws(()=>saveEventAttendance(admin,data,event.id,attendanceRoster(admin,data,event.id).rows,[]),/once the event starts/);
});
