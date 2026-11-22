"use client";
import {useEffect,useRef,useState} from "react";
import {employeeImpact} from "@/lib/employee-impact";
import type {PortalData} from "@/lib/portal-model";
type Row=Record<string,string|number|null>;
const point=(a:number,r:number)=>[130+r*Math.cos(a),130+r*Math.sin(a)];
function sector(a:number,b:number,r:number){
 const [x,y]=point(a,r),[u,v]=point(b,r);
 return "M 130 130 L "+x+" "+y+" A "+r+" "+r+" 0 "+(b-a>Math.PI?1:0)+" 1 "+u+" "+v+" Z";
}
export default function ImpactCharts({data,userId,companyId,verified,available,now}:{data:PortalData;userId:string;companyId:string|null;verified:Row[];available:boolean;now:number}){
 const {goals,unassigned,outcomes,monthly,attended}=employeeImpact(data,userId,companyId,verified,now);
 const [active,setActive]=useState<number|null>(null);
 const [animated,setAnimated]=useState(false);
 const chartRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const el=chartRef.current;
  if(!el)return;
  if(typeof IntersectionObserver==="undefined"){const frame=window.requestAnimationFrame(()=>setAnimated(true));return ()=>window.cancelAnimationFrame(frame);}
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){setAnimated(true);observer.disconnect();}
  },{threshold:.08});
  observer.observe(el);
  return ()=>observer.disconnect();
 },[]);
 const pie=[{name:"Present",value:outcomes.present,color:"#42763c"},{name:"Absent",value:outcomes.absent,color:"#c65b50"},{name:"Not marked",value:outcomes.unmarked,color:"#c5cbd0"}];
 const total=pie.reduce((s,x)=>s+x.value,0);let cursor=0;
 const segments=pie.map(p=>{const start=cursor;cursor+=total?p.value/total*100:0;return p.color+" "+start+"% "+cursor+"%";});
 const highest=Math.max(1,...goals.map(g=>g.count)),step=2*Math.PI/17,engaged=goals.filter(g=>g.count>0).sort((a,b)=>b.count-a.count||a.goal-b.goal),maxHours=Math.max(1,...monthly.map(m=>m.hours));
 return <div ref={chartRef} className={"cc-impact-grid evs-animated-charts"+(animated?" is-visible":"")} aria-label="Employee impact analytics">
  <section className="cc-impact-chart"><h3>Attendance breakdown</h3><p className="ep-hint">Completed events you registered for</p>
   <div className="cc-chart-stage"><div className="cc-pie" role="img" aria-label={available?pie.map(p=>p.name+": "+p.value).join(", "):"Attendance unavailable"} style={{background:available&&total?"conic-gradient("+segments.join(",")+")":"#e5e9e4"}}/></div><div className="cc-chart-legend">{pie.map(p=><div key={p.name}><i style={{background:p.color}}/><span>{p.name}</span><strong>{available?p.value:"—"}</strong></div>)}</div>
   <p className="ep-hint">{!available?"Attendance unavailable.":total?Math.round(outcomes.present/total*100)+"% confirmed present · "+total+" completed registrations":"No completed registrations yet."} Walk-ins excluded.</p>
  </section>
  <section className="cc-impact-chart"><h3>SDG engagement</h3><p className="ep-hint">Verified events by primary UN Sustainable Development Goal</p>
   <div className="cc-chart-stage"><svg className="cc-polar" viewBox="0 0 260 260" role="img" aria-label={engaged.map(g=>"Goal "+g.goal+" "+g.name+": "+g.count+" events").join(", ")||"No goal engagement yet"}>
    {[.25,.5,.75,1].map(f=><circle key={f} cx="130" cy="130" r={91*Math.sqrt(f)} fill="none" stroke="#e3e8e2" strokeDasharray="3 3"/>)}
    {goals.map((g,i)=>{const a=i*step-Math.PI/2-step/2,b=a+step,mid=(a+b)/2,[x,y]=point(mid,111);return <g key={g.goal}><line x1="130" y1="130" x2={point(a,91)[0]} y2={point(a,91)[1]} stroke="#e4e8e1"/>{g.count>0&&<path d={sector(a+.025,b-.025,91*Math.sqrt(g.count/highest))} fill={g.color} opacity={active===null||active===g.goal?1:.25}><title>{"SDG "+g.goal+" · "+g.name+": "+g.count+" events"}</title></path>}<text x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#59655c">{g.goal}</text></g>;})}
   </svg></div>
   <div className="cc-chart-legend cc-sdg-legend">{engaged.slice(0,3).map(g=><button key={g.goal} type="button" aria-pressed={active===g.goal} onClick={()=>setActive(v=>v===g.goal?null:g.goal)}><i style={{background:g.color}}/><span>{g.goal} · {g.name}</span><strong>{g.count}</strong></button>)}</div>
   {engaged.length>3&&<details className="cc-sdg-more"><summary>All remaining goals ({engaged.length-3})</summary><div className="cc-chart-legend">{engaged.slice(3).map(g=><button key={g.goal} type="button" aria-pressed={active===g.goal} onClick={()=>setActive(v=>v===g.goal?null:g.goal)}><i style={{background:g.color}}/><span>{g.goal} · {g.name}</span><strong>{g.count}</strong></button>)}</div></details>}
   <p className="ep-hint">{engaged.length? "Top: "+engaged.filter(g=>g.count===engaged[0].count).map(g=>"SDG "+g.goal).join(", ")+" · "+engaged[0].count+" events each":"No tagged attendance yet."}{unassigned?" · "+unassigned+" without a goal":""}</p>
  </section>
  <section className="cc-impact-chart"><h3>Monthly volunteer hours</h3><p className="ep-hint">Last six months · verified time</p><div className="cc-chart-stage"><div className="cc-impact-bars" role="img" aria-label={available?monthly.map(m=>m.label+": "+m.hours.toFixed(1)+" hours").join(", "):"Volunteer hours unavailable"}>{monthly.map((m,i)=><div className="cc-impact-column" key={i} title={m.label+": "+m.hours.toFixed(1)+" verified hours"}><span>{available?Number(m.hours.toFixed(1))+"h":"—"}</span><div className="cc-impact-track"><div style={{height:(available?m.hours/maxHours*100:0)+"%"}}/></div><small>{m.label}</small></div>)}</div></div><p className="ep-hint">{available?attended+" verified events in all time":"Verified history unavailable"}</p></section>
 </div>;
}
