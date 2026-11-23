"use client";
import {useState} from "react";
import {ArrowLeft,CalendarDays,Check,Plus,Search,Trash2} from "lucide-react";
import type {Person,PortalData} from "@/lib/portal-model";
import {attendanceEvents,attendanceRoster,employeeId,saveEventAttendance,type AttendanceRow,type WalkInInput} from "@/lib/event-attendance";
type Props={user:Person;data:PortalData;now:number;onSave:(data:PortalData)=>boolean};
export default function EventAttendance(props:Props){
 const {user,data,now}=props;
 const [eventId,setEventId]=useState(""),[query,setQuery]=useState("");
 const events=attendanceEvents(user,data);
 if(eventId&&events.some(e=>e.id===eventId))return <AttendanceSheet key={eventId} {...props} eventId={eventId} onBack={()=>setEventId("")}/>;
 const visible=events.filter(e=>[e.title,e.location].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
 return <section className="ep-panel v3-workspace cc-attendance">
  <div><div className="ed-eyebrow">DAILY OPERATIONS</div><h2>Event attendance</h2><p className="ep-hint">Open an event to record attendance for registered employees and walk-ins.</p></div>
  <label className="cc-att-search"><Search size={17}/><input aria-label="Search events" type="search" placeholder="Search events" value={query} onChange={e=>setQuery(e.target.value)}/></label>
  <div className="v3-list">{visible.map(e=>{const roster=attendanceRoster(user,data,e.id),present=roster.rows.filter(r=>r.status==="present").length;return <button className="cc-att-event" type="button" key={e.id} onClick={()=>setEventId(e.id)}><CalendarDays size={20}/><span><strong>{e.title}</strong><small>{new Date(e.startsAt).toLocaleDateString("en-IN")} · {e.location||"Online"} · {Date.parse(e.startsAt)>now?"Upcoming":"Attendance available"}</small></span><span className="cc-att-event-count">{roster.rows.length} registered · {present+roster.extras.length} present</span><span className="cc-att-open">Open event →</span></button>})}{!visible.length&&<p>No published events found.</p>}</div>
 </section>;
}
function AttendanceSheet({user,data,now,onSave,eventId,onBack}:Props&{eventId:string;onBack:()=>void}){
 const roster=attendanceRoster(user,data,eventId);
 const [rows,setRows]=useState<AttendanceRow[]>(()=>roster.rows.map(({userId,status,minutes,contribution})=>({userId,status,minutes,contribution})));
 const [extras,setExtras]=useState<WalkInInput[]>(()=>roster.extras.map(({employeeId,phone})=>({employeeId,phone})));
 const [search,setSearch]=useState(""),[error,setError]=useState(""),[saved,setSaved]=useState(false),[dirty,setDirty]=useState(false);
 const [draftId,setDraftId]=useState(""),[draftPhone,setDraftPhone]=useState("");
 const [attendanceSubmitted,setAttendanceSubmitted]=useState(false);
 const readOnly=Date.parse(roster.event.startsAt)>now;
 const present=rows.filter(r=>r.status==="present").length,absent=rows.length-present,pending=0;
 const visible=roster.rows.filter(r=>[r.person.fullName,employeeId(r.person),r.person.department].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
 function change(id:string,patch:Partial<AttendanceRow>){setRows(prev=>prev.map(r=>r.userId===id?{...r,...patch}:r));setDirty(true);setSaved(false);setError("");setAttendanceSubmitted(false);}
 function addExtra(){
  const employeeNumber=draftId.trim().toUpperCase(),phone=draftPhone.trim();
  if(!employeeNumber||!phone){setError("Enter both employee ID and phone number.");return;}
  const next=[...extras,{employeeId:employeeNumber,phone}];
  try{saveEventAttendance(user,data,eventId,rows,next);setExtras(next);setDraftId("");setDraftPhone("");setError("");setDirty(true);setSaved(false);}catch(e){setError(e instanceof Error?e.message:"Cannot add attendee.");}
 }
 function save(){
  setError("");setSaved(false);
  try{if(draftId.trim()||draftPhone.trim())throw Error("Add or clear the unfinished extra attendee before saving.");
   const finalRows=rows.map(r=>({...r,status:r.status==="present"?"present" as const:"absent" as const}));
   const next=saveEventAttendance(user,data,eventId,finalRows,extras);
   if(!onSave(next))throw Error("Attendance could not be saved in this browser.");
   const updated=attendanceRoster(user,next,eventId);setExtras(updated.extras.map(({employeeId,phone})=>({employeeId,phone})));setSaved(true);setDirty(false);setAttendanceSubmitted(true);
  }catch(e){setError(e instanceof Error?e.message:"Could not save attendance.");}
 }
 return <section className="ep-panel v3-workspace cc-attendance">
  <button type="button" className="ep-back" onClick={()=>{if(!dirty&& !draftId&&!draftPhone||window.confirm("Discard unsaved attendance changes?"))onBack();}}><ArrowLeft size={16}/> Back to attendance</button>
  <div><div className="ed-eyebrow">EVENT ATTENDANCE</div><h2>{roster.event.title}</h2><p className="ep-hint">{new Date(roster.event.startsAt).toLocaleString("en-IN")} · {roster.event.location||"Online"}</p></div>
  <div className="v3-metrics cc-att-metrics">{[{label:"Registered",value:rows.length},{label:"Registered present",value:present},{label:"Absent",value:absent},{label:"Not marked",value:pending},{label:"Extra attendees",value:extras.length},{label:"Total present",value:present+extras.length}].map(m=><div key={m.label}><strong>{m.value}</strong><span>{m.label}</span></div>)}</div>
  {readOnly&&<p className="ep-info">This event has not started. The roster is available to review; attendance can be marked after the event begins.</p>}
  <div className="cc-att-head"><h3>Registered employees</h3><label className="cc-att-search"><Search size={16}/><input type="search" aria-label="Search registered employees" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or employee ID"/></label></div>
  <div className="ep-table-scroll cc-att-table"><table><thead><tr><th>Employee</th><th>Employee ID</th><th>Present ✓</th><th>Contribution (optional)</th></tr></thead><tbody>{visible.map(({person,userId})=>{
   const row=rows.find(r=>r.userId===userId)!;
   return <tr key={userId}><td><strong>{person.fullName}</strong><small>{person.department}</small></td><td>{employeeId(person)}</td><td><input type="checkbox" aria-label={"Present: "+person.fullName} disabled={readOnly} checked={row.status==="present"} onChange={e=>change(userId,{status:e.target.checked?"present":"absent"})} style={{width:20,height:20,accentColor:"var(--elixir-green-dark)",cursor:"pointer"}}/></td><td>{row.status==="present"?<details className="cc-att-contribution"><summary>{row.minutes||row.contribution?"Edit contribution":"Add contribution"}</summary><label>Volunteer minutes<input disabled={readOnly} type="number" min={0} max={10080} step={1} value={row.minutes} onChange={e=>change(userId,{minutes:e.target.value})}/></label><label>Contribution<textarea disabled={readOnly} maxLength={1000} value={row.contribution} onChange={e=>change(userId,{contribution:e.target.value})}/></label></details>:<span className="ep-hint">—</span>}</td></tr>
  })}</tbody></table>{!visible.length&&<p className="ep-hint">{rows.length?"No matching employees.":"No confirmed registrations for this event."}</p>}</div>
  {attendanceSubmitted&&<div className="cc-att-extras"><h3>Extra attendees (walk-ins)</h3><p className="ep-hint">Add employees who attended without a confirmed registration. They count as present automatically.</p>
   {extras.length>0&&<div className="ep-table-scroll"><table><thead><tr><th>Employee ID</th><th>Phone number</th><th>Action</th></tr></thead><tbody>{extras.map((x,i)=><tr key={x.employeeId}><td>{x.employeeId}</td><td>{x.phone}</td><td><button type="button" className="ep-button secondary" aria-label={"Remove "+x.employeeId} disabled={readOnly} onClick={()=>{setExtras(prev=>prev.filter((_,j)=>j!==i));setDirty(true);setSaved(false);setError("");}}><Trash2 size={15}/> Remove</button></td></tr>)}</tbody></table></div>}
   <div className="cc-att-add"><label>Employee ID<input disabled={readOnly} value={draftId} maxLength={80} onChange={e=>setDraftId(e.target.value)} placeholder="EMP-1001"/></label><label>Phone number<input disabled={readOnly} type="tel" value={draftPhone} maxLength={25} onChange={e=>setDraftPhone(e.target.value)} placeholder="+91 …"/></label><button type="button" className="ep-button secondary" disabled={readOnly} onClick={addExtra}><Plus size={16}/> Add extra attendee</button></div>
  </div>}
  {error&&<p className="ep-error" role="alert">{error}</p>}{saved&&<p className="ep-success" role="status"><Check size={16}/> Attendance saved. {present+extras.length} total present.</p>}
  <div className="cc-att-submit"><span className="ep-hint">{"Checked = present, unchecked = absent. Submit attendance before adding extra attendees."}</span><button className="ep-button primary" type="button" disabled={readOnly} onClick={save}>{attendanceSubmitted?"Update attendance":"Submit attendance"}</button></div>
 </section>;
}
