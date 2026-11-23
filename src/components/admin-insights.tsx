"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {BarChart3,CalendarDays,Target,UsersRound} from "lucide-react";
import {eventGoal,SDG_NAMES,SDG_COLORS} from "@/lib/employee-impact";
import type {PortalData,PortalEvent} from "@/lib/portal-model";

type Mode="registrations"|"events";
const fmt=(n:number)=>n.toLocaleString("en-IN");
function sector(a:number,b:number,r:number){
 const x=(theta:number,rad:number)=>110+rad*Math.cos(theta);
 const y=(theta:number,rad:number)=>110+rad*Math.sin(theta);
 return "M 110 110 L "+x(a,r)+" "+y(a,r)+" A "+r+" "+r+" 0 0 1 "+x(b,r)+" "+y(b,r)+" Z";
}
export default function AdminInsights({data,events,now}:{data:PortalData;events:PortalEvent[];now:number}){
 const [mode,setMode]=useState<Mode>("registrations");
 const [months,setMonths]=useState<6|12>(6);
 const [selectedGoal,setSelectedGoal]=useState<number|null>(null);
 const [visible,setVisible]=useState(false);
 const root=useRef<HTMLElement>(null);
 useEffect(()=>{
  const el=root.current;if(!el)return;
  if(typeof IntersectionObserver==="undefined"){const frame=window.requestAnimationFrame(()=>setVisible(true));return ()=>window.cancelAnimationFrame(frame);}
  const observer=new IntersectionObserver(items=>{
   if(items.some(item=>item.isIntersecting)){setVisible(true);observer.disconnect();}
  },{threshold:.08});
  observer.observe(el);return ()=>observer.disconnect();
 },[]);
 const live=useMemo(()=>events.filter(e=>e.status==="published"),[events]);
 const ids=useMemo(()=>new Set(live.map(e=>e.id)),[live]);
 const registrations=useMemo(()=>data.registrations.filter(r=>ids.has(r.eventId)),[data.registrations,ids]);
 const going=registrations.filter(r=>r.status==="going").length;
 const waitlisted=registrations.filter(r=>r.status==="waitlisted").length;
 const cancelled=registrations.filter(r=>r.status==="cancelled").length;
 const segments=[{label:"Going",count:going,color:"#285e30"},{label:"Waitlisted",count:waitlisted,color:"#ed3981"},{label:"Cancelled",count:cancelled,color:"#bdcbbf"}];
 const total=going+waitlisted+cancelled;
 let running=0;
 const stops=segments.map(item=>{const start=running;running+=total?item.count/total*100:0;return item.color+" "+start+"% "+running+"%";});
 const series=Array.from({length:months},(_,i)=>{
  const d=new Date(now);d.setDate(1);d.setHours(12,0,0,0);d.setMonth(d.getMonth()-months+1+i);
  const year=d.getFullYear(),month=d.getMonth();
  const records=mode==="events"?live.map(e=>e.startsAt):registrations.filter(r=>r.status!=="cancelled").map(r=>r.createdAt);
  const count=records.filter(stamp=>{const s=new Date(stamp);return !Number.isNaN(s.valueOf())&&s.getFullYear()===year&&s.getMonth()===month;}).length;
  return {label:d.toLocaleDateString("en-IN",{month:"short"}),year,count};
 });
 const peak=Math.max(1,...series.map(s=>s.count));
 const goalCounts=SDG_NAMES.map((name,i)=>({goal:i+1,name,color:SDG_COLORS[i],count:live.filter(e=>eventGoal(e)===i+1).length}));
 const topGoals=goalCounts.filter(g=>g.count>0).sort((a,b)=>b.count-a.count||a.goal-b.goal);
 const maxGoal=Math.max(1,...goalCounts.map(g=>g.count));
 const tagged=live.filter(e=>eventGoal(e)!==null).length;
 const upcoming=live.filter(e=>Date.parse(e.startsAt)>now).length;
 return <section ref={root} className={"evs-admin-insights"+(visible?" is-visible":"")} aria-label="Admin event and participation analytics">
  <div className="evs-insights-heading">
   <div><span className="evs-insights-eyebrow"><BarChart3 size={15}/> LIVE WORKSPACE INSIGHTS</span><h2>Participation at a glance</h2><p>Calculated from events and registrations visible to your account, not sample impact estimates.</p></div>
   <div className="evs-insights-period" role="group" aria-label="Chart period"><button type="button" aria-pressed={months===6} onClick={()=>setMonths(6)}>6 months</button><button type="button" aria-pressed={months===12} onClick={()=>setMonths(12)}>12 months</button></div>
  </div>
  <div className="evs-insights-grid">
   <article className="evs-insight-card">
    <div className="evs-insight-top"><span className="evs-insight-icon"><CalendarDays size={19}/></span><span className="evs-insight-kicker">ACTIVITY</span></div>
    <h3>Monthly momentum</h3><p>See how participation changes over time</p>
    <div className="evs-chart-toggle" role="group" aria-label="Activity metric"><button type="button" aria-pressed={mode==="registrations"} onClick={()=>setMode("registrations")}>Registrations</button><button type="button" aria-pressed={mode==="events"} onClick={()=>setMode("events")}>Events</button></div>
    <div className="evs-admin-bars" role="img" aria-label={series.map(s=>s.label+" "+s.year+": "+s.count+" "+mode).join(", ")}>
     {series.map((s,i)=><div className="evs-admin-bar-col" key={s.year+"-"+s.label} style={{animationDelay:(i*35)+"ms"}} title={s.label+" "+s.year+": "+s.count}>
      <span>{s.count>0?fmt(s.count):""}</span><div className="evs-admin-bar-track"><div style={{height:(s.count/peak*100)+"%"}}/></div><small>{s.label}</small></div>)}
    </div>
    <div className="evs-insight-foot"><CalendarDays size={14}/>{fmt(upcoming)} upcoming published events</div>
   </article>
   <article className="evs-insight-card">
    <div className="evs-insight-top"><span className="evs-insight-icon pink"><UsersRound size={19}/></span><span className="evs-insight-kicker">PARTICIPATION</span></div>
    <h3>Registration status</h3><p>Across published events in this workspace</p>
    <div className="evs-donut-area"><div className="evs-admin-donut" role="img" aria-label={segments.map(s=>s.label+": "+s.count).join(", ")} style={{background:total?"conic-gradient("+stops.join(",")+")":"#e8eee8"}}><div><strong>{fmt(going)}</strong><small>Going</small></div></div></div>
    <div className="evs-admin-legend">{segments.map(s=><div key={s.label}><span style={{background:s.color}}/><small>{s.label}</small><strong>{fmt(s.count)}</strong></div>)}</div>
   </article>
   <article className="evs-insight-card">
    <div className="evs-insight-top"><span className="evs-insight-icon"><Target size={19}/></span><span className="evs-insight-kicker">SDG ALIGNMENT</span></div>
    <h3>Goal engagement</h3><p>Primary SDG of published events, not verified outcomes</p>
    <div className="evs-polar-area"><svg viewBox="0 0 220 220" role="img" aria-label={topGoals.map(g=>"SDG "+g.goal+": "+g.count+" events").join(", ")||"No SDG-tagged events"}>
     {[24,46,68,85].map(rad=><circle key={rad} cx="110" cy="110" r={rad} stroke="#e4ebe4" fill="none" strokeDasharray="3 4"/>)}
     {goalCounts.map((g,i)=>{const a=i*2*Math.PI/17-Math.PI/2,b=(i+1)*2*Math.PI/17-Math.PI/2;return g.count>0?<path key={g.goal} d={sector(a+.018,b-.018,85*Math.sqrt(g.count/maxGoal))} fill={g.color} opacity={selectedGoal===null||selectedGoal===g.goal?1:.18}><title>{"SDG "+g.goal+" "+g.name+": "+g.count+" published events"}</title></path>:null;})}
     <circle cx="110" cy="110" r="10" fill="#fff" stroke="#dce8db"/>
    </svg></div>
    <div className="evs-sdg-summary">{topGoals.length?topGoals.slice(0,3).map(g=><button type="button" key={g.goal} aria-pressed={selectedGoal===g.goal} onClick={()=>setSelectedGoal(x=>x===g.goal?null:g.goal)}><i style={{background:g.color}}/>SDG {g.goal} <strong>{g.count}</strong></button>):<span className="evs-chart-empty">No SDG tags yet</span>}</div>
    <div className="evs-insight-foot"><Target size={14}/>{fmt(tagged)} of {fmt(live.length)} published events tagged</div>
   </article>
  </div>
 </section>;
}
