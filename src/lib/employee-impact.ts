import type {PortalData,PortalEvent} from "./portal-model";
export const SDG_NAMES=["No Poverty","Zero Hunger","Good Health and Well-being","Quality Education","Gender Equality","Clean Water and Sanitation","Affordable and Clean Energy","Decent Work and Economic Growth","Industry, Innovation and Infrastructure","Reduced Inequalities","Sustainable Cities and Communities","Responsible Consumption and Production","Climate Action","Life Below Water","Life on Land","Peace, Justice and Strong Institutions","Partnerships for the Goals"];
export const SDG_COLORS=["#e5243b","#dda63a","#4c9f38","#c5192d","#ff3a21","#26bde2","#fcc30b","#a21942","#fd6925","#dd1367","#fd9d24","#bf8b2e","#3f7e44","#0a97d9","#56c02b","#00689d","#19486a"];
// One primary goal per sample activity; no arbitrary classification of real user-created events.
export const DEMO_GOALS=[17,15,4,3,4,8,11,2,10,4,6,3,8,12,4,15,4,10,3,4,17,17,17,10];
export function eventGoal(e:PortalEvent):number|null{
 if(e.primarySdg!==undefined&&Number.isInteger(e.primarySdg)&&e.primarySdg>=1&&e.primarySdg<=17)return e.primarySdg;
 if(e.primarySdg===0)return null;
 const match=/^(elixir|micron|microsoft)-event-(\d+)$/.exec(e.id);
 return match?DEMO_GOALS[Number(match[2])-1]??null:null;
}
type Contribution=Record<string,string|number|null|undefined>;
export function employeeImpact(data:PortalData,userId:string,companyId:string|null,verified:Contribution[],now=Date.now()){
 const events=new Map(data.events.filter(e=>e.companyId===companyId&&e.status==="published").map(e=>[e.id,e]));
 const attended=new Map<string,Contribution>();
 for(const r of verified){const id=String(r.event_id??r.id??"");if(events.has(id)&&!attended.has(id))attended.set(id,r);}
 const goals=SDG_NAMES.map((name,i)=>({goal:i+1,name,color:SDG_COLORS[i],count:0}));
 let unassigned=0;
 for(const id of attended.keys()){const goal=eventGoal(events.get(id)!);if(goal)goals[goal-1].count++;else unassigned++;}
 const outcomes={present:0,absent:0,unmarked:0};
 for(const r of data.registrations.filter(r=>r.userId===userId&&r.status==="going")){
  const e=events.get(r.eventId);if(!e||Date.parse(e.endsAt)>now)continue;
  const mark=data.v3?.attendanceMarks?.find(m=>m.eventId===r.eventId&&m.userId===userId);
  if(mark?.status==="absent")outcomes.absent++;else if(mark?.status==="present"||attended.has(r.eventId))outcomes.present++;else outcomes.unmarked++;
 }
 const monthly=Array.from({length:6},(_,i)=>{const d=new Date(now);d.setDate(1);d.setMonth(d.getMonth()-5+i);const y=d.getFullYear(),m=d.getMonth();return {label:d.toLocaleDateString("en",{month:"short"}),hours:[...attended.entries()].reduce((sum,[id,r])=>{const t=new Date(events.get(id)!.startsAt);return sum+(t.getFullYear()===y&&t.getMonth()===m?Math.max(0,Number(r.volunteer_minutes)||0)/60:0);},0)};});
 return {goals,unassigned,outcomes,monthly,attended:attended.size};
}
