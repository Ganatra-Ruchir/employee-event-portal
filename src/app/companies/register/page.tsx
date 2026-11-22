"use client";
import {useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Building2,CheckCircle2,LockKeyhole,ShieldCheck,UsersRound} from "lucide-react";
import "../../onboarding.css";
import "../../evs-pages.css";

const countries=[["IN","India"],["US","United States"],["GB","United Kingdom"],["CA","Canada"],["AU","Australia"],["AE","United Arab Emirates"],["SG","Singapore"]];
type Application={organization_name:string;domain:string;contact_name:string;contact_email:string;country_code:string;city:string;website:string;employee_band:string;message:string;website_confirmation:string};
const initial:Application={organization_name:"",domain:"",contact_name:"",contact_email:"",country_code:"IN",city:"",website:"",employee_band:"51-200",message:"",website_confirmation:""};
export default function CompanyRegisterPage(){
 const [form,setForm]=useState<Application>(initial),[busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
 const patch=(key:keyof Application,value:string)=>setForm(v=>({...v,[key]:value}));
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setError("");
  try{
   const r=await fetch("/api/company-applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
   const result=await r.json();
   if(!r.ok){setError(result.error||"Unable to submit application.");return;}
   setDone(true);
  }catch{setError("Unable to reach the platform. Try again.");}
  finally{setBusy(false);}
 }
 return <div className="onboard-page">
  <header className="onboard-header"><Link className="onboard-mark" href="/"><span>E</span> Employee Volunteer System</Link><Link href="/" className="onboard-back"><ArrowLeft size={17}/> Back to home</Link></header>
  <main className="onboard-wrap">
   <aside className="onboard-intro">
    <span className="onboard-eyebrow"><Building2 size={16}/> COMPANY ONBOARDING</span>
    <h1>Make your organization part of <em>something meaningful.</em></h1>
    <p>Apply for a dedicated volunteering workspace for your teams. Every company is reviewed by a platform administrator before access is granted.</p>
    <div className="onboard-steps">
     <div><span>01</span><strong>Apply with work details</strong><small>Organization, domain and nominated contact</small></div>
     <div><span>02</span><strong>Platform admin review</strong><small>Application checked before workspace approval</small></div>
     <div><span>03</span><strong>Verify your work email</strong><small>After approval, activate admin access through email OTP</small></div>
    </div>
    <div className="onboard-safe"><ShieldCheck size={21}/><span>Submitting a request does not create an account, authorize a company or share your information with other applicants.</span></div>
   </aside>
   <section className="onboard-card">
    {done?<div className="onboard-success" role="status"><span className="onboard-success-icon"><CheckCircle2 size={34}/></span><span className="onboard-eyebrow">REQUEST RECEIVED</span><h2>Your application is in the review queue.</h2><p>We have your organization’s request. A platform administrator will review the work domain and contact details. Approval is not automatic, and no account has been created yet.</p><div className="onboard-success-details"><strong>What happens next?</strong><span>If approved, the nominated contact can join using their verified work email. Contact your platform team for the application status.</span></div><Link href="/" className="onboard-submit">Return to home <ArrowRight size={18}/></Link></div>:
    <>
     <div className="onboard-card-head"><span className="onboard-card-icon"><Building2 size={24}/></span><div><small>NEW ORGANIZATION</small><h2>Register your company</h2><p>Complete this form to request review.</p></div></div>
     <form className="onboard-form" onSubmit={submit}>
      <div className="onboard-form-section">Company information</div>
      <label className="onboard-full">Organization name <input required minLength={3} maxLength={160} autoComplete="organization" value={form.organization_name} placeholder="e.g., Acme Technologies Pvt. Ltd." onChange={e=>patch("organization_name",e.target.value)}/></label>
      <label>Company work domain <input required type="text" maxLength={255} value={form.domain} placeholder="acme.com" onChange={e=>patch("domain",e.target.value)}/><small>Must match the contact email domain.</small></label>
      <label>Official website (optional) <input type="url" maxLength={300} value={form.website} placeholder="https://acme.com" onChange={e=>patch("website",e.target.value)}/></label>
      <label>Country <select required value={form.country_code} onChange={e=>patch("country_code",e.target.value)}>{countries.map(([code,name])=><option key={code} value={code}>{name}</option>)}</select></label>
      <label>City <input required minLength={2} maxLength={100} autoComplete="address-level2" value={form.city} placeholder="Ahmedabad" onChange={e=>patch("city",e.target.value)}/></label>
      <label className="onboard-full">Approximate team size <select required value={form.employee_band} onChange={e=>patch("employee_band",e.target.value)}><option value="1-50">1–50 employees</option><option value="51-200">51–200 employees</option><option value="201-1000">201–1,000 employees</option><option value="1000+">1,000+ employees</option></select></label>
      <div className="onboard-form-section">Nominated company administrator</div>
      <label>Full name <input required minLength={2} maxLength={100} autoComplete="name" value={form.contact_name} placeholder="Full name" onChange={e=>patch("contact_name",e.target.value)}/></label>
      <label>Company work email <input required type="email" maxLength={255} autoComplete="email" value={form.contact_email} placeholder="name@acme.com" onChange={e=>patch("contact_email",e.target.value)}/></label>
      <label className="onboard-full">What would you like to achieve? (optional) <textarea value={form.message} maxLength={2000} rows={3} placeholder="Tell us about your volunteering or CSR programme." onChange={e=>patch("message",e.target.value)}/></label>
      <div className="onboard-honeypot" aria-hidden="true"><label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={form.website_confirmation} onChange={e=>patch("website_confirmation",e.target.value)}/></label></div>
      <p className="onboard-disclaimer"><LockKeyhole size={16}/> Applications are reviewed manually. Your nominated admin must verify the work email before receiving access. No public company profile is created from this form.</p>
      {error&&<p className="onboard-error" role="alert">{error}</p>}
      <button className="onboard-submit" type="submit" disabled={busy}>{busy?"Submitting application…":"Submit for admin review"}<ArrowRight size={17}/></button>
     </form>
    </>}
   </section>
  </main>
  <footer className="onboard-footer"><span>© {new Date().getFullYear()} Elixir Foundation</span><span><UsersRound size={15}/> People · Purpose · Progress</span></footer>
 </div>;
}
