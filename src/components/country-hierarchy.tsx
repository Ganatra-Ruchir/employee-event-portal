"use client";
import {useEffect,useMemo,useState} from "react";
import type {Person,PortalData} from "@/lib/portal-model";
import {previewAction,previewWorkspace,type Row} from "@/lib/v3-preview";
type City={city:string;state:string};
export default function CountryHierarchy({user,data,onSave,hash}:{user:Person;data:PortalData;onSave:(data:PortalData)=>boolean;hash:(password:string)=>Promise<string>}){
 const ws=previewWorkspace(user,data);
 const countries=ws.countries||[];
 const [country,setCountry]=useState(ws.scope?.country_code||""),[cities,setCities]=useState<City[]>([]),[search,setSearch]=useState(""),[selection,setSelection]=useState(""),[email,setEmail]=useState(""),[employeeNumber,setEmployeeNumber]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[geoError,setGeoError]=useState(""),[credentials,setCredentials]=useState<Row|null>(null),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!country)return;
  const abort=new AbortController();
  fetch("/api/geography?country="+encodeURIComponent(country),{signal:abort.signal}).then(async r=>{
   const payload=await r.json();if(!r.ok)throw Error(payload.error||"Could not load city list.");
   if(!abort.signal.aborted){setCities(payload.cities);setLoading(false);}
  }).catch(e=>{if(!abort.signal.aborted){setGeoError(e instanceof Error?e.message:"Could not load city list.");setLoading(false);}});
  return()=>abort.abort();
 },[country,retry]);
 const options=useMemo(()=>Array.from(new Map(cities.map(c=>[JSON.stringify([c.city,c.state]),c])).entries()),[cities]);
 const chosen=options.find(([id])=>id===selection)?.[1];
 const filtered=options.filter(([id,c])=>id===selection||(c.city+" "+c.state).toLowerCase().includes(search.trim().toLowerCase()));
 async function run(payload:Record<string,unknown>){
  setBusy(true);setError("");setCredentials(null);
  try{const result=await previewAction(user,data,{organization_id:ws.scope?.organization_id,country_code:country,...payload},hash);if(!onSave(result.data))throw Error("Unable to save in this browser.");setCredentials(result.credentials);return true;}
  catch(e){setError(e instanceof Error?e.message:"Unable to create account.");return false;}finally{setBusy(false);}
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!chosen)return;
  if(await run({action:"cityStateAdmin",city:chosen.city,state_name:chosen.state,email,employee_number:employeeNumber})){setEmail("");setEmployeeNumber("");}
 }
 const administrators=(ws.members||[]).filter(m=>m.level==="state_admin");
 return <section className="ep-panel v3-workspace cc-hierarchy-setup">
  <div><div className="ed-eyebrow">ADMINISTRATION · SETUP</div><h2>Create state administrator</h2><p>Choose a city. Its state is detected automatically, and the location is added when you create the account.</p></div>
  <form className="cc-location-form" onSubmit={submit}>
   <div className="cc-form-step"><h3>1. Select location</h3><div className="v3-form">
    <label>Country<select required value={country} onChange={e=>{setCountry(e.target.value);setSearch("");setSelection("");setCities([]);setLoading(Boolean(e.target.value));setGeoError("");}}><option value="">Select country</option>{countries.map(c=><option key={String(c.code)} value={String(c.code)}>{c.name}</option>)}</select></label>
    <label>Search cities<input type="search" placeholder="Search by city or state" value={search} onChange={e=>setSearch(e.target.value)} disabled={!country||loading||!!geoError}/></label>
    <label>City<select required value={selection} disabled={!country||loading||!!geoError} onChange={e=>setSelection(e.target.value)}><option value="">{loading?"Loading cities…":filtered.length?"Select city":"No matching cities"}</option>{filtered.map(([id,c])=><option key={id} value={id}>{c.city} · {c.state}</option>)}</select></label>
    <label>State / region (automatic)<input readOnly value={chosen?.state||""} placeholder="Appears after city selection" aria-label="Automatically detected state"/></label>
   </div>{country&&!loading&&!geoError&&<p className="ep-hint">{filtered.length.toLocaleString()} matching locations in the directory.</p>}{geoError&&<div className="ep-error" role="alert">{geoError} <button type="button" onClick={()=>{setLoading(true);setGeoError("");setRetry(x=>x+1);}}>Retry</button></div>}</div>
   <div className="cc-form-step"><h3>2. State admin credentials</h3><div className="v3-form">
    <label>Work email<input required type="email" autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@company.com"/></label>
    <label>Company ID number<input required maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9_\-]{0,39}" autoComplete="off" value={employeeNumber} onChange={e=>setEmployeeNumber(e.target.value)} placeholder="EMP-1001"/></label>
   </div><p className="ep-hint">A one-time password is generated automatically; it expires in 24 hours and must be replaced after the first sign-in.</p><button type="submit" className="ep-button primary" disabled={busy||!chosen||loading||!!geoError}>{busy?"Creating…":"Create state admin"}</button></div>
  </form>
  {error&&<p role="alert" className="ep-error">{error}</p>}
  {credentials&&<div className="ep-info cc-issued-credentials" role="status"><h3>One-time login credentials</h3><p>Email: {credentials.email}</p><p>ID number: {credentials.employeeId}</p><p>Temporary password: <code>{credentials.temporaryPassword}</code></p><p>Valid for one sign-in within 24 hours. Share privately.</p><div className="v3-daily-actions"><button className="ep-button secondary" type="button" onClick={()=>void navigator.clipboard.writeText("Email: "+credentials.email+"\nID: "+credentials.employeeId+"\nTemporary password: "+credentials.temporaryPassword).catch(()=>setError("Clipboard unavailable. Select and copy the credentials."))}>Copy credentials</button><button className="ep-button plain" type="button" onClick={()=>setCredentials(null)}>Hide credentials</button></div></div>}
  <details className="cc-location-directory"><summary>Existing locations ({ws.states?.length||0} states · {ws.branches?.length||0} cities)</summary><div className="v3-list">{(ws.states||[]).map(s=><div key={String(s.id)}><strong>{s.name}</strong><span>{(ws.branches||[]).filter(b=>b.state_id===s.id).map(b=>b.name).join(", ")||"No city assigned"}</span></div>)}</div></details>
  <h3>State administrators ({administrators.length})</h3><div className="v3-list">{administrators.map(m=><div key={String(m.user_id)}><strong>{m.email}</strong><span>{(ws.states||[]).find(s=>s.id===m.state_id)?.name||"State"} · ID: {m.employee_number}</span><button type="button" className="ep-button secondary" disabled={busy} onClick={()=>{if(window.confirm("Generate a new temporary password for "+m.email+"? The old password will stop working."))void run({action:"resetStateAdmin",user_id:m.user_id});}}>Generate new temporary password</button></div>)}{!administrators.length&&<p>No state administrators yet.</p>}</div>
 </section>;
}
