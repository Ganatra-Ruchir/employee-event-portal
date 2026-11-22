import pg from "pg";
import {randomBytes,scrypt as scryptCallback} from "node:crypto";
import {promisify} from "node:util";

// One-time fictional dataset for the isolated Railway staging project.
// Credentials are passed ONLY as an ephemeral Railway environment variable.
// All row IDs begin with "demo-v4-"; never invoke against a live customer DB.
const PROJECT="e0160026-4cdb-4ca6-9110-f4fc0ff2533f";
const url=process.env.DATABASE_URL||"";
const password=process.env.DEMO_SEED_PASSWORD||"";
const privateHost=url?new URL(url).hostname.endsWith(".railway.internal"):false;
if(process.env.ALLOW_DEMO_SEED!=="true" || process.env.PORTAL_STAGING_DATABASE_ONLY!=="true" ||
   process.env.RAILWAY_PROJECT_ID!==PROJECT ||
   process.env.PORTAL_APPROVED_STAGING_PROJECT_ID!==PROJECT ||
   !privateHost || password.length<20 || !/[A-Z]/.test(password)||!/[a-z]/.test(password)){
 console.error("Refused: isolated staging authorization, private database, and a strong DEMO_SEED_PASSWORD are required.");
 process.exit(1);
}
const db=new pg.Client({connectionString:url,ssl:false,connectionTimeoutMillis:10000});
const scrypt=promisify(scryptCallback);
const hash=async()=>{const salt=randomBytes(16).toString("hex"); const buf=await scrypt(password,salt,64);return "scrypt:"+salt+":"+buf.toString("hex");};
const orgs=[
 {slug:"elixir",name:"Elixir Foundation — DEMO",domain:"elixir.example",prefix:"ELX"},
 {slug:"micron",name:"Micron CSR — DEMO",domain:"micron.example",prefix:"MIC"},
 {slug:"microsoft",name:"Microsoft Giving — DEMO",domain:"microsoft.example",prefix:"MS"}
];
const first=["Aarav","Priya","Riya","Arjun","Neha","Kabir"];
const last=["Shah","Patel","Mehta","Joshi","Rao","Iyer"];
const roles=["Program Associate","Volunteer Coordinator","IT Analyst","CSR Associate","Operations Assistant","Community Facilitator"];
const departments=["CSR","Operations","IT","Community Programs","Human Resources","Outreach"];
const stateDefs=[{code:"gj",name:"Gujarat",city:"Ahmedabad"},{code:"mh",name:"Maharashtra",city:"Mumbai"}];
const stamp=(days,hour=10)=>{const d=new Date(Date.now()+days*86400000);d.setUTCHours(hour,0,0,0);return d.toISOString();};
const day=days=>stamp(days).slice(0,10);
let count={organizations:0,accounts:0,locations:0,events:0,registrations:0,attendances:0,certificates:0,campaigns:0,impact_records:0};
async function user(id,fullName,email,role,org,department,jobTitle){
 const res=await db.query("INSERT INTO users(id,full_name,email,password_hash,role,organization_id,department,job_title,verified,status,must_change_password,show_in_attendee_lists) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,'active',false,true) ON CONFLICT(id) DO NOTHING RETURNING id",
 [id,fullName,email,await hash(),role,org,department,jobTitle]);
 count.accounts+=res.rowCount;
}
async function membership(userId,org,country,state,branch,level){
 await db.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,state_id,branch_id,level) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id) DO NOTHING",[userId,org,country,state,branch,level]);
}
async function event({id,org,admin,title,summary,category,location,sdg,startsAt,endsAt,scope,branchId=null,stateId=null}){
 const payload={id,companyId:org,title,summary,description:summary+" Fictional volunteering activity for staging tests only.",category,format:"in_person",location,onlineLink:"",startsAt,endsAt,capacity:35,deadline:stamp(startsAt<new Date().toISOString()?-18:1),contactEmail:"demo@volunteer.example",status:"published",cancellationReason:"",createdBy:admin,primarySdg:sdg,waitlistEnabled:true,speakers:[]};
 // Avoid a past deadline and ensure test events' registration deadline is before start.
 payload.deadline=new Date(new Date(startsAt).getTime()-86400000).toISOString();
 const ins=await db.query("INSERT INTO events(id,organization_id,created_by,title,status,starts_at,ends_at,capacity,waitlist_enabled,payload) VALUES($1,$2,$3,$4,'published',$5,$6,35,true,$7::jsonb) ON CONFLICT(id) DO NOTHING RETURNING id",
 [id,org,admin,title,startsAt,endsAt,JSON.stringify(payload)]);
 count.events+=ins.rowCount;
 if(scope!=="company"){
  await db.query("INSERT INTO event_audiences(event_id,organization_id,audience,country_code,state_id,branch_id,updated_by) VALUES($1,$2,$3,'IN',$4,$5,$6) ON CONFLICT(event_id) DO NOTHING",[id,org,scope,stateId,branchId,admin]);
 }
}
async function register(eventId,userId){
 const id="demo-v4-reg-"+eventId.replace("demo-v4-event-","")+"-"+userId.replace("demo-v4-user-","");
 const res=await db.query("INSERT INTO registrations(id,event_id,user_id,status) VALUES($1,$2,$3,'going') ON CONFLICT(event_id,user_id) DO NOTHING RETURNING id",[id,eventId,userId]);
 count.registrations+=res.rowCount;
}
try{
 await db.connect();
 await db.query("BEGIN");
 const root="demo-v4-user-root";
 await user(root,"Demo Platform Administrator","root@volunteer-demo.example","platform_admin",null,"Platform Operations","Root Administrator");
 for(const org of orgs){
  const id="demo-v4-org-"+org.slug,admin="demo-v4-user-"+org.slug+"-country";
  const created=await db.query("INSERT INTO organizations(id,name) VALUES($1,$2) ON CONFLICT(id) DO NOTHING RETURNING id",[id,org.name]);count.organizations+=created.rowCount;
  await db.query("INSERT INTO organization_domains(domain,organization_id) VALUES($1,$2) ON CONFLICT(domain) DO NOTHING",[org.domain,id]);
  await db.query("INSERT INTO v3_countries(organization_id,code,name) VALUES($1,'IN','India') ON CONFLICT DO NOTHING",[id]);
  await user(admin,org.prefix+" Demo Country Admin","country@"+org.domain,"company_admin",id,"CSR Leadership","Country Administrator");
  await membership(admin,id,"IN",null,null,"country_admin");
  const all=[];
  for(const [index,def] of stateDefs.entries()){
   const stId="demo-v4-state-"+org.slug+"-"+def.code,branchId="demo-v4-branch-"+org.slug+"-"+def.code,stAdmin="demo-v4-user-"+org.slug+"-"+def.code+"-admin";
   await db.query("INSERT INTO v3_states(id,organization_id,country_code,name) VALUES($1,$2,'IN',$3) ON CONFLICT(id) DO NOTHING",[stId,id,def.name]);
   await db.query("INSERT INTO v3_branches(id,organization_id,country_code,state_id,name) VALUES($1,$2,'IN',$3,$4) ON CONFLICT(id) DO NOTHING",[branchId,id,stId,def.city+" Demo Branch"]);
   count.locations+=1;
   await user(stAdmin,org.prefix+" "+def.name+" Demo Admin","state."+def.code+"@"+org.domain,"employee",id,"CSR Operations","State Administrator");
   await membership(stAdmin,id,"IN",stId,null,"state_admin");
   for(let n=0;n<3;n++){
    const k=index*3+n,userId="demo-v4-user-"+org.slug+"-"+def.code+"-"+(n+1),name=first[k]+" "+last[k];
    await user(userId,name,"employee."+def.code+(n+1)+"@"+org.domain,"employee",id,departments[k],roles[k]);
    await membership(userId,id,"IN",stId,branchId,"employee");
    all.push({id:userId,state:def.code,branch:branchId});
   }
  }
  const past="demo-v4-event-"+org.slug+"-past",company="demo-v4-event-"+org.slug+"-all",state="demo-v4-event-"+org.slug+"-gujarat",branch="demo-v4-event-"+org.slug+"-mumbai";
  await event({id:past,org:id,admin,title:"Community Digital Literacy Day — DEMO",summary:"Teach foundational digital skills to community learners",category:"Education",location:"Ahmedabad, Gujarat",sdg:4,startsAt:stamp(-12),endsAt:stamp(-12,14),scope:"company"});
  await event({id:company,org:id,admin,title:"Volunteer Orientation & CSR Drive — DEMO",summary:"Upcoming company-wide volunteering orientation",category:"Volunteering",location:"Ahmedabad, Gujarat",sdg:17,startsAt:stamp(5),endsAt:stamp(5,14),scope:"company"});
  await event({id:state,org:id,admin,title:"Gujarat Community Health Camp — DEMO",summary:"Gujarat-only employee volunteering opportunity",category:"Health",location:"Ahmedabad, Gujarat",sdg:3,startsAt:stamp(10),endsAt:stamp(10,14),scope:"state",stateId:"demo-v4-state-"+org.slug+"-gj"});
  await event({id:branch,org:id,admin,title:"Mumbai Tree Plantation — DEMO",summary:"Mumbai branch-only environmental volunteering opportunity",category:"Environment",location:"Mumbai, Maharashtra",sdg:13,startsAt:stamp(16),endsAt:stamp(16,13),scope:"branch",stateId:"demo-v4-state-"+org.slug+"-mh",branchId:"demo-v4-branch-"+org.slug+"-mh"});
  for(const item of all.slice(0,4))await register(past,item.id);
  for(const item of all.slice(0,5))await register(company,item.id);
  for(const item of all.filter(x=>x.state==="gj").slice(0,2))await register(state,item.id);
  for(const item of all.filter(x=>x.state==="mh").slice(0,2))await register(branch,item.id);
  for(let i=0;i<4;i++){
   const person=all[i];
   const status=i===3?"absent":"present";
   const att=await db.query("INSERT INTO event_attendance(event_id,user_id,status,verified_by) VALUES($1,$2,$3,$4) ON CONFLICT(event_id,user_id) DO NOTHING RETURNING event_id",[past,person.id,status,admin]);count.attendances+=att.rowCount;
   if(status==="present"){
    const minutes=180+i*30;
    await db.query("INSERT INTO v3_contributions(event_id,user_id,volunteer_minutes,contribution,verified_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id,user_id) DO NOTHING",[past,person.id,minutes,"Mentored participants at a fictional digital literacy event",admin]);
    await db.query("INSERT INTO event_feedback(event_id,user_id,rating,comments) VALUES($1,$2,$3,$4) ON CONFLICT(event_id,user_id) DO NOTHING",[past,person.id,5-i,"DEMO: Engaging community session"]);
    if(i===0){
      const cert=await db.query("INSERT INTO volunteer_certificates(id,event_id,user_id,certificate_number,issued_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id,user_id) DO NOTHING RETURNING id",
       ["demo-v4-cert-"+org.slug,past,person.id,"DEMO-"+org.prefix+"-VOL-2026",admin]);count.certificates+=cert.rowCount;
    }
   }
  }
  const partner="demo-v4-partner-"+org.slug,campaign="demo-v4-campaign-"+org.slug;
  await db.query("INSERT INTO csr_partners(id,organization_id,name,kind,contact_email,status,created_by,verified_by,verified_at) VALUES($1,$2,$3,'ngo',$4,'verified',$5,$6,now()) ON CONFLICT(id) DO NOTHING",
  [partner,id,"Community Learning Collective — DEMO ("+org.prefix+")","partner@volunteer-demo.example",admin,root]);
  const camp=await db.query("INSERT INTO csr_campaigns(id,organization_id,country_code,partner_id,title,description,primary_sdg,starts_on,ends_on,budget_inr,target_beneficiaries,status,created_by) VALUES($1,$2,'IN',$3,$4,$5,4,$6,$7,15000,200,'active',$8) ON CONFLICT(id) DO NOTHING RETURNING id",
  [campaign,id,"Digital Inclusion Campaign — DEMO","Fictional annual corporate volunteering campaign",day(-30),day(90),admin]);count.campaigns+=camp.rowCount;
  await db.query("INSERT INTO csr_campaign_events(campaign_id,event_id,organization_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",[campaign,past,id]);
  for(const [i,metric,val] of [["reach","beneficiaries_reached",140],["sessions","sessions_delivered",4],["hours","volunteer_hours",11.25]]){
   const r=await db.query("INSERT INTO csr_impact_records(id,organization_id,campaign_id,event_id,metric,metric_label,value,period_start,period_end,evidence_reference,status,recorded_by,verified_by,verified_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'verified',$11,$12,now()) ON CONFLICT(id) DO NOTHING RETURNING id",
   ["demo-v4-impact-"+org.slug+"-"+i,id,campaign,past,metric,metric.replaceAll("_"," "),val,day(-30),day(-1),"DEMO-EVIDENCE-NOT-REAL",all[0].id,admin]);count.impact_records+=r.rowCount;
  }
 }
 await db.query("COMMIT");
 console.log("FICTIONAL_SEED_RESULT "+JSON.stringify(count));
 console.log("Seeded demo-only emails under .example, no messages or invitations sent.");
}catch(err){
 await db.query("ROLLBACK").catch(()=>{});
 console.error("Fictional staging seed failed:",err instanceof Error?err.message:"unknown");
 process.exitCode=1;
}finally{await db.end().catch(()=>{});}
