import type {PortalData} from "./portal-model";

export type DashboardMember={user_id:string;level:string;state_id:string|null;branch_id:string|null;organization_id:string;status?:string|null};
export type DashboardState={id:string;name:string};
export type DashboardBranch={id:string;state_id:string};
export function monthBounds(now:number):[number,number]{
 const d=new Date(now);
 return [new Date(d.getFullYear(),d.getMonth(),1).getTime(),new Date(d.getFullYear(),d.getMonth()+1,1).getTime()];
}
export function peopleMetrics(members:DashboardMember[],data:PortalData,now:number){
 const employees=members.filter(m=>m.level==="employee");
 const employeeIds=new Set(employees.map(m=>m.user_id));
 const [start,end]=monthBounds(now);
 const monthEvents=data.events.filter(e=>e.status==="published"&&Date.parse(e.startsAt)>=start&&Date.parse(e.startsAt)<end);
 const eventIds=new Set(monthEvents.map(e=>e.id));
 const registeredIds=new Set(data.registrations.filter(r=>r.status==="going"&&employeeIds.has(r.userId)&&eventIds.has(r.eventId)).map(r=>r.userId));
 const statuses=new Map(data.users.map(p=>[p.id,p.status]));
 const active=employees.filter(m=>(m.status||statuses.get(m.user_id)||"active")==="active").length;
 return {total:employees.length,active,suspended:employees.length-active,registeredThisMonth:registeredIds.size,notRegisteredThisMonth:employees.length-registeredIds.size,
  eventCount:monthEvents.filter(e=>data.registrations.some(r=>r.status==="going"&&employeeIds.has(r.userId)&&r.eventId===e.id)).length};
}
export function stateMetrics(states:DashboardState[],branches:DashboardBranch[],members:DashboardMember[],data:PortalData,now:number){
 return states.map(state=>({
  id:state.id,name:state.name,branches:branches.filter(b=>b.state_id===state.id).length,
  administrators:members.filter(m=>m.level==="state_admin"&&m.state_id===state.id).length,
  ...peopleMetrics(members.filter(m=>m.state_id===state.id),data,now)
 }));
}
