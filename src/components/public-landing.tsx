"use client";
import {ArrowRight,Users,HeartHandshake,BookOpen,Leaf,HeartPulse,ShieldCheck} from "lucide-react";
import Link from "next/link";
import {LandingArtwork} from "@/components/landing-artwork";

const curations=[
  {label:"Community impact",detail:"Volunteer and give back",scene:"impact" as const,icon:Leaf},
  {label:"Learning & ideas",detail:"Build something together",scene:"learn" as const,icon:BookOpen},
  {label:"People & culture",detail:"Celebrate shared moments",scene:"celebrate" as const,icon:Users},
  {label:"Wellbeing",detail:"Make time for wellness",scene:"wellness" as const,icon:HeartPulse}
];
export default function PublicLanding({onEnter}:{onEnter:()=>void}){
 return <div className="landing landing-editorial">
  <header className="landing-header" aria-label="Site navigation">
    <div className="landing-brand"><span className="landing-mark">e</span><span>elixir<span className="landing-brand-light">events</span></span></div>
    <nav className="landing-nav"><button onClick={()=>document.getElementById("experiences")?.scrollIntoView({behavior:"smooth"})} className="landing-login">Explore</button><button onClick={onEnter} className="landing-login">Log in</button><Link href="/signup" className="landing-signup">Join your team <ArrowRight size={15}/></Link></nav>
  </header>
  <main>
    <section className="landing-photo-hero" aria-labelledby="landing-hero-title">
      <div className="landing-hero-image" aria-hidden="true"/>
      <div className="landing-hero-sheen" aria-hidden="true"/>
      <div className="landing-hero-wrap">
        <div className="landing-hero-main">
          <span className="landing-overline"><span className="landing-overline-dot"/> CREATED FOR CONNECTION</span>
          <h1 id="landing-hero-title">More than events.<span>Moments that matter.</span></h1>
          <p>Discover the people, purpose and experiences that make your workplace a community.</p>
        </div>
        <div className="landing-glass-stamp"><span className="landing-glass-icon"><HeartHandshake size={25}/></span><div><strong>Come together.</strong><span>Connect · Learn · Make an impact</span></div></div>
      </div>
      <span className="landing-hero-index">ELIXIR FOUNDATION <span>—</span> EVENTS & EXPERIENCES</span>
    </section>
    <section className="landing-curations" id="experiences">
      <div className="landing-inner">
       <div className="landing-section-intro"><div><span className="landing-eyebrow">CURATED FOR EVERY TEAM</span><h2>Find your kind of experience.</h2><p>Meaningful ways to connect, grow and create lasting impact.</p></div></div>
       <div className="landing-curation-grid">
       {curations.map((item,i)=><article className="landing-curation" key={item.label} style={{animationDelay:`${i*85}ms`}}>
        <span className="landing-curation-visual"><LandingArtwork scene={item.scene}/><span className="landing-curation-icon"><item.icon size={19}/></span></span>
        <span className="landing-curation-number">0{i+1} / EXPERIENCE</span><strong>{item.label}</strong><span className="landing-curation-bottom">{item.detail}</span>
       </article>)}
       </div>
      </div>
    </section>
    <section className="landing-private-wrap"><div className="landing-private-note"><span className="landing-private-symbol"><ShieldCheck size={23}/></span><div><strong>For your organization</strong><span>Sign in to see your team’s events and registration options.</span></div></div></section>
  </main>
  <footer className="landing-footer-new cc-landing-footer"><div className="landing-footer-bottom"><span>© {new Date().getFullYear()} Elixir Foundation. All rights reserved.</span><span>Made for meaningful connections</span></div></footer>
 </div>;
}