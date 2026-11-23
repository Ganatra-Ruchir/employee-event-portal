"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {ArrowLeft,Building2,CheckCircle2,ChevronDown,Clock3,Globe2,Mail,ShieldCheck,ShieldAlert,XCircle} from "lucide-react";
import "../../onboarding.css";
import "../../evs-pages.css";
type Application={id:string;organization_name:string;domain:string;contact_name:string;contact_email:string;country_code:string;country_name:string;city:string;website:string|null;employee_band:string;message:string;status:"pending"|"approved"|"rejected";review_note:string;created_at:string;reviewed_at:string|null;organization_id:string|null};
export default function CompanyRequestsPage(){
 const [items,setItems]=useState<Application[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[notice,setNotice]=useState(""),[selected,setSelected]=useState<string|null>(null),[note,setNote]=useState(""),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[filter,setFilter]=useState<"all"|"pending"|"approved"|"rejected">("pending");
 const refresh=useCallback(async()=>{
  const r=await fetch("/api/company-applications",{cache:"no-store"});
  const json=await r.json();if(!r.ok)throw Error(json.error||"Could not load requests");
  setItems(json.applications||[]);
 },[]);
 useEffect(()=>{let active=true;fetch("/api/company-applications",{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Could not load requests");return j;}).then(j=>{if(active)setItems(j.applications||[])}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Could not load requests")}).finally(()=>{if(active)setLoading(false)});return()=>{active=false};},[]);
 const shown=useMemo(()=>items.filter(x=>filter==="all"||x.status===filter),[items,filter]);
 const counts=useMemo(()=>({pending:items.filter(x=>x.status==="pending").length,approved:items.filter(x=>x.status==="approved").length,rejected:items.filter(x=>x.status==="rejected").length}),[items]);
 async function decide(id:string,decision:"approved"|"rejected"){setBusy(true);setError("");setNotice("");
  if(decision==="approved"&&!confirmed){setError("Confirm the company ownership review first.");setBusy(false);return;}
  try{
   const r=await fetch("/api/company-applications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,decision,review_note:note,confirmOwnership:confirmed})});
   const result=await r.json();if(!r.ok)throw Error(result.error||"Could not complete review");
   setNotice(result.message||"Review saved.");setSelected(null);setNote("");setConfirmed(false);await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Review failed");}finally{setBusy(false);}
 }
 return <div className="onboard-page onboard-admin">
  <header className="onboard-header"><Link className="onboard-mark" href="/"><span>E</span> Employee Volunteer System</Link><Link href="/overview" className="onboard-back"><ArrowLeft size={17}/> Root dashboard</Link></header>
  <main className="onboard-admin-wrap">
   <div className="onboard-admin-heading"><div><span className="onboard-eyebrow"><ShieldCheck size={16}/> PLATFORM ADMINISTRATION</span><h1>Company applications</h1><p>Review incoming company requests before provisioning workspaces. No applicant can approve themselves.</p></div><Link href="/" className="onboard-secondary-link">Open portal</Link></div>
   {notice&&<p role="status" className="onboard-notice"><CheckCircle2 size={18}/>{notice}</p>}
   {error&&<p role="alert" className="onboard-error">{error} {error.includes("sign-in")&&<Link href="/login">Sign in</Link>}</p>}
   <div className="onboard-admin-stats" aria-label="Application status totals">
    <div><Clock3 size={20}/><strong>{counts.pending}</strong><span>Awaiting review</span></div>
    <div><CheckCircle2 size={20}/><strong>{counts.approved}</strong><span>Approved</span></div>
    <div><XCircle size={20}/><strong>{counts.rejected}</strong><span>Rejected</span></div>
   </div>
   <div className="onboard-admin-toolbar"><h2>Application queue</h2><label>Filter <select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}><option value="pending">Pending</option><option value="all">All requests</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label></div>
   {loading?<p className="onboard-admin-empty">Loading applications…</p>:shown.length===0?<div className="onboard-admin-empty"><Building2 size={30}/><h3>Nothing in this queue</h3><p>{filter==="pending"?"New company applications will appear here when they are submitted.":"No applications match this filter."}</p></div>:
    <div className="onboard-requests">
     {shown.map(x=><article key={x.id} className="onboard-request">
      <div className="onboard-request-head"><div className="onboard-request-icon"><Building2 size={23}/></div><div className="onboard-request-name"><h3>{x.organization_name}</h3><span><Globe2 size={13}/>{x.domain} · {x.city}, {x.country_name}</span></div><span className={"onboard-request-status "+x.status}>{x.status}</span></div>
      <div className="onboard-request-details"><span><Mail size={15}/>{x.contact_name} · {x.contact_email}</span><span>Team size: {x.employee_band}</span><span>Applied: {new Date(x.created_at).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span></div>
      {x.website&&<p className="onboard-request-site"><a href={x.website} target="_blank" rel="noopener noreferrer">Declared website: {new URL(x.website).hostname}</a></p>}
      {x.message&&<p className="onboard-request-message">{x.message}</p>}
      {x.status!=="pending"?<p className="onboard-reviewed"><CheckCircle2 size={15}/> {x.review_note||"Reviewed"}{x.organization_id?" · Workspace created":""}</p>:
       <>
        <button type="button" className="onboard-review-toggle" aria-expanded={selected===x.id} onClick={()=>{const isOpen=selected===x.id;setSelected(isOpen?null:x.id);setNote("");setConfirmed(false);setError("");}}>Review application <ChevronDown size={17}/></button>
        {selected===x.id&&<form onSubmit={e=>{e.preventDefault();void decide(x.id,"approved");}} className="onboard-review-panel">
         <div className="onboard-review-warning"><ShieldAlert size={19}/><p><strong>Verify before approval.</strong> Check the company name, domain and nominated contact using independent information. An application alone is not proof of ownership.</p></div>
         <label>Review note <textarea required minLength={5} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} rows={3} placeholder="Record why this company is eligible, or why it should be rejected."/></label>
         <label className="onboard-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I checked the company and work domain before approving.</span></label>
         <div className="onboard-review-actions"><button disabled={busy||!confirmed||note.trim().length<5} type="submit" className="onboard-submit">{busy?"Saving…":"Approve & create workspace"}<CheckCircle2 size={17}/></button><button disabled={busy||note.trim().length<5} type="button" className="onboard-reject" onClick={()=>void decide(x.id,"rejected")}>Reject application <XCircle size={17}/></button></div>
         <small>Approval creates a company and invitation only. The contact must separately verify their email through company signup. No email is automatically sent from this screen.</small>
        </form>}
       </>}
     </article>)}
    </div>}
  </main>
  <footer className="onboard-footer"><span>Employee Volunteer System · Root Administration</span><span>Review carefully before activating organizations</span></footer>
 </div>;
}
