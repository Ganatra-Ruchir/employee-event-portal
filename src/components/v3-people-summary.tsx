"use client";
import type {PortalData} from "@/lib/portal-model";
import {peopleMetrics,stateMetrics,type DashboardBranch,type DashboardMember,type DashboardState} from "@/lib/v3-dashboard";

type Props={members:DashboardMember[];states:DashboardState[];branches:DashboardBranch[];data:PortalData;now:number;stateAdmin:boolean};
export default function V3PeopleSummary({members,states,branches,data,now,stateAdmin}:Props){
 const metrics=peopleMetrics(members,data,now);
 const rows=stateMetrics(states,branches,members,data,now);
 const stateWideCount=members.filter(m=>m.level==="employee"&&!m.branch_id).length;
 const groups=stateAdmin?[...branches.map(b=>({id:b.id,name:(b as DashboardBranch&{name?:string}).name||"Branch",total:members.filter(m=>m.level==="employee"&&m.branch_id===b.id).length})),...(stateWideCount?[{id:"state-wide",name:"State-wide",total:stateWideCount}]:[])]:
  rows.map(s=>({id:s.id,name:s.name,total:s.total}));
 const max=Math.max(1,...groups.map(g=>g.total));
 const percent=metrics.active?Math.round(100*metrics.registeredThisMonth/metrics.active):0;
 return <div className="cc-insights">
   <div className="cc-kpi-grid">
    <div className="cc-kpi"><span>Total employees</span><strong>{metrics.total}</strong><small>In your assigned {stateAdmin?"state":"country"}</small></div>
    <div className="cc-kpi"><span>Active employees</span><strong>{metrics.active}</strong><small>{metrics.suspended} suspended</small></div>
    <div className="cc-kpi"><span>Registered this month</span><strong>{metrics.registeredThisMonth}</strong><small>Unique employees with event registrations</small></div>
    <div className="cc-kpi"><span>Events with registrants</span><strong>{metrics.eventCount}</strong><small>Events starting this month</small></div>
   </div>
   <div className="cc-insight-charts">
    <section className="cc-insight-card">
      <div className="cc-card-heading"><h3>{stateAdmin?"Employees by branch":"Employees by state"}</h3><span>{groups.length} {stateAdmin?"branches":"states"}</span></div>
      <div className="cc-mini-bars">{groups.length?groups.map(g=><div className="cc-mini-bar" key={g.id}><span title={g.name}>{g.name}</span><div className="cc-mini-track"><div style={{width:(100*g.total/max)+"%"}}/></div><strong>{g.total}</strong></div>):<p className="ep-hint">No locations are assigned yet.</p>}</div>
    </section>
    <section className="cc-insight-card">
      <div className="cc-card-heading"><h3>Monthly participation</h3><span>{new Date(now).toLocaleString("en-IN",{month:"long",year:"numeric"})}</span></div>
      <div className="cc-donut-body"><div className="cc-participation-donut" role="img" aria-label={percent+" percent of employees registered for an event this month"} style={{background:`conic-gradient(#2e703b 0 ${percent}%,#e5e9e5 ${percent}% 100%)`}}><div><strong>{percent}%</strong><small>registered</small></div></div>
       <div className="cc-participation-legend"><span><i className="cc-legend-green"/> Active staff registered: <b>{metrics.registeredThisMonth}</b></span><span><i className="cc-legend-grey"/> Active staff not registered: <b>{metrics.notRegisteredThisMonth}</b></span><p className="ep-hint">Registration is not proof of attendance. Verified attendance is shown on the Attendance page.</p></div></div>
    </section>
   </div>
 </div>;
}
