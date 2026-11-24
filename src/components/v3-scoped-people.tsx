"use client";
import {useState} from "react";

type Entry=Record<string,string|number|null>;
const asText=(value:unknown)=>typeof value==="string"?value:"";
type EmployeeDraft={userId:string;name:string;email:string;department:string;jobTitle:string;phone:string};
const emptyDraft:EmployeeDraft={userId:"",name:"",email:"",department:"",jobTitle:"",phone:""};

/** Access control is enforced in /api/v3 using the employee's real membership. */
export default function V3ScopedPeople({members,scope,onRefresh}:{members:Entry[];scope:Entry|null;onRefresh:()=>Promise<void>}){
 const [query,setQuery]=useState(""),[draft,setDraft]=useState<EmployeeDraft>(emptyDraft);
 const [expandedId,setExpandedId]=useState<string|null>(null),[showAll,setShowAll]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const [credentials,setCredentials]=useState<{email:string;temporaryPassword:string;employeeId:string}|null>(null);
 const employees=members.filter(m=>m.level==="employee");
 const visible=employees.filter(m=>[m.full_name,m.email,m.department,m.user_id].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
 const selected=employees.find(m=>m.user_id===draft.userId);
 const payload=(person:Entry)=>({
  organization_id:asText(scope?.organization_id),country_code:asText(scope?.country_code),
  state_id:asText(person.state_id)||null,branch_id:asText(person.branch_id)||null,user_id:asText(person.user_id)
 });
 async function execute(action:"employeeUpdate"|"employeeStatus"|"employeeReset",person:Entry,fields:Record<string,unknown>={}){
  setBusy(true);setError("");setSuccess("");setCredentials(null);
  try{
   const response=await fetch("/api/v3",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({action,...payload(person),...fields})});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"Unable to update employee");
   if(action==="employeeReset"&&result.temporaryPassword)setCredentials({email:result.email,employeeId:result.employeeId,temporaryPassword:result.temporaryPassword});
   await onRefresh();
   setSuccess(action==="employeeReset"?"New one-time credentials generated.":action==="employeeStatus"?"Employee status updated.":"Employee details updated.");
   if(action==="employeeUpdate")setDraft(emptyDraft);
  }catch(e){setError(e instanceof Error?e.message:"Unable to update employee");}
  finally{setBusy(false);}
 }
 return <section className="v3-scoped-people" aria-label="Employees assigned to your country or state">
  <div className="v3-daily-actions" style={{justifyContent:"space-between",alignItems:"center"}}>
   <div><h3>Manage assigned employees ({employees.length})</h3><p className="ep-hint">Only employees in your assigned country or state appear here. Employee permissions are checked by the server.</p></div>
   <label>Search employees<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, email or employee ID"/></label>
  </div>
  {error&&<div className="ep-error" role="alert">{error}</div>}
  {success&&<div className="ep-success" role="status">{success}</div>}
  {credentials&&<div className="ep-info" role="status">
   <strong>One-time reset credentials</strong><p>Login email: {credentials.email}</p><p>Employee ID: {credentials.employeeId}</p>
   <p>Temporary password: <code>{credentials.temporaryPassword}</code></p><p>Valid for 24 hours. Share privately; first sign-in requires a new password.</p>
   <button type="button" className="ep-button secondary" onClick={()=>{void navigator.clipboard.writeText(credentials.email+"\n"+credentials.temporaryPassword).catch(()=>setError("Copy unavailable; select the credentials manually."));}}>Copy credentials</button>
   <button type="button" className="ep-button plain" onClick={()=>setCredentials(null)}>Hide credentials</button>
  </div>}
  {selected&&<form className="ep-panel v3-form" onSubmit={e=>{e.preventDefault();void execute("employeeUpdate",selected,{name:draft.name,email:draft.email,department:draft.department,job_title:draft.jobTitle,phone:draft.phone});}}>
    <h3>Edit {asText(selected.full_name)}</h3>
    <label>Full name<input required minLength={2} maxLength={100} value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></label>
    <label>Work email<input required type="email" value={draft.email} onChange={e=>setDraft(d=>({...d,email:e.target.value}))}/></label>
    <label>Department<input value={draft.department} onChange={e=>setDraft(d=>({...d,department:e.target.value}))}/></label>
    <label>Job title<input value={draft.jobTitle} onChange={e=>setDraft(d=>({...d,jobTitle:e.target.value}))}/></label>
    <label>Phone<input type="tel" value={draft.phone} onChange={e=>setDraft(d=>({...d,phone:e.target.value}))}/></label>
    <div className="v3-daily-actions"><button className="ep-button primary" type="submit" disabled={busy}>Save changes</button><button className="ep-button secondary" type="button" disabled={busy} onClick={()=>setDraft(emptyDraft)}>Cancel</button></div>
   </form>}
  <div className="v3-list">{(showAll?visible:visible.slice(0,5)).map(m=><div key={asText(m.user_id)}>
   <strong>{asText(m.full_name)}</strong>
   <span>{asText(m.email)} · {asText(m.department)||"No department"} · {asText(m.status)||"active"}</span>
   <span>State: {asText(m.state_id)||"Not assigned"} · Branch: {asText(m.branch_id)||"State-wide"}</span>
   <button type="button" className="ep-button secondary" aria-expanded={expandedId===asText(m.user_id)} onClick={()=>{setExpandedId(v=>v===asText(m.user_id)?null:asText(m.user_id));setDraft(emptyDraft);}}>{expandedId===asText(m.user_id)?"Hide actions":"Manage employee"}</button>
   {expandedId===asText(m.user_id)&&<div className="v3-daily-actions cc-employee-actions">
    <button type="button" className="ep-button secondary" disabled={busy} onClick={()=>{setCredentials(null);setDraft({userId:asText(m.user_id),name:asText(m.full_name),email:asText(m.email),department:asText(m.department),jobTitle:asText(m.job_title),phone:asText(m.phone)});}}>Edit</button>
    <button type="button" className="ep-button secondary" disabled={busy} onClick={()=>{const status=m.status==="suspended"?"active":"suspended";if(window.confirm((status==="suspended"?"Suspend ":"Reactivate ")+asText(m.full_name)+"?"))void execute("employeeStatus",m,{status});}}>{m.status==="suspended"?"Reactivate":"Suspend"}</button>
    <button type="button" className="ep-button secondary" disabled={busy} onClick={()=>{if(window.confirm("Reset the password for "+asText(m.email)+"? Existing sessions will be signed out."))void execute("employeeReset",m);}}>Reset password</button>
   </div>}
  </div>)}
  {visible.length>5&&<button type="button" className="ep-button secondary" onClick={()=>setShowAll(v=>!v)}>{showAll?"Show first 5":"Show all "+visible.length+" employees"}</button>}
  {!visible.length&&<p>{query?"No employees match your search.":"No employees assigned yet. Use Create employee above."}</p>}</div>
 </section>;
}
