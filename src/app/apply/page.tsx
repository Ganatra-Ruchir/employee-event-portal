"use client";
import {useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Building2,CheckCircle2,HeartHandshake} from "lucide-react";
import "../landing.css";
import "../theme.css";
import "../signup/signup.css";
export default function CompanyApplicationPage(){
 const [form,setForm]=useState({organizationName:"",website:"",contactName:"",contactEmail:"",phone:"",workDomain:"",employeeCount:"",message:""});
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[done,setDone]=useState(false);
 function update(key:keyof typeof form,value:string){setForm(v=>({...v,[key]:value}));}
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");try{
  const r=await fetch("/api/company-applications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});const j=await r.json();
  if(!r.ok)throw Error(j.error||"Unable to submit application");setDone(true);
 }catch(e){setError(e instanceof Error?e.message:"Unable to submit");}finally{setBusy(false);}}
 return <main className="landing landing-editorial" style={{minHeight:"100vh"}}>
 <header className="landing-header" aria-label="Site navigation"><Link href="/" className="landing-brand" style={{textDecoration:"none"}}><span className="landing-mark">E</span><span>Employee <span className="landing-brand-light">Volunteer System</span></span></Link><nav className="landing-nav"><Link href="/" className="landing-login"><ArrowLeft size={15}/> Home</Link><Link href="/login" className="landing-login">Log in</Link><Link href="/signup" className="landing-signup">Join your team <ArrowRight size={15}/></Link></nav></header>
 <div className="join-page" style={{background:"transparent",padding:"22px clamp(14px,4vw,65px) 48px"}}><div className="join-grid" style={{maxWidth:1150,margin:"auto"}}>
 <section className="join-panel" style={{borderRadius:22,padding:26}}>
 <small>PARTNER WITH US · EMPLOYEE VOLUNTEER SYSTEM</small><h1>Bring your company into the community.</h1><p>Apply for your organization&apos;s workspace. Our platform team reviews your details before activating access.</p>
 {done?<div className="join-done"><CheckCircle2 size={38}/><h2>Application submitted</h2><p>Your application is pending review. The team can contact you using your work email.</p><Link href="/">Return to home</Link></div>:
 <form onSubmit={submit}>
 <label>Organization name<input required minLength={3} maxLength={160} value={form.organizationName} onChange={e=>update("organizationName",e.target.value)} placeholder="Company name"/></label>
 <label>Company website<input type="url" maxLength={250} value={form.website} onChange={e=>update("website",e.target.value)} placeholder="https://company.com"/></label>
 <label>Contact person<input required minLength={2} maxLength={100} value={form.contactName} onChange={e=>update("contactName",e.target.value)} placeholder="Full name"/></label>
 <label>Official work email<input required type="email" maxLength={255} value={form.contactEmail} onChange={e=>update("contactEmail",e.target.value)} placeholder="contact@company.com"/></label>
 <label>Work email domain<input required maxLength={120} value={form.workDomain} onChange={e=>update("workDomain",e.target.value)} placeholder="company.com"/></label>
 <label>Phone number<input type="tel" maxLength={30} value={form.phone} onChange={e=>update("phone",e.target.value)} placeholder="+91 …"/></label>
 <label>Number of employees<select value={form.employeeCount} onChange={e=>update("employeeCount",e.target.value)}><option value="">Select range (optional)</option><option>1–50</option><option>51–250</option><option>251–1000</option><option>1000+</option></select></label>
 <label>What would your team like to achieve?<textarea rows={3} maxLength={1600} value={form.message} onChange={e=>update("message",e.target.value)} placeholder="Volunteering goals and planned events"/></label>
 {error&&<p role="alert" className="join-feedback">{error}</p>}
 <button disabled={busy} type="submit">{busy?"Submitting…":"Submit company application"} <ArrowRight size={16}/></button>
 </form>}
 </section>
 <aside className="join-panel join-aside" style={{borderRadius:22}}><Building2 size={35}/><h2>One connected volunteer experience.</h2><p>Employees, events, registrations, attendance and contribution insights in one branded workspace.</p><div className="join-tip"><HeartHandshake size={20}/> Your application does not create an active account automatically. The platform administrator must review it first.</div><Link href="/" style={{fontWeight:750}}>Explore the platform</Link></aside>
 </div></div><footer className="landing-footer-new cc-landing-footer"><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} Elixir Foundation</span><span>Made for meaningful connections</span></div></footer></main>;
}
