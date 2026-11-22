"use client";
import {useCallback,useEffect,useState,type FormEvent} from "react";
import Link from "next/link";
type Row=Record<string,string|number|null>;
type Workspace={level:string;campaigns:Row[];impact:Row[];certificates:Row[];feedback:Row[];events:Row[];states:Row[];branches:Row[];scope?:Row};
const metrics=["beneficiaries_reached","sessions_delivered","volunteer_hours","trees_planted","other"];
const today=()=>new Date().toISOString().slice(0,10);
export default function CSRImpactPage(){
 const [data,setData]=useState<Workspace|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [campaign,setCampaign]=useState({title:"",description:"",starts_on:"",ends_on:"",primary_sdg:"",target_beneficiaries:""});
 const [impact,setImpact]=useState({campaign_id:"",metric:"beneficiaries_reached",metric_label:"",value:"",period_start:"",period_end:"",evidence_reference:""});
 const [feedback,setFeedback]=useState({event_id:"",rating:"5",comments:""});
 const [audience,setAudience]=useState({event_id:"",audience:"company",state_id:"",branch_id:"",user_ids:""});
 const refresh=useCallback(async()=>{const r=await fetch("/api/impact",{cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.error||"Could not load CSR workspace");setData(j);},[]);
 useEffect(()=>{let active=true;fetch("/api/impact",{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Could not load CSR workspace");return j;}).then(j=>{if(active)setData(j);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load");});return()=>{active=false;};},[]);
 async function submit(e:FormEvent<HTMLFormElement>,action:string,args:Record<string,unknown>){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   const r=await fetch("/api/impact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...args})});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Unable to save");
   setNotice("Saved successfully.");await refresh();
   if(action==="createCampaign")setCampaign({title:"",description:"",starts_on:"",ends_on:"",primary_sdg:"",target_beneficiaries:""});
   if(action==="recordImpact")setImpact(old=>({...old,value:"",evidence_reference:""}));
  }catch(e){setError(e instanceof Error?e.message:"Unable to save");}finally{setBusy(false);}
 }
 const manager=data?.level==="country_admin"||data?.level==="state_admin";
 const total=(metric:string)=>data?.impact.filter(r=>r.metric===metric&&r.status==="verified").reduce((sum,r)=>sum+Number(r.value||0),0)||0;
 return <main className="ep-main" style={{maxWidth:1280,margin:"0 auto",padding:"20px 16px"}}>
  <p><Link href="/">← Back to Employee Volunteer System</Link></p>
  <div className="ed-eyebrow">ELIXIR FOUNDATION · VERIFIED SOCIAL IMPACT</div>
  <h1>CSR & volunteer impact</h1>
  <p>Campaigns, independently verified outcomes, volunteer attendance and certificates. Pending figures do not count toward verified totals.</p>
  {error&&<p role="alert" className="ep-error">{error} {data===null&&<Link href="/login">Sign in</Link>}</p>}
  {notice&&<p role="status" className="ep-success">{notice}</p>}
  {data&&<>
   <div className="v3-metrics">
    <div><strong>{data.campaigns.length}</strong><span>Campaigns in scope</span></div>
    <div><strong>{total("beneficiaries_reached").toLocaleString("en-IN")}</strong><span>Verified beneficiary reach (not deduplicated)</span></div>
    <div><strong>{total("volunteer_hours").toLocaleString("en-IN")}</strong><span>Verified impact hours (reported)</span></div>
   </div>
   <section className="ep-panel"><h2>Campaigns</h2>
    {data.campaigns.length?<div className="v3-list">{data.campaigns.map(c=><div key={String(c.id)}><strong>{c.title}</strong><span>{c.status} · SDG {c.primary_sdg??"not assigned"} · {String(c.starts_on).slice(0,10)}–{String(c.ends_on).slice(0,10)}</span><p>{c.description}</p></div>)}</div>:<p>No campaigns are recorded for your location yet.</p>}
   </section>
   {manager&&<section className="ep-panel"><h2>Create campaign</h2>
    <form className="v3-form" onSubmit={e=>void submit(e,"createCampaign",{...campaign,primary_sdg:campaign.primary_sdg||null,target_beneficiaries:campaign.target_beneficiaries||null})}>
     <label>Campaign title<input required minLength={3} maxLength={180} value={campaign.title} onChange={e=>setCampaign(v=>({...v,title:e.target.value}))}/></label>
     <label>Description<textarea maxLength={5000} value={campaign.description} onChange={e=>setCampaign(v=>({...v,description:e.target.value}))}/></label>
     <div className="ep-form-grid"><label>Starts<input type="date" required value={campaign.starts_on} onChange={e=>setCampaign(v=>({...v,starts_on:e.target.value}))}/></label><label>Ends<input type="date" required min={campaign.starts_on||today()} value={campaign.ends_on} onChange={e=>setCampaign(v=>({...v,ends_on:e.target.value}))}/></label></div>
     <div className="ep-form-grid"><label>Primary SDG (1–17)<input type="number" min="1" max="17" value={campaign.primary_sdg} onChange={e=>setCampaign(v=>({...v,primary_sdg:e.target.value}))}/></label><label>Target beneficiaries<input type="number" min="0" value={campaign.target_beneficiaries} onChange={e=>setCampaign(v=>({...v,target_beneficiaries:e.target.value}))}/></label></div>
     <button className="ep-button primary" disabled={busy}>Create campaign</button>
    </form>
   </section>}
   {data.level==="country_admin"&&<section className="ep-panel"><h2>Event audience</h2>
    <p>Choose exactly who can discover and register for the event. Existing company-wide events remain visible unless you narrow their audience.</p>
    <form className="v3-form" onSubmit={e=>void submit(e,"setAudience",{...audience,state_id:audience.state_id||null,branch_id:audience.branch_id||null,user_ids:audience.user_ids.split(",").map(x=>x.trim()).filter(Boolean)})}>
     <label>Your event<select required value={audience.event_id} onChange={e=>setAudience(v=>({...v,event_id:e.target.value}))}><option value="">Choose an event</option>{data.events.map(ev=><option key={String(ev.id)} value={String(ev.id)}>{ev.title} · currently {ev.audience}</option>)}</select></label>
     <label>Audience<select value={audience.audience} onChange={e=>setAudience(v=>({...v,audience:e.target.value}))}>
      <option value="company">Everyone in company</option><option value="country">Your country</option><option value="state">Selected state</option><option value="branch">Selected branch</option><option value="invited">Invited employees only</option>
     </select></label>
     {["state","branch"].includes(audience.audience)&&<label>State<select required value={audience.state_id} onChange={e=>setAudience(v=>({...v,state_id:e.target.value,branch_id:""}))}><option value="">Select a state</option>{data.states.map(st=><option key={String(st.id)} value={String(st.id)}>{st.name}</option>)}</select></label>}
     {audience.audience==="branch"&&<label>Branch<select required value={audience.branch_id} onChange={e=>setAudience(v=>({...v,branch_id:e.target.value}))}><option value="">Select a branch</option>{data.branches.filter(b=>b.state_id===audience.state_id).map(b=><option key={String(b.id)} value={String(b.id)}>{b.name}</option>)}</select></label>}
     {audience.audience==="invited"&&<label>Employee account IDs (comma-separated)<textarea value={audience.user_ids} onChange={e=>setAudience(v=>({...v,user_ids:e.target.value}))} placeholder="Add employee IDs from the People directory"/></label>}
     <button className="ep-button primary" disabled={busy}>Save event audience</button>
    </form>
   </section>}
   <section className="ep-panel"><h2>Reported impact</h2>
    {data.impact.length?<div className="v3-list">{data.impact.map(i=><div key={String(i.id)}><strong>{i.value} · {String(i.metric).replaceAll("_"," ")}</strong><span>{i.status} · {String(i.period_start).slice(0,10)} to {String(i.period_end).slice(0,10)}</span>{manager&&i.status==="draft"&&<form onSubmit={e=>void submit(e,"verifyImpact",{id:i.id})}><button className="ep-button secondary" disabled={busy}>Verify (different reviewer only)</button></form>}</div>)}</div>:<p>No impact records yet. Only independently verified values contribute to the KPIs.</p>}
   </section>
   {manager&&<section className="ep-panel"><h2>Record impact</h2>
    <form className="v3-form" onSubmit={e=>void submit(e,"recordImpact",{...impact,value:Number(impact.value)})}>
     <label>Campaign<select required value={impact.campaign_id} onChange={e=>setImpact(v=>({...v,campaign_id:e.target.value}))}><option value="">Choose campaign</option>{data.campaigns.map(c=><option key={String(c.id)} value={String(c.id)}>{c.title}</option>)}</select></label>
     <label>Metric<select value={impact.metric} onChange={e=>setImpact(v=>({...v,metric:e.target.value}))}>{metrics.map(m=><option key={m} value={m}>{m.replaceAll("_"," ")}</option>)}</select></label>
     <label>Value<input required type="number" min="0" step="0.01" value={impact.value} onChange={e=>setImpact(v=>({...v,value:e.target.value}))}/></label>
     <div className="ep-form-grid"><label>From<input required type="date" value={impact.period_start} onChange={e=>setImpact(v=>({...v,period_start:e.target.value}))}/></label><label>To<input required type="date" value={impact.period_end} min={impact.period_start||undefined} onChange={e=>setImpact(v=>({...v,period_end:e.target.value}))}/></label></div>
     <label>Evidence reference (optional)<input value={impact.evidence_reference} maxLength={1000} onChange={e=>setImpact(v=>({...v,evidence_reference:e.target.value}))}/></label>
     <button className="ep-button primary" disabled={busy}>Submit for verification</button>
    </form>
   </section>}
   {!manager&&<section className="ep-panel"><h2>Event feedback</h2><p>After an administrator verifies your attendance, you can review the completed event using its event ID.</p>
    <form className="v3-form" onSubmit={e=>void submit(e,"feedback",{...feedback,rating:Number(feedback.rating)})}>
     <label>Completed event ID<input required value={feedback.event_id} onChange={e=>setFeedback(v=>({...v,event_id:e.target.value}))}/></label>
     <label>Rating<select value={feedback.rating} onChange={e=>setFeedback(v=>({...v,rating:e.target.value}))}>{[5,4,3,2,1].map(x=><option value={x} key={x}>{x} / 5</option>)}</select></label>
     <label>Comments<textarea maxLength={2000} value={feedback.comments} onChange={e=>setFeedback(v=>({...v,comments:e.target.value}))}/></label>
     <button className="ep-button primary" disabled={busy}>Save feedback</button>
    </form>
   </section>}
   <section className="ep-panel"><h2>My certificates</h2>
    {data.certificates.length?<div className="v3-list">{data.certificates.map(x=><div key={String(x.id)}><strong>{x.title}</strong><span>{x.certificate_number} · {String(x.issued_at).slice(0,10)}</span></div>)}</div>:<p>No certificates issued yet. Certificates require verified attendance for a completed event.</p>}
   </section>
  </>}
 </main>;
}
