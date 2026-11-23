"use client";
import {useEffect,useState} from "react";
type Application={id:string;organization_name:string;website:string;contact_name:string;contact_email:string;phone:string;work_domain:string;employee_count:string;message:string;status:string;created_at:string};
export default function CompanyApplicationsAdmin({onApproved}:{onApproved?:()=>void}){
 const [items,setItems]=useState<Application[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(""),[notice,setNotice]=useState("");
 async function load(){const r=await fetch("/api/company-applications",{cache:"no-store"});const j=await r.json();if(!r.ok)throw Error(j.error||"Unable to load");setItems(j.applications||[]);}
 useEffect(()=>{let active=true;void fetch("/api/company-applications",{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error||"Unable to load");return j;}).then(j=>{if(active)setItems(j.applications||[]);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load");});return()=>{active=false;};},[]);
 async function review(id:string,decision:"approved"|"rejected"){
  if(!window.confirm((decision==="approved"?"Approve":"Reject")+" this company application?"))return;
  setBusy(id);setError("");setNotice("");
  try{const r=await fetch("/api/company-applications",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,decision})});const j=await r.json();if(!r.ok)throw Error(j.error||"Review failed");await load();setNotice("Application "+decision+".");if(decision==="approved")onApproved?.();}
  catch(e){setError(e instanceof Error?e.message:"Review failed");}finally{setBusy("");}
 }
 return <section className="ep-panel" style={{marginTop:16}}><div className="ed-eyebrow">PARTNER ONBOARDING</div><h2>Company applications</h2><p className="ep-hint">Review self-service requests before activating company email domains. Approved companies appear in Organizations.</p>
 {error&&<p role="alert" className="ep-error">{error}</p>}{notice&&<p role="status" className="ep-success">{notice}</p>}
 <div className="ep-table-scroll"><table><thead><tr><th>Company</th><th>Contact</th><th>Work domain</th><th>Submitted</th><th>Status / action</th></tr></thead><tbody>{items.map(a=><tr key={a.id}><td><strong>{a.organization_name}</strong><small>{a.website||"No website"} · {a.employee_count||"Size not given"}</small></td><td>{a.contact_name}<small>{a.contact_email}</small></td><td>{a.work_domain}</td><td>{new Date(a.created_at).toLocaleDateString("en-IN")}</td><td>{a.status==="pending"?<div style={{display:"flex",gap:8}}><button type="button" className="ep-button primary" disabled={!!busy} onClick={()=>void review(a.id,"approved")}>Approve</button><button type="button" className="ep-button secondary" disabled={!!busy} onClick={()=>void review(a.id,"rejected")}>Reject</button></div>:a.status}</td></tr>)}</tbody></table>{!items.length&&!error&&<p className="ep-hint">No applications received.</p>}</div></section>;
}
