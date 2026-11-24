"use client";
import {useEffect,useMemo,useState,useRef,useId} from "react";
import {cityKey,suggestCities,type CityLocation} from "@/lib/city-suggestions";
import type {Person,PortalData} from "@/lib/portal-model";
import {previewAction,previewWorkspace,type Row} from "@/lib/v3-preview";
import {stateMetrics} from "@/lib/v3-dashboard";
type City=CityLocation;
export default function CountryHierarchy({user,data,onSave,hash}:{user:Person;data:PortalData;onSave:(data:PortalData)=>boolean;hash:(password:string)=>Promise<string>}){
 const ws=previewWorkspace(user,data);
 const countries=ws.countries||[];
 const [country,setCountry]=useState(ws.scope?.country_code||""),[cities,setCities]=useState<City[]>([]),[search,setSearch]=useState(""),[selection,setSelection]=useState(""),[email,setEmail]=useState(""),[employeeNumber,setEmployeeNumber]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[geoError,setGeoError]=useState(""),[credentials,setCredentials]=useState<Row|null>(null),[retry,setRetry]=useState(0);
 const [cityOpen,setCityOpen]=useState(false),[activeIndex,setActiveIndex]=useState(-1);
 const [showCreate,setShowCreate]=useState(false);
 const [today]=useState(()=>Date.now());
 const listId=useId(),cityInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  if(!country)return;
  const abort=new AbortController();
  fetch("/api/geography?country="+encodeURIComponent(country),{signal:abort.signal}).then(async r=>{
   const payload=await r.json();if(!r.ok)throw Error(payload.error||"Could not load city list.");
   if(!abort.signal.aborted){setCities(payload.cities);setLoading(false);}
  }).catch(e=>{if(!abort.signal.aborted){setGeoError(e instanceof Error?e.message:"Could not load city list.");setLoading(false);}});
  return()=>abort.abort();
 },[country,retry]);
 const options=useMemo(()=>Array.from(new Map(cities.map(c=>[cityKey(c),c])).values()),[cities]);
 const chosen=options.find(c=>cityKey(c)===selection);
 const suggestions=useMemo(()=>suggestCities(options,search),[options,search]);
 const showSuggestions=cityOpen&&!!country&&!loading&&!geoError;
 function chooseCity(city:City){
  setSelection(cityKey(city));setSearch(city.city);setCityOpen(false);setActiveIndex(-1);setError("");
 }
 function cityKeyDown(e:React.KeyboardEvent<HTMLInputElement>){
  if(e.key==="Escape"){setCityOpen(false);setActiveIndex(-1);return;}
  if(e.key==="ArrowDown"||e.key==="ArrowUp"){
   e.preventDefault();setCityOpen(true);
   setActiveIndex(i=>suggestions.length?Math.max(0,Math.min(suggestions.length-1,i+(e.key==="ArrowDown"?1:-1))):-1);return;
  }
  if(e.key==="Enter"&&showSuggestions){
   e.preventDefault();if(suggestions.length)chooseCity(suggestions[Math.max(0,activeIndex)]);
  }
 }
 useEffect(()=>{if(showSuggestions&&activeIndex>=0)document.getElementById(listId+"-"+activeIndex)?.scrollIntoView({block:"nearest"});},[showSuggestions,activeIndex,listId]);
 async function run(payload:Record<string,unknown>){
  setBusy(true);setError("");setCredentials(null);
  try{const result=await previewAction(user,data,{organization_id:ws.scope?.organization_id,country_code:country,...payload},hash);if(!onSave(result.data))throw Error("Unable to save in this browser.");setCredentials(result.credentials);return true;}
  catch(e){setError(e instanceof Error?e.message:"Unable to create account.");return false;}finally{setBusy(false);}
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!chosen){setError("Choose a city from the suggestions.");cityInput.current?.focus();return;}
  if(await run({action:"cityStateAdmin",city:chosen.city,state_name:chosen.state,email,employee_number:employeeNumber})){setEmail("");setEmployeeNumber("");setShowCreate(false);}
 }
 const administrators=(ws.members||[]).filter(m=>m.level==="state_admin");
 const stateRows=stateMetrics((ws.states||[]).map(r=>({id:String(r.id),name:String(r.name)})),(ws.branches||[]).map(r=>({id:String(r.id),state_id:String(r.state_id)})),(ws.members||[]).map(m=>({user_id:String(m.user_id),level:String(m.level),state_id:m.state_id?String(m.state_id):null,branch_id:m.branch_id?String(m.branch_id):null,organization_id:String(m.organization_id),status:null})),data,today);
 const monthEventCount=data.events.filter(e=>e.companyId===user.companyId&&e.status==="published"&&new Date(e.startsAt).getMonth()===new Date(today).getMonth()&&new Date(e.startsAt).getFullYear()===new Date(today).getFullYear()).length;
 const employeeCount=stateRows.reduce((sum,r)=>sum+r.total,0);

 return <section className="ep-panel v3-workspace cc-hierarchy-setup">
  <div className="cc-page-heading"><div><div className="ed-eyebrow">COUNTRY OPERATIONS</div><h2>Existing locations</h2><p>States, branches, teams and event participation at a glance.</p></div><button className="ep-button primary" type="button" onClick={()=>{setShowCreate(v=>!v);setCredentials(null);setError("");}}>{showCreate?"Cancel":"+ Add state"}</button></div>
  <div className="cc-kpi-grid"><div className="cc-kpi"><span>Total states</span><strong>{ws.states?.length||0}</strong><small>Within your country</small></div><div className="cc-kpi"><span>Cities / branches</span><strong>{ws.branches?.length||0}</strong><small>Registered locations</small></div><div className="cc-kpi"><span>Total employees</span><strong>{employeeCount}</strong><small>State-assigned staff</small></div><div className="cc-kpi"><span>Events this month</span><strong>{monthEventCount}</strong><small>Published company events</small></div></div>
  <div className="cc-state-grid">{stateRows.map(r=><article className="cc-state-card" key={r.id}><h3>{r.name}</h3><div className="cc-state-numbers"><div><strong>{r.total}</strong><span>Employees</span></div><div><strong>{r.eventCount}</strong><span>Events this month</span></div><div><strong>{r.branches}</strong><span>Branches</span></div></div><p className="ep-hint">{r.administrators} administrator(s) assigned</p></article>)}{!stateRows.length&&<div className="ep-empty">No states have been added. Use Add state to get started.</div>}</div>
  {showCreate&&<section className="cc-action-composer"><div className="cc-card-heading"><h3>Add state and assign an administrator</h3><button type="button" className="ep-button secondary" onClick={()=>setShowCreate(false)}>Close</button></div><p className="ep-hint">Choose a city to identify its state automatically, then assign its administrator.</p><form className="cc-location-form" onSubmit={submit}>
   <div className="cc-form-step"><h3>1. Select location</h3><div className="v3-form">
    <label>Country<select required value={country} onChange={e=>{setCountry(e.target.value);setSearch("");setSelection("");setCityOpen(false);setActiveIndex(-1);setCities([]);setLoading(Boolean(e.target.value));setGeoError("");}}><option value="">Select country</option>{countries.map(c=><option key={String(c.code)} value={String(c.code)}>{c.name}</option>)}</select></label>
    <div className="cc-city-field">
     <label htmlFor={listId+"-input"}>City</label>
     <div className="cc-city-combobox">
      <input id={listId+"-input"} ref={cityInput} type="text" role="combobox" aria-autocomplete="list" aria-required="true" aria-expanded={showSuggestions} aria-controls={listId} aria-activedescendant={showSuggestions&&activeIndex>=0&&suggestions[activeIndex]?listId+"-"+activeIndex:undefined} autoComplete="off" spellCheck={false} required placeholder={loading?"Loading cities…":"Type city name"} value={search} disabled={!country||loading||!!geoError} onFocus={()=>{setCityOpen(true);setActiveIndex(-1);}} onBlur={()=>setCityOpen(false)} onChange={e=>{setSearch(e.target.value);setSelection("");setCityOpen(true);setActiveIndex(-1);}} onKeyDown={cityKeyDown}/>
      {showSuggestions&&<div className="cc-city-popup"><ul role="listbox" id={listId} aria-label="City suggestions">
       {suggestions.map((city,i)=><li key={cityKey(city)} id={listId+"-"+i} role="option" aria-selected={activeIndex===i} className={activeIndex===i?"active":""} onPointerDown={e=>e.preventDefault()} onMouseEnter={()=>setActiveIndex(i)} onClick={()=>chooseCity(city)}><strong>{city.city}</strong><span>{city.state}</span></li>)}
      </ul>{!suggestions.length&&<p role="status">No matching cities. Try another spelling.</p>}</div>}
     </div>
    </div>
    <label>State / region (automatic)<input readOnly value={chosen?.state||""} placeholder="Appears after city selection" aria-label="Automatically detected state"/></label>
   </div>{geoError&&<div className="ep-error" role="alert">{geoError} <button type="button" onClick={()=>{setLoading(true);setGeoError("");setRetry(x=>x+1);}}>Retry</button></div>}</div>
   <div className="cc-form-step"><h3>2. State admin credentials</h3><div className="v3-form">
    <label>Work email<input required type="email" autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@company.com"/></label>
    <label>Company ID number<input required maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9_\-]{0,39}" autoComplete="off" value={employeeNumber} onChange={e=>setEmployeeNumber(e.target.value)} placeholder="EMP-1001"/></label>
   </div><p className="ep-hint">Demo mode: this administrator is created only in this browser profile. Its credentials will not work in another browser or device. A shared PostgreSQL backend is required for real account invitations.</p><p className="ep-hint">A one-time password is generated automatically; it expires in 24 hours and must be replaced after the first sign-in.</p><button type="submit" className="ep-button primary" disabled={busy||!chosen||loading||!!geoError}>{busy?"Creating…":"Create state admin"}</button></div>
  </form></section>}
  {error&&<p role="alert" className="ep-error">{error}</p>}
  {credentials&&<div className="ep-info cc-issued-credentials" role="status"><h3>One-time login credentials</h3><p>Email: {credentials.email}</p><p>ID number: {credentials.employeeId}</p><p>Temporary password: <code>{credentials.temporaryPassword}</code></p><p>Valid for one sign-in within 24 hours. Share privately.</p><p className="ep-hint"><strong>Browser-only demo:</strong> These credentials work only in the browser profile where this account was created. They cannot be used by a colleague in another browser or on another computer.</p><div className="v3-daily-actions"><button className="ep-button secondary" type="button" onClick={()=>void navigator.clipboard.writeText("Email: "+credentials.email+"\nID: "+credentials.employeeId+"\nTemporary password: "+credentials.temporaryPassword).catch(()=>setError("Clipboard unavailable. Select and copy the credentials."))}>Copy credentials</button><button className="ep-button plain" type="button" onClick={()=>setCredentials(null)}>Hide credentials</button></div></div>}
  <details className="cc-location-directory"><summary>View all branches and state administrators</summary><div className="v3-list">{(ws.states||[]).map(s=><div key={String(s.id)}><strong>{s.name}</strong><span>{(ws.branches||[]).filter(b=>b.state_id===s.id).map(b=>b.name).join(", ")||"No branch assigned"}</span><small>{administrators.filter(m=>m.state_id===s.id).map(m=>m.email).join(", ")||"No state admin yet"}</small></div>)}</div></details>
 </section>;
}
