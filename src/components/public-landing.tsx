"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,BarChart3,CalendarCheck2,CheckCircle2,Globe2,HeartHandshake,Leaf,ShieldCheck,Sparkles,UsersRound,Building2,MapPin,ClipboardCheck,LockKeyhole,LineChart,PlayCircle} from "lucide-react";
import {LandingArtwork} from "@/components/landing-artwork";

const themes=[
 {label:"Community & environment",detail:"Move local causes forward, together.",scene:"impact" as const,icon:Leaf},
 {label:"Learning & mentoring",detail:"Share skills that create opportunity.",scene:"learn" as const,icon:Sparkles},
 {label:"People & belonging",detail:"Find purpose with your colleagues.",scene:"celebrate" as const,icon:UsersRound},
 {label:"Health & wellbeing",detail:"Show up for healthier communities.",scene:"wellness" as const,icon:HeartHandshake}
];
const journey=[
 {number:"01",icon:Building2,title:"Create your company space",detail:"Apply with your work domain. Our platform admin reviews your request before access is granted."},
 {number:"02",icon:CalendarCheck2,title:"Bring your people together",detail:"Publish opportunities, invite teams and keep registrations in one clear place."},
 {number:"03",icon:BarChart3,title:"Make impact measurable",detail:"Verify attendance, capture volunteer hours and see the difference in your dashboard."}
];
const bars=[{m:"Jul",h:37},{m:"Aug",h:66},{m:"Sep",h:49},{m:"Oct",h:83},{m:"Nov",h:75},{m:"Dec",h:100}];
export default function PublicLanding({onEnter}:{onEnter:()=>void}){
 const [view,setView]=useState<"teams"|"impact">("teams");
 useEffect(()=>{
  const elements=[...document.querySelectorAll<HTMLElement>(".evs-reveal")];
  if(!("IntersectionObserver" in window))return;
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add("evs-shown");observer.unobserve(entry.target);}
  },{threshold:.08,rootMargin:"0px 0px -25px 0px"});
  elements.forEach(node=>observer.observe(node));
  document.documentElement.classList.add("evs-motion");
  return ()=>{observer.disconnect();document.documentElement.classList.remove("evs-motion");};
 },[]);
 return <div className="evs-home">
  <header className="evs-header">
   <Link href="/" className="evs-brand" aria-label="Employee Volunteer System home">
    <span className="evs-symbol">E<span>·</span></span>
    <span className="evs-wordmark">Employee <strong>Volunteer System</strong><small>BY ELIXIR FOUNDATION</small></span>
   </Link>
   <nav aria-label="Main navigation" className="evs-nav">
    <a href="#how-it-works">How it works</a>
    <a href="#experiences">Opportunities</a>
    <button type="button" onClick={onEnter}>Sign in</button>
    <Link className="evs-nav-apply" href="/companies/register">Register company <ArrowUpRight size={16}/></Link>
   </nav>
  </header>
  <main>
   <section className="evs-hero">
    <div className="evs-hero-orb evs-orb-a" aria-hidden="true"/>
    <div className="evs-hero-orb evs-orb-b" aria-hidden="true"/>
    <div className="evs-hero-layout">
     <div className="evs-hero-copy evs-reveal">
      <div className="evs-eyebrow"><span/> ONE PLACE FOR PURPOSE-DRIVEN TEAMS</div>
      <h1>Good things happen <em>when we show up.</em></h1>
      <p>Bring employees, companies and communities together through meaningful volunteering — from the first sign-up to verified impact.</p>
      <div className="evs-actions"><Link href="/companies/register" className="evs-button evs-button-primary">Register your company <ArrowRight size={18}/></Link><a href="#how-it-works" className="evs-button evs-button-secondary"><PlayCircle size={18}/> Explore the platform</a></div>
      <div className="evs-hero-foot"><span><ShieldCheck size={17}/> Admin-reviewed companies</span><span><CheckCircle2 size={17}/> Verified volunteer records</span></div>
     </div>
     <div className="evs-hero-preview evs-reveal" aria-label="Illustrative volunteer dashboard preview">
      <div className="evs-preview-float evs-float-left"><span className="evs-float-icon"><HeartHandshake size={20}/></span><strong>Make time for impact</strong><small>People, purpose, progress</small></div>
      <div className="evs-preview-window">
       <div className="evs-preview-head"><div className="evs-preview-logo">E</div><div><strong>Your volunteering space</strong><small>Illustrative preview · not live data</small></div><span className="evs-status-dot" aria-label="Example interface"/></div>
       <div className="evs-preview-toggle" role="group" aria-label="Preview dashboard mode">
        <button type="button" aria-pressed={view==="teams"} className={view==="teams"?"active":""} onClick={()=>setView("teams")}>Your team</button>
        <button type="button" aria-pressed={view==="impact"} className={view==="impact"?"active":""} onClick={()=>setView("impact")}>Impact view</button>
       </div>
       <div className="evs-preview-title"><div><small>{view==="teams"?"HELLO, YOUR TEAM":"MEASURE WHAT MATTERS"}</small><h2>{view==="teams"?"A place to do more good.":"Every effort adds up."}</h2></div><span className="evs-preview-trend"><ArrowUpRight size={15}/> Sample</span></div>
       <div className="evs-preview-metrics">
        {(view==="teams"?[["24","Opportunities"],["680","Hours logged"],["8","SDGs reached"]]:[["18","Events held"],["92%","Participation"],["680","Verified hours"]]).map(([n,label])=><div key={label}><strong>{n}</strong><small>{label}</small></div>)}
       </div>
       <div className="evs-preview-insights">
        <div className="evs-preview-chart"><div className="evs-preview-chart-head"><strong>Volunteer activity</strong><small>6-month sample</small></div><div className="evs-sample-bars" role="img" aria-label="Illustrative monthly volunteer activity chart, July to December">{bars.map((bar,i)=><div className="evs-sample-column" key={bar.m}><div className="evs-sample-track"><div style={{height:bar.h+"%",animationDelay:i*90+"ms"}}/></div><small>{bar.m}</small></div>)}</div></div>
        <div className="evs-preview-side"><span className="evs-preview-donut" role="img" aria-label="Illustrative volunteering engagement chart"/><strong>Purpose in progress</strong><small>Celebrate what teams achieve together.</small></div>
       </div>
       <div className="evs-preview-event"><span><span className="evs-event-day">14</span><small>DEC</small></span><div><strong>Community Learning Drive</strong><small><MapPin size={12}/> Ahmedabad · Volunteer opportunity</small></div><span className="evs-event-tag">Upcoming</span></div>
      </div>
      <div className="evs-preview-float evs-float-right"><span className="evs-float-check"><CheckCircle2 size={22}/></span><div><strong>Hours verified</strong><small>Recognize every contribution</small></div></div>
     </div>
    </div>
    <div className="evs-hero-bottom"><span>CREATE OPPORTUNITIES</span><span>CONNECT YOUR PEOPLE</span><span>CELEBRATE IMPACT</span></div>
   </section>

   <section className="evs-why evs-section" id="how-it-works">
    <div className="evs-container">
     <div className="evs-section-title evs-reveal"><span className="evs-section-label">SIMPLE FROM THE START</span><h2>Everything your volunteering programme needs. <em>Nothing it doesn’t.</em></h2><p>Designed for employees who want to participate and teams who need to make participation easy.</p></div>
     <div className="evs-steps">{journey.map((step,i)=><article className="evs-step evs-reveal" key={step.number} style={{transitionDelay:i*80+"ms"}}><div className="evs-step-top"><span>{step.number} / 03</span><step.icon size={23}/></div><h3>{step.title}</h3><p>{step.detail}</p></article>)}</div>
    </div>
   </section>

   <section className="evs-experiences evs-section" id="experiences">
    <div className="evs-container">
     <div className="evs-section-title evs-section-split evs-reveal"><div><span className="evs-section-label">OPPORTUNITIES THAT CONNECT</span><h2>Make room for <em>every kind of good.</em></h2></div><p>Discover new experiences, learn together and support the causes your colleagues care about.</p></div>
     <div className="evs-experience-grid">{themes.map((theme,i)=><article className="evs-experience evs-reveal" style={{transitionDelay:i*70+"ms"}} key={theme.label}>
      <div className="evs-experience-image"><LandingArtwork scene={theme.scene}/><span><theme.icon size={19}/></span></div>
      <div className="evs-experience-copy"><small>0{i+1} / EXPERIENCE</small><h3>{theme.label}</h3><p>{theme.detail}</p></div>
     </article>)}</div>
    </div>
   </section>

   <section className="evs-measure evs-section">
    <div className="evs-container evs-measure-grid">
     <div className="evs-measure-copy evs-reveal"><span className="evs-section-label">BEYOND THE EVENT</span><h2>Turn participation into <em>meaningful progress.</em></h2><p>Keep registrations, attendance verification, volunteering hours and impact reporting connected — without juggling separate spreadsheets.</p>
      <ul><li><ClipboardCheck size={19}/> Attendance and volunteer-hour verification</li><li><LineChart size={19}/> Clear SDG and activity summaries</li><li><LockKeyhole size={19}/> Company, country and state-level access</li></ul>
     </div>
     <div className="evs-measure-surface evs-reveal"><div className="evs-measure-header"><span><BarChart3 size={19}/> IMPACT SNAPSHOT</span><small>Illustrative dashboard</small></div>
      <div className="evs-measure-numbers"><div><small>Engagement</small><strong>92<em>%</em></strong><span>Example participation rate</span></div><div><small>Hours contributed</small><strong>680<em>h</em></strong><span>Example verified hours</span></div></div>
      <div className="evs-measure-graph" role="img" aria-label="Illustrative monthly impact growth chart"><div className="evs-measure-axis"><span>HIGH</span><span>LOW</span></div><div className="evs-measure-columns">{bars.map((b,i)=><div key={b.m}><span style={{height:b.h+"%",transitionDelay:i*75+"ms"}}/><small>{b.m}</small></div>)}</div></div>
      <p><ShieldCheck size={16}/> Clearly distinguish verified figures from draft records</p>
     </div>
    </div>
   </section>

   <section className="evs-for-teams evs-section">
    <div className="evs-container">
     <div className="evs-section-title evs-reveal"><span className="evs-section-label">MADE FOR REAL WORKFLOWS</span><h2>One platform. <em>Everyone in sync.</em></h2></div>
     <div className="evs-audience-grid">
      <article className="evs-audience-card evs-reveal"><Building2 size={27}/><h3>For organizations</h3><p>Create a dedicated space for campaigns, teams, approvals and measurable impact.</p><Link href="/companies/register">Apply for access <ArrowRight size={17}/></Link></article>
      <article className="evs-audience-card evs-reveal"><UsersRound size={27}/><h3>For employees</h3><p>Discover events, register in seconds and keep your volunteering story together.</p><Link href="/signup">Join your workplace <ArrowRight size={17}/></Link></article>
      <article className="evs-audience-card evs-reveal"><Globe2 size={27}/><h3>For program admins</h3><p>Coordinate volunteering across locations, verify contributions and report with confidence.</p><button type="button" onClick={onEnter}>Open your workspace <ArrowRight size={17}/></button></article>
     </div>
    </div>
   </section>

   <section className="evs-final-cta"><div className="evs-final-glow" aria-hidden="true"/><div className="evs-container evs-final-content evs-reveal"><span>YOUR NEXT CHAPTER OF IMPACT</span><h2>Bring your people together around something meaningful.</h2><p>Register your company to start a volunteering programme, or sign in to explore your team’s opportunities.</p><div className="evs-actions"><Link href="/companies/register" className="evs-button evs-button-light">Register company <ArrowRight size={18}/></Link><button type="button" onClick={onEnter} className="evs-button evs-button-outline">Employee sign in <ArrowUpRight size={18}/></button></div></div></section>
  </main>
  <footer className="evs-footer"><div className="evs-container evs-footer-content"><div className="evs-footer-brand"><strong>Employee Volunteer System</strong><span>By Elixir Foundation · Created for meaningful connections.</span></div><div><Link href="/companies/register">Company registration</Link><Link href="/signup">Employee signup</Link><button onClick={onEnter}>Sign in</button></div></div><div className="evs-container evs-footer-bottom"><span>© {new Date().getFullYear()} Elixir Foundation</span><span>People · Purpose · Progress</span></div></footer>
 </div>;
}
