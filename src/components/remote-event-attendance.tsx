"use client";
import {useMemo,useState} from "react";
import {ArrowLeft,CalendarDays,Check,Plus,Search} from "lucide-react";
import type {Person,PortalData} from "@/lib/portal-model";
type Mark={event_id:string;user_id:string;status:string};
type Extra={event_id:string;employee_id:string;phone:string};
type Props={user:Person;data:PortalData;now:number;scope:{organization_id?:string;country_code?:string;state_id?:string}|null;members:Record<string,unknown>[];marks:Mark[];extras:Extra[];onRefresh:()=>Promise<void>};
export default function RemoteEventAttendance({user,data,now,scope,members,marks,extras,onRefresh}:Props){
 const [eventId,setEventId]=useState(""),[search,setSearch]=useState(""),[checks,setChecks]=useState<Record<string,boolean>>({}),[submitted,setSubmitted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
 const [extraId,setExtraId]=useState(""),[phone,setPhone]=useState("");
 const companyEvents=data.events.filter(e=>e.companyId===user.companyId&&e.status==="published").sort((a,b)=>Date.parse(b.startsAt)-Date.parse(a.startsAt));
 const event=companyEvents.find(e=>e.id===eventId);
 const scopedIds=new Set(members.filter(m=>m.level==="employee").map(m=>String(m.user_id)));
 const roster=useMemo(()=>event?data.registrations.filter(r=>r.eventId===event.id&&r.status==="going"&&scopedIds.has(r.userId)).map(r=>({id:r.userId,person:data.users.find(p=>p.id===r.userId)})).filter((r):r is {id:string;person:Person}=>Boolean(r.person)):[],[event,data, members]);
 const existing=marks.filter(m=>m.event_id===eventId);
 const present=roster.filter(r=>(checks[r.id]??existing.find(m=>m.user_id===r.id)?.status==="present")).length;
 const extrasForEvent=extras.filter(x=>x.event_id===eventId);
 function open(id:string){setEventId(id);setChecks({});setSubmitted(marks.some(m=>m.event_id===id));setError("");setMessage("");setSearch("");}
 async function send(action:string,fields:Record<string,unknown>){
  const r=await fetch("/api/v3",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,organization_id:scope?.organization_id,country_code:scope?.country_code,state_id:scope?.state_id,event_id:eventId,...fields})});
  const j=await r.json();if(!r.ok)throw Error(j.error||"Unable to save");return j;
 }
 async function submit(){if(!event)return;setBusy(true);setError("");setMessage("");try{
  await send("attendanceSubmit",{rows:roster.map(r=>({user_id:r.id,present:checks[r.id]??existing.find(m=>m.user_id===r.id)?.status==="present"}))});
  setSubmitted(true);setChecks({});await onRefresh();setMessage("Attendance submitted. You can now add extra employees.");
 }catch(e){setError(e instanceof Error?e.message:"Could not submit attendance");}finally{setBusy(false);}}
 async function addExtra(){setBusy(true);setError("");setMessage("");try{
  await send("attendanceExtra",{employee_id:extraId.trim(),phone:phone.trim()});
  setExtraId("");setPhone("");await onRefresh();setMessage("Extra attendee added.");
 }catch(e){setError(e instanceof Error?e.message:"Could not add attendee");}finally{setBusy(false);}}
 if(!event)return <section className="ep-panel cc-attendance"><div className="ed-eyebrow">DAILY OPERATIONS</div><h2>Event attendance</h2><p className="ep-hint">Choose an event to open its registered employee list.</p><label className="cc-att-search"><Search size={16}/><input type="search" placeholder="Search events" aria-label="Search events" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="v3-list">{companyEvents.filter(e=>[e.title,e.location].join(" ").toLowerCase().includes(search.toLowerCase())).map(e=><button type="button" className="cc-att-event" key={e.id} onClick={()=>open(e.id)}><CalendarDays size={19}/><span><strong>{e.title}</strong><small>{new Date(e.startsAt).toLocaleDateString("en-IN")} · {e.location||"Online"}</small></span><span className="cc-att-open">Open event →</span></button>)}{!companyEvents.length&&<p>No published events found.</p>}</div></section>;
 const readOnly=Date.parse(event.startsAt)>now;
 return <section className="ep-panel cc-attendance"><button className="ep-back" type="button" onClick={()=>setEventId("")}><ArrowLeft size={16}/> Back to events</button><div className="ed-eyebrow">EVENT ATTENDANCE</div><h2>{event.title}</h2><p className="ep-hint">{new Date(event.startsAt).toLocaleString("en-IN")} · {event.location||"Online"}</p><div className="v3-metrics cc-att-metrics"><div><strong>{roster.length}</strong><span>Registered employees</span></div><div><strong>{present}</strong><span>Present</span></div><div><strong>{roster.length-present}</strong><span>Absent</span></div><div><strong>{extrasForEvent.length}</strong><span>Extra attendees</span></div></div>
 <div className="cc-att-head"><h3>Registered participants</h3><label className="cc-att-search"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search employee" aria-label="Search employees"/></label></div>
 <div className="ep-table-scroll cc-att-table"><table><thead><tr><th>Employee name</th><th>Employee ID</th><th style={{textAlign:"right"}}>Present ✓</th></tr></thead><tbody>{roster.filter(r=>[r.person.fullName,r.person.id,r.person.department].join(" ").toLowerCase().includes(search.toLowerCase())).map(r=><tr key={r.id}><td><strong>{r.person.fullName}</strong><small>{r.person.department}</small></td><td>{r.person.employeeNumber||"EMP-"+r.id.slice(0,8).toUpperCase()}</td><td style={{textAlign:"right"}}><input style={{width:21,height:21,accentColor:"var(--elixir-green-dark)"}} type="checkbox" aria-label={"Present: "+r.person.fullName} disabled={busy||readOnly} checked={checks[r.id]??existing.find(m=>m.user_id===r.id)?.status==="present"} onChange={e=>{setChecks(v=>({...v,[r.id]:e.target.checked}));setSubmitted(false);}}/></td></tr>)}</tbody></table>{!roster.length&&<p className="ep-hint">No registered employees within your assigned scope.</p>}</div>
 <div className="cc-att-submit"><span className="ep-hint">Checked = present. Unchecked = absent.</span><button className="ep-button primary" type="button" onClick={()=>void submit()} disabled={busy||readOnly}>{busy?"Submitting…":"Submit attendance"}</button></div>
 {submitted&&<div className="cc-att-extras"><h3>Add extra attendees</h3><p className="ep-hint">Employees who participated without registering. Both employee ID and phone are required.</p>{extrasForEvent.length>0&&<div className="v3-list">{extrasForEvent.map(x=><div key={x.employee_id}><strong>{x.employee_id}</strong><span>{x.phone}</span></div>)}</div>}<div className="cc-att-add"><label>Employee ID<input value={extraId} onChange={e=>setExtraId(e.target.value)} placeholder="EMP-12345678"/></label><label>Phone<input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 …"/></label><button className="ep-button secondary" type="button" disabled={busy||readOnly||!extraId.trim()||!phone.trim()} onClick={()=>void addExtra()}><Plus size={16}/> Add extra</button></div></div>}
 {error&&<p className="ep-error" role="alert">{error}</p>}{message&&<p className="ep-success" role="status"><Check size={16}/>{message}</p>}
 </section>;
}
