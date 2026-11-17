import type {Person,PortalData} from "./portal-model";
import {eventAccess} from "./portal-model";
import {previewActor,seedPreview,type PreviewData} from "./v3-preview";
import {canManageScope} from "./v3-permissions";
export type AttendanceStatus="present"|"absent"|"unmarked";
export type AttendanceMark={eventId:string;userId:string;status:Exclude<AttendanceStatus,"unmarked">;updatedBy:string;updatedAt:string};
export type WalkIn={eventId:string;employeeId:string;phone:string;userId:string|null;organizationId:string;countryCode:string;stateId:string|null;updatedBy:string;updatedAt:string};
export type AttendanceRow={userId:string;status:AttendanceStatus;minutes:string;contribution:string};
export type WalkInInput={employeeId:string;phone:string};
export const employeeId=(person:Person)=>person.employeeNumber||(person.id.startsWith("EMP-")?person.id:"EMP-"+person.id.slice(0,8).toUpperCase());
const normalize=(id:string)=>id.trim().toUpperCase();
const phoneValid=(phone:string)=>/^\+?[0-9][0-9 ()-]{5,24}$/.test(phone)&&phone.replace(/\D/g,"").length>=7&&phone.replace(/\D/g,"").length<=15;
const findPerson=(data:PortalData,id:string)=>data.users.find(p=>[p.id,employeeId(p),p.employeeNumber||""].some(x=>normalize(x)===normalize(id)));
function context(user:Person,input:PreviewData){
 const data=seedPreview(input),actor=previewActor(user,data);
 if(!actor.scope||!["country_admin","state_admin"].includes(actor.level))throw Error("Attendance is available to country and state administrators only.");
 return {data,actor,v:data.v3!,scope:actor.scope};
}
export function attendanceEvents(user:Person,input:PreviewData){
 const {data}=context(user,input);
 return data.events.filter(e=>e.status==="published"&&eventAccess(user,e,data)).sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt));
}
export function attendanceRoster(user:Person,input:PreviewData,eventId:string){
 const {data,actor,v,scope}=context(user,input);
 const event=data.events.find(e=>e.id===eventId&&e.status==="published"&&eventAccess(user,e,data));
 if(!event)throw Error("Event is not available.");
 const people=data.users.filter(p=>p.companyId===event.companyId&&v.members.some(m=>m.user_id===p.id&&m.level==="employee"&&canManageScope(actor,m)));
 const registered=people.filter(p=>data.registrations.some(r=>r.eventId===eventId&&r.userId===p.id&&r.status==="going"));
 const rows=registered.map(p=>{
  const mark=v.attendanceMarks?.find(x=>x.eventId===eventId&&x.userId===p.id);
  const contribution=v.contributions.find(x=>x.event_id===eventId&&x.user_id===p.id);
  return {person:p,userId:p.id,status:mark?.status||(contribution?"present":"unmarked"),minutes:contribution?String(contribution.volunteer_minutes??""):"",contribution:String(contribution?.contribution??"")} as AttendanceRow&{person:Person};
 });
 const extras=(v.walkIns||[]).filter(x=>x.eventId===eventId&&x.organizationId===scope.organization_id&&x.countryCode===scope.country_code&&(actor.level==="country_admin"||x.stateId===scope.state_id));
 return {event,rows,extras};
}
export function saveEventAttendance(user:Person,input:PreviewData,eventId:string,rows:AttendanceRow[],extras:WalkInInput[],now=Date.now()):PreviewData{
 const {data:seeded,actor,scope}=context(user,input);
 const data=structuredClone(seeded),v=data.v3!;
 const roster=attendanceRoster(user,data,eventId);
 if(Date.parse(roster.event.startsAt)>now)throw Error("Attendance can be recorded once the event starts.");
 const validIds=new Set(roster.rows.map(x=>x.userId));
 if(rows.length!==validIds.size||new Set(rows.map(x=>x.userId)).size!==rows.length||rows.some(x=>!validIds.has(x.userId)))throw Error("Registration list changed. Reopen the event before saving.");
 const existingOther=(v.walkIns||[]).filter(x=>x.eventId!==eventId||!roster.extras.some(y=>y.employeeId===x.employeeId&&y.eventId===x.eventId&&y.countryCode===x.countryCode));
 const registeredIds=new Set(data.registrations.filter(r=>r.eventId===eventId&&r.status==="going").map(r=>r.userId));
 const taken=new Set(existingOther.filter(x=>x.eventId===eventId).map(x=>normalize(x.employeeId)));
 const extraPeople=new Set(existingOther.filter(x=>x.eventId===eventId&&x.userId).map(x=>x.userId));
 const stamp=new Date(now).toISOString();
 const newExtras:WalkIn[]=extras.map(item=>{
  const id=normalize(item.employeeId),phone=item.phone.trim();
  if(!/^[A-Z0-9][A-Z0-9_.\/-]{0,79}$/.test(id)||!phoneValid(phone))throw Error("Each extra attendee needs a valid employee ID and phone number (7–15 digits).");
  const p=findPerson(data,id),m=p?v.members.find(x=>x.user_id===p.id):undefined;
  if(p&&(!m||m.level!=="employee"||!canManageScope(actor,m)))throw Error("Employee ID belongs to an account outside your attendance scope.");
  if(p&&registeredIds.has(p.id))throw Error("Employee "+id+" is already registered. Mark them in the registered list.");
  const canonical=p?employeeId(p):id;
  if(taken.has(normalize(canonical))||(p&&extraPeople.has(p.id)))throw Error("Duplicate extra attendee: "+id);
  taken.add(normalize(canonical));if(p)extraPeople.add(p.id);
  const previous=roster.extras.find(x=>normalize(x.employeeId)===normalize(canonical));
  return {eventId,employeeId:canonical,phone,userId:p?.id||null,organizationId:scope.organization_id,countryCode:scope.country_code,stateId:m?.state_id||previous?.stateId||scope.state_id,updatedBy:user.id,updatedAt:stamp};
 });
 const affected=new Set([...validIds,...roster.extras.flatMap(x=>x.userId?[x.userId]:[]),...newExtras.flatMap(x=>x.userId?[x.userId]:[])]);
 v.attendanceMarks=(v.attendanceMarks||[]).filter(x=>x.eventId!==eventId||!validIds.has(x.userId));
 v.contributions=v.contributions.filter(x=>x.event_id!==eventId||!affected.has(String(x.user_id)));
 for(const row of rows){
  if(!["present","absent","unmarked"].includes(row.status))throw Error("Invalid attendance status.");
  if(row.status==="unmarked")continue;
  v.attendanceMarks.push({eventId,userId:row.userId,status:row.status,updatedBy:user.id,updatedAt:stamp});
  if(row.status==="present"){
   const minutes=row.minutes.trim()===""?0:Number(row.minutes);
   if(!Number.isInteger(minutes)||minutes<0||minutes>10080||row.contribution.length>1000)throw Error("Enter valid optional volunteer minutes and contribution.");
   v.contributions.push({event_id:eventId,user_id:row.userId,volunteer_minutes:minutes,contribution:row.contribution.trim(),verified_at:stamp});
  }
 }
 for(const x of newExtras)if(x.userId){const previous=seeded.v3?.contributions.find(c=>c.event_id===eventId&&c.user_id===x.userId);v.contributions.push({event_id:eventId,user_id:x.userId,volunteer_minutes:previous?.volunteer_minutes??0,contribution:previous?.contribution||"Walk-in attendance",verified_at:stamp});}
 v.walkIns=[...existingOther,...newExtras];
 return data;
}
