import {randomUUID,createHash} from "node:crypto";
import assert from "node:assert/strict";
import pg from "pg";
const address=process.env.CI_TEST_DATABASE_URL;
if(process.env.CI!=="true"||!address)throw Error("CI database required");
const target=new URL(address);
if(!["127.0.0.1","localhost","::1"].includes(target.hostname)||target.pathname!=="/portal_test")throw Error("Only disposable localhost portal_test DB is allowed");
const base="http://127.0.0.1:3000",db=new pg.Client({connectionString:address,ssl:false});
const uuid=()=>randomUUID(),org=uuid(),root=uuid(),manager=uuid(),employee=uuid(),extra="EMP-"+uuid().toUpperCase(),event=uuid(),state=uuid(),branch=uuid();
const tokenRoot=uuid(),tokenManager=uuid();
async function api(path,init={}){const r=await fetch(base+path,init),j=await r.json();return {status:r.status,body:j};}
async function write(path,body,token){return api(path,{method:"POST",headers:{"Content-Type":"application/json","Origin":base,...(token?{"Cookie":"elixir_session="+token}:{})},body:JSON.stringify(body)});}
try{
 await db.connect();
 await db.query("INSERT INTO organizations(id,name) VALUES($1,'CI Event Company')",[org]);
 await db.query("INSERT INTO organization_domains(domain,organization_id) VALUES('ci-company.example',$1)",[org]);
 await db.query("INSERT INTO users(id,full_name,email,password_hash,role,verified) VALUES($1,'Platform CI Root','ci-root@example.org','test-hash','platform_admin',true)",[root]);
 for(const [id,name,role] of [[manager,"Country Manager","company_admin"],[employee,"Registered CI Employee","employee"],[extra,"Extra CI Employee","employee"]]){
  await db.query("INSERT INTO users(id,full_name,email,password_hash,role,organization_id,verified) VALUES($1,$2,$3,'test-hash',$4,$5,true)",[id,name,id.toLowerCase()+"@ci-company.example",role,org]);
 }
 await db.query("INSERT INTO v3_countries(organization_id,code,name) VALUES($1,'IN','India')",[org]);
 await db.query("INSERT INTO v3_states(id,organization_id,country_code,name) VALUES($1,$2,'IN','Gujarat')",[state,org]);
 await db.query("INSERT INTO v3_branches(id,organization_id,country_code,state_id,name) VALUES($1,$2,'IN',$3,'Ahmedabad')",[branch,org,state]);
 await db.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,level) VALUES($1,$2,'IN','country_admin')",[manager,org]);
 for(const userId of [employee,extra])await db.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,state_id,branch_id,level) VALUES($1,$2,'IN',$3,$4,'employee')",[userId,org,state,branch]);
 await db.query("INSERT INTO events(id,organization_id,created_by,title,status,starts_at,ends_at,capacity,payload) VALUES($1,$2,$3,'CI Completed Volunteer Event','published',now()-interval '2 hours',now()-interval '1 hour',50,'{}'::jsonb)",[event,org,manager]);
 await db.query("INSERT INTO registrations(id,event_id,user_id,status) VALUES($1,$2,$3,'going')",[uuid(),event,employee]);
 for(const [id,token] of [[root,tokenRoot],[manager,tokenManager]])await db.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",[createHash("sha256").update(token).digest("hex"),id]);
 let response=await write("/api/v3",{action:"attendanceSubmit",organization_id:org,country_code:"IN",event_id:event,rows:[{user_id:employee,present:true}]},tokenManager);
 assert.equal(response.status,200,"Attendance submit: "+JSON.stringify(response.body));
 response=await write("/api/v3",{action:"attendanceExtra",organization_id:org,country_code:"IN",event_id:event,employee_id:extra,phone:"+919876543210"},tokenManager);
 assert.equal(response.status,200,"Walk-in add: "+JSON.stringify(response.body));
 response=await api("/api/v3",{headers:{"Cookie":"elixir_session="+tokenManager}});
 assert.equal(response.status,200);
 assert(response.body.attendanceMarks.some(x=>x.event_id===event&&x.user_id===employee&&x.status==="present"));
 assert(response.body.attendanceExtras.some(x=>x.event_id===event&&x.employee_id===extra));
 response=await write("/api/v3",{action:"attendanceExtra",organization_id:org,country_code:"IN",event_id:event,employee_id:extra,phone:"+919876543210"},tokenManager);
 assert.equal(response.status,409,"Duplicate walk-in must be rejected");
 response=await write("/api/company-applications",{organizationName:"CI New Partner",contactName:"Applicant CI",contactEmail:"contact@ci-newpartner.example",workDomain:"ci-newpartner.example",message:"CI test"});
 assert.equal(response.status,201,"Application submit: "+JSON.stringify(response.body));
 const id=response.body.applicationId;
 response=await api("/api/company-applications",{headers:{"Cookie":"elixir_session="+tokenRoot}});
 assert.equal(response.status,200);
 assert(response.body.applications.some(x=>x.id===id&&x.status==="pending"));
 response=await api("/api/company-applications",{method:"PATCH",headers:{"Content-Type":"application/json",Origin:base,Cookie:"elixir_session="+tokenRoot},body:JSON.stringify({id,decision:"approved"})});
 assert.equal(response.status,200,"Approve application: "+JSON.stringify(response.body));
 const approved=await db.query("SELECT o.id FROM organizations o JOIN organization_domains d ON d.organization_id=o.id WHERE d.domain='ci-newpartner.example'");
 assert.equal(approved.rowCount,1);
 response=await write("/api/v3",{action:"attendanceSubmit",organization_id:uuid(),country_code:"IN",event_id:event,rows:[]},tokenManager);
 assert.equal(response.status,403,"Country manager must not write to another company");
 response=await api("/api/company-applications");
 assert.equal(response.status,403,"Anonymous visitors must not read applications");
 const simultaneous=await Promise.all(Array.from({length:5},async()=>{const started=performance.now();const r=await api("/api/v3",{headers:{"Cookie":"elixir_session="+tokenManager}});return {status:r.status,ms:Math.round(performance.now()-started)};}));
 assert(simultaneous.every(x=>x.status===200),"Five concurrent read requests failed");
 const times=simultaneous.map(x=>x.ms).sort((a,b)=>a-b);
 console.log("CI local API latency:",JSON.stringify({clients:5,p50Ms:times[2],p95Ms:times[4]}));
 assert(times[4]<8000,"CI 5-request p95 latency exceeded 8s");
 console.log("PASS: live HTTP API attendance, walk-in, duplicate prevention, company application and review");
}finally{await db.end().catch(()=>{});}
