import {chromium} from "playwright";
import pg from "pg";
import {randomUUID,scrypt as scryptCallback,randomBytes} from "node:crypto";
import {promisify} from "node:util";
import assert from "node:assert/strict";

// Browser/auth/permissions test on disposable GitHub Actions PostgreSQL only.
// Never point this script at Railway, Vercel, or other persistent databases.
const url=process.env.CI_DATABASE_URL||"";
const parsed=url?new URL(url):null;
if(process.env.CI!=="true"||!parsed||!["localhost","127.0.0.1"].includes(parsed.hostname)||
 process.env.ALLOW_INSECURE_STAGING_DB!=="true"){
 throw new Error("Refused: CI-only disposable loopback PostgreSQL required");
}
const base=process.env.BASE_URL||"http://127.0.0.1:3001";
const db=new pg.Client({connectionString:url,ssl:false,connectionTimeoutMillis:10000});
const hash=async pw=>{
 const salt=randomBytes(16).toString("hex");
 return "scrypt:"+salt+":"+(await promisify(scryptCallback)(pw,salt,64)).toString("hex");
};
const pass="CI-audit-strong-password-2026";
const suffix=randomUUID().slice(0,12);
const ids={
 orgA:"audit-org-a-"+suffix,orgB:"audit-org-b-"+suffix,
 root:"audit-root-"+suffix,countryA:"audit-country-a-"+suffix,countryB:"audit-country-b-"+suffix,
 stateA:"audit-state-admin-"+suffix,employeeA:"audit-employee-a-"+suffix,
 employeeOther:"audit-employee-other-"+suffix,employeeB:"audit-employee-b-"+suffix,
 stateGJ:"audit-state-gj-"+suffix,stateMH:"audit-state-mh-"+suffix,stateB:"audit-state-b-"+suffix,
 branchGJ:"audit-branch-gj-"+suffix,branchMH:"audit-branch-mh-"+suffix,branchB:"audit-branch-b-"+suffix,
 eventA:"audit-event-a-"+suffix,eventB:"audit-event-b-"+suffix,pastA:"audit-past-a-"+suffix,
 certA:randomUUID()
};
const email={
 root:"root-"+suffix+"@audit.example",
 countryA:"country-a-"+suffix+"@audit.example",
 countryB:"country-b-"+suffix+"@audit.example",
 stateA:"state-a-"+suffix+"@audit.example",
 employeeA:"employee-a-"+suffix+"@audit.example",
 employeeOther:"employee-other-"+suffix+"@audit.example",
 employeeB:"employee-b-"+suffix+"@audit.example"
};
const now=Date.now();
const iso=days=>new Date(now+days*86400000).toISOString();
function eventPayload(id,companyId,createdBy,title,days){
 return {id,companyId,createdBy,title,summary:"CI test only",description:"Disposable access test event",category:"Volunteering",format:"in_person",location:"Ahmedabad",onlineLink:"",startsAt:iso(days),endsAt:iso(days+0.15),capacity:20,deadline:iso(days-1),contactEmail:"admin@audit.example",status:"published",cancellationReason:"",waitlistEnabled:true,primarySdg:4};
}
async function insertUser(id,fullName,account,role,org){
 await db.query("INSERT INTO users(id,full_name,email,password_hash,role,organization_id,verified,status) VALUES($1,$2,$3,$4,$5,$6,true,'active')",[id,fullName,account,await hash(pass),role,org]);
}
async function insertMembership(uid,org,state,branch,level){
 await db.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,state_id,branch_id,level) VALUES($1,$2,'IN',$3,$4,$5)",[uid,org,state,branch,level]);
}
async function insertEvent(id,org,creator,title,days){
 const payload=eventPayload(id,org,creator,title,days);
 await db.query("INSERT INTO events(id,organization_id,created_by,title,status,starts_at,ends_at,capacity,payload) VALUES($1,$2,$3,$4,'published',$5,$6,20,$7::jsonb)",[id,org,creator,title,payload.startsAt,payload.endsAt,JSON.stringify(payload)]);
}
async function seed(){
 await db.query("INSERT INTO organizations(id,name) VALUES($1,$2),($3,$4)",[ids.orgA,"Audit Organization A",ids.orgB,"Audit Organization B"]);
 await db.query("INSERT INTO v3_countries(organization_id,code,name) VALUES($1,'IN','India'),($2,'IN','India')",[ids.orgA,ids.orgB]);
 await db.query("INSERT INTO v3_states(id,organization_id,country_code,name) VALUES($1,$3,'IN','Gujarat'),($2,$3,'IN','Maharashtra'),($4,$5,'IN','Gujarat')",[ids.stateGJ,ids.stateMH,ids.orgA,ids.stateB,ids.orgB]);
 await db.query("INSERT INTO v3_branches(id,organization_id,country_code,state_id,name) VALUES($1,$3,'IN',$4,'Ahmedabad'),($2,$3,'IN',$5,'Mumbai'),($6,$7,'IN',$8,'Vadodara')",[ids.branchGJ,ids.branchMH,ids.orgA,ids.stateGJ,ids.stateMH,ids.branchB,ids.orgB,ids.stateB]);
 await insertUser(ids.root,"CI Root",email.root,"platform_admin",null);
 await insertUser(ids.countryA,"CI Country A",email.countryA,"company_admin",ids.orgA);
 await insertUser(ids.countryB,"CI Country B",email.countryB,"company_admin",ids.orgB);
 await insertUser(ids.stateA,"CI State A",email.stateA,"employee",ids.orgA);
 await insertUser(ids.employeeA,"CI Employee Gujarat",email.employeeA,"employee",ids.orgA);
 await insertUser(ids.employeeOther,"CI Employee Maharashtra",email.employeeOther,"employee",ids.orgA);
 await insertUser(ids.employeeB,"CI Employee Other Company",email.employeeB,"employee",ids.orgB);
 await insertMembership(ids.countryA,ids.orgA,null,null,"country_admin");
 await insertMembership(ids.countryB,ids.orgB,null,null,"country_admin");
 await insertMembership(ids.stateA,ids.orgA,ids.stateGJ,null,"state_admin");
 await insertMembership(ids.employeeA,ids.orgA,ids.stateGJ,ids.branchGJ,"employee");
 await insertMembership(ids.employeeOther,ids.orgA,ids.stateMH,ids.branchMH,"employee");
 await insertMembership(ids.employeeB,ids.orgB,ids.stateB,ids.branchB,"employee");
 await insertEvent(ids.eventA,ids.orgA,ids.countryA,"Gujarat-only CI Event",5);
 await insertEvent(ids.eventB,ids.orgB,ids.countryB,"Other Company CI Event",5);
 await insertEvent(ids.pastA,ids.orgA,ids.countryA,"Completed CI Event",-5);
 await db.query("INSERT INTO event_audiences(event_id,organization_id,audience,country_code,state_id,branch_id,updated_by) VALUES($1,$2,'branch','IN',$3,$4,$5)",[ids.eventA,ids.orgA,ids.stateGJ,ids.branchGJ,ids.countryA]);
 await db.query("INSERT INTO registrations(id,event_id,user_id,status) VALUES($1,$2,$3,'going')",[randomUUID(),ids.pastA,ids.employeeA]);
 await db.query("INSERT INTO event_attendance(event_id,user_id,status,verified_by) VALUES($1,$2,'present',$3)",[ids.pastA,ids.employeeA,ids.countryA]);
 await db.query("INSERT INTO v3_contributions(event_id,user_id,volunteer_minutes,contribution,verified_by) VALUES($1,$2,120,'CI verified attendance',$3)",[ids.pastA,ids.employeeA,ids.countryA]);
 await db.query("INSERT INTO volunteer_certificates(id,event_id,user_id,certificate_number,issued_by) VALUES($1,$2,$3,$4,$5)",[ids.certA,ids.pastA,ids.employeeA,"CI-"+suffix,ids.countryA]);
}
async function clean(){
 // CI database is disposable; delete specific test fixture in FK-safe order only.
 const q=async(sql,args)=>db.query(sql,args);
 const ev=[ids.eventA,ids.eventB,ids.pastA],users=[ids.root,ids.countryA,ids.countryB,ids.stateA,ids.employeeA,ids.employeeOther,ids.employeeB];
 await q("DELETE FROM sessions WHERE user_id=ANY($1::text[])",[users]);
 await q("DELETE FROM volunteer_certificates WHERE event_id=ANY($1::text[])",[ev]);
 await q("DELETE FROM event_attendance WHERE event_id=ANY($1::text[])",[ev]);
 await q("DELETE FROM v3_contributions WHERE event_id=ANY($1::text[])",[ev]);
 await q("DELETE FROM registrations WHERE event_id=ANY($1::text[])",[ev]);
 await q("DELETE FROM event_audiences WHERE event_id=ANY($1::text[])",[ev]);
 await q("DELETE FROM events WHERE id=ANY($1::text[])",[ev]);
 await q("DELETE FROM v3_memberships WHERE user_id=ANY($1::text[])",[users]);
 await q("DELETE FROM audit_logs WHERE actor_user_id=ANY($1::text[]) OR organization_id=ANY($2::text[])",[users,[ids.orgA,ids.orgB]]);
 await q("DELETE FROM users WHERE id=ANY($1::text[])",[users]);
 await q("DELETE FROM v3_branches WHERE id=ANY($1::text[])",[[ids.branchGJ,ids.branchMH,ids.branchB]]);
 await q("DELETE FROM v3_states WHERE id=ANY($1::text[])",[[ids.stateGJ,ids.stateMH,ids.stateB]]);
 await q("DELETE FROM v3_countries WHERE organization_id=ANY($1::text[])",[[ids.orgA,ids.orgB]]);
 await q("DELETE FROM organizations WHERE id=ANY($1::text[])",[[ids.orgA,ids.orgB]]);
}
let browser,seeded=false;
try{
 await db.connect();
 await seed();seeded=true;
 browser=await chromium.launch({headless:true});
 const visitor=await browser.newPage({viewport:{width:390,height:844}});
 await visitor.goto(base+"/",{waitUntil:"domcontentloaded"});
 await visitor.getByRole("link",{name:/Register company/i}).first().waitFor();
 assert.equal(await visitor.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),true,"public landing mobile overflow");
 await visitor.goto(base+"/companies/register",{waitUntil:"domcontentloaded"});
 await visitor.getByRole("heading",{name:"Register your company"}).waitFor();
 assert.equal(await visitor.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),true,"company registration mobile overflow");
 await visitor.close();
 const accounts=[
  {name:"root",email:email.root,orgs:2,events:3},
  {name:"country A",email:email.countryA,orgs:1,events:2},
  {name:"state A",email:email.stateA,orgs:1,events:1},
  {name:"Gujarat employee",email:email.employeeA,orgs:1,events:2},
  {name:"Maharashtra employee",email:email.employeeOther,orgs:1,events:1},
  {name:"company B employee",email:email.employeeB,orgs:1,events:1}
 ];
 for(const account of accounts){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto(base+"/?auth=login",{waitUntil:"domcontentloaded"});
  await page.locator('input[autocomplete="username"]').fill(account.email);
  await page.locator('input[autocomplete="current-password"]').fill(pass);
  await page.locator(".ep-auth-submit").click();
  await page.locator(".ep-shell .ep-main").waitFor({timeout:25000});
  const snapshot=await context.request.get(base+"/api/portal");
  assert.equal(snapshot.status(),200,account.name+" session");
  const result=await snapshot.json();
  assert.equal(result.data?.companies?.length,account.orgs,account.name+" companies");
  assert.equal(result.data?.events?.length,account.events,account.name+" permitted events");
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),true,account.name+" mobile overflow");
  if(account.name==="root"){
   const unauthorized=await context.request.get(base+"/api/impact");
   assert.equal(unauthorized.status(),404,"root cannot enter scoped CSR workspace");
   const privateCert=await context.request.get(base+"/certificates/"+ids.certA);
   assert.equal(privateCert.status(),404,"root may not fetch employee certificate");
   const applicationDomain="company-"+suffix+".example",applicationEmail="director@"+applicationDomain;
   const application=await context.request.post(base+"/api/company-applications",{
    headers:{Origin:base},data:{organization_name:"CI Volunteer Company",domain:applicationDomain,contact_name:"Demo Company Owner",contact_email:applicationEmail,country_code:"IN",city:"Ahmedabad",employee_band:"51-200",message:"Disposable CI registration test"}
   });
   assert.equal(application.status(),202,"public company application can be submitted");
   const queue=await context.request.get(base+"/api/company-applications");
   assert.equal(queue.status(),200,"root sees new applications");
   const rows=(await queue.json()).applications;
   const pending=rows.find(x=>x.domain===applicationDomain&&x.status==="pending");
   assert.ok(pending,"pending request is visible to root");
   await page.goto(base+"/admin/company-requests");
   await page.getByRole("heading",{name:"Company applications"}).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),true,"root review mobile overflow");
   assert.ok(await page.getByText("CI Volunteer Company").count()>=1,"root queue displays applicant");

   const refused=await context.request.patch(base+"/api/company-applications",{headers:{Origin:base},data:{id:pending.id,decision:"approved",review_note:"Verified CI request only",confirmOwnership:false}});
   assert.equal(refused.status(),400,"approval requires independent ownership confirmation");
   const approved=await context.request.patch(base+"/api/company-applications",{headers:{Origin:base},data:{id:pending.id,decision:"approved",review_note:"CI fixture: company details independently checked",confirmOwnership:true}});
   assert.equal(approved.status(),200,"root approves request");
   const org=(await db.query("SELECT o.id FROM organizations o JOIN organization_domains d ON d.organization_id=o.id WHERE d.domain=$1",[applicationDomain])).rows[0];
   assert.ok(org,"workspace created on approval");
   const invited=(await db.query("SELECT id FROM invitations WHERE email=$1 AND organization_id=$2 AND accepted=false",[applicationEmail,org.id])).rowCount;
   assert.equal(invited,1,"admin is invited but not automatically activated");
   const promoted=(await db.query("SELECT count(*)::int AS n FROM users WHERE email=$1",[applicationEmail])).rows[0].n;
   assert.equal(promoted,0,"unverified contact is not provisioned");
   await db.query("DELETE FROM invitations WHERE email=$1 AND organization_id=$2",[applicationEmail,org.id]);
   await db.query("DELETE FROM audit_logs WHERE organization_id=$1",[org.id]);
   await db.query("DELETE FROM company_applications WHERE id=$1",[pending.id]);
   await db.query("DELETE FROM v3_countries WHERE organization_id=$1",[org.id]);
   await db.query("DELETE FROM organization_domains WHERE organization_id=$1",[org.id]);
   await db.query("DELETE FROM organizations WHERE id=$1",[org.id]);
  }else{
   const csr=await context.request.get(base+"/api/impact");
   assert.equal(csr.status(),200,account.name+" CSR scope");
   if(!["country A","state A"].includes(account.name)){
    const unauthorized=await context.request.post(base+"/api/impact",{data:{action:"createCampaign",title:"Unapproved campaign",starts_on:"2027-01-01",ends_on:"2027-01-02"},headers:{Origin:base}});
    assert.equal(unauthorized.status(),403,account.name+" cannot create campaign");
   }
   const cert=await context.request.get(base+"/certificates/"+ids.certA);
   assert.equal(cert.status(),account.name==="Gujarat employee"?200:404,account.name+" certificate isolation");
   if(account.name==="Gujarat employee"){
    const pageResult=await page.goto(base+"/impact");
    assert.equal(pageResult?.status(),200,"CSR page renders");
    await page.getByRole("heading",{name:"CSR & volunteer impact"}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),true,"CSR mobile overflow");
    const reg=await context.request.post(base+"/api/portal",{data:{action:"register",args:{eventId:ids.eventA}},headers:{Origin:base}});
    assert.equal(reg.status(),200,"eligible employee registers to branch event");
   }
   if(account.name==="Maharashtra employee"){
    const reg=await context.request.post(base+"/api/portal",{data:{action:"register",args:{eventId:ids.eventA}},headers:{Origin:base}});
    assert.equal(reg.status(),403,"different-branch employee denied RSVP");
   }
   if(account.name==="company B employee"){
    const reg=await context.request.post(base+"/api/portal",{data:{action:"register",args:{eventId:ids.eventA}},headers:{Origin:base}});
    assert.equal(reg.status(),403,"cross-organization registration denied");
   }
   if(account.name==="state A"){
    const hierarchy=await context.request.get(base+"/api/v3");
    assert.equal(hierarchy.status(),200,"state hierarchy access");
    const data=await hierarchy.json();
    assert.ok(data.members.every(member=>member.state_id===ids.stateGJ),"state-level member visibility");
   }
  }
  assert.deepEqual(errors,[],account.name+" browser exceptions");
  await context.close();
  console.log("PASS database-backed browser:",account.name);
 }
 console.log("Database-backed authentication, event isolation, CSR visibility, certificates, and responsive audit passed.");
}finally{
 await browser?.close().catch(()=>{});
 if(seeded)await clean().catch(error=>{console.error("CI cleanup failed",error.message);process.exitCode=1;});
 await db.end().catch(()=>{});
}
