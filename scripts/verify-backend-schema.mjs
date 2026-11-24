import {readFile,readdir} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";

// Never run against live databases: this CI check accepts loopback only.
const connectionString=process.env.CI_TEST_DATABASE_URL;
if(process.env.CI!=="true"||!connectionString){throw Error("CI_TEST_DATABASE_URL and CI=true are required");}
const url=new URL(connectionString);
if(!["127.0.0.1","localhost","::1"].includes(url.hostname)||!["portal_test","postgres"].includes(url.pathname.slice(1))){
 throw Error("Refusing to run backend schema tests outside local CI PostgreSQL.");
}
const client=new pg.Client({connectionString,ssl:false});
const folder=fileURLToPath(new URL("../db/migrations/",import.meta.url));
let inTransaction=false;
try{
 await client.connect();
 for(const filename of (await readdir(folder)).filter(n=>/^\d+_[a-z0-9_-]+\.sql$/.test(n)).sort()){
  const sql=await readFile(new URL("../db/migrations/"+filename,import.meta.url),"utf8");
  await client.query(sql);
  console.log("Migration passed:",filename);
 }
 const required=["company_applications","v3_attendance_marks","v3_attendance_submissions","v3_attendance_walkins","v3_countries","v3_states","v3_branches","v3_memberships","v3_contributions"];
 const tables=await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
 for(const name of required)assert(tables.rows.some(r=>r.tablename===name),"Missing "+name);
 await client.query("BEGIN");inTransaction=true;
 const org="ci-"+randomUUID(),manager="manager-"+randomUUID(),employee="employee-"+randomUUID(),walkin="extra-"+randomUUID(),event="event-"+randomUUID(),state="state-"+randomUUID(),branch="branch-"+randomUUID();
 await client.query("INSERT INTO organizations(id,name) VALUES($1,'Integration Test Company')",[org]);
 await client.query("INSERT INTO organization_domains(domain,organization_id) VALUES($1,$2)",["integration-test.example",org]);
 for(const [id,name,role] of [[manager,"CI Manager","company_admin"],[employee,"CI Employee","employee"],[walkin,"CI Walk-in","employee"]]){
  await client.query("INSERT INTO users(id,full_name,email,password_hash,role,organization_id,verified) VALUES($1,$2,$3,'test-hash',$4,$5,true)",[id,name,id+"@integration-test.example",role,org]);
 }
 await client.query("INSERT INTO v3_countries(organization_id,code,name) VALUES($1,'IN','India')",[org]);
 await client.query("INSERT INTO v3_states(id,organization_id,country_code,name) VALUES($1,$2,'IN','Gujarat')",[state,org]);
 await client.query("INSERT INTO v3_branches(id,organization_id,country_code,state_id,name) VALUES($1,$2,'IN',$3,'Ahmedabad')",[branch,org,state]);
 await client.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,level) VALUES($1,$2,'IN','country_admin')",[manager,org]);
 for(const id of [employee,walkin])await client.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,state_id,branch_id,level) VALUES($1,$2,'IN',$3,$4,'employee')",[id,org,state,branch]);
 await client.query("INSERT INTO events(id,organization_id,created_by,title,status,starts_at,ends_at,capacity,payload) VALUES($1,$2,$3,'CI Test Event','published',now()-interval '2 hours',now()-interval '1 hour',30,$4)",[event,org,manager,JSON.stringify({title:"CI Test Event"})]);
 await client.query("INSERT INTO registrations(id,event_id,user_id,status) VALUES($1,$2,$3,'going')",[randomUUID(),event,employee]);
 await client.query("INSERT INTO v3_attendance_marks(event_id,user_id,status,marked_by) VALUES($1,$2,'present',$3)",[event,employee,manager]);
 await client.query("INSERT INTO v3_attendance_submissions(event_id,submitted_by) VALUES($1,$2)",[event,manager]);
 await client.query("INSERT INTO v3_attendance_walkins(event_id,employee_id,phone,added_by,state_id) VALUES($1,$2,'9876543210',$3,$4)",[event,"EMP-"+walkin.slice(0,8).toUpperCase(),manager,state]);
 await client.query("INSERT INTO company_applications(id,organization_name,contact_name,contact_email,work_domain) VALUES($1,'CI Applicant','Applicant','applicant@company.example','company.example')",[randomUUID()]);
 const result=await client.query("SELECT (SELECT count(*) FROM v3_attendance_marks WHERE event_id=$1) marks,(SELECT count(*) FROM v3_attendance_walkins WHERE event_id=$1) walkins,(SELECT count(*) FROM v3_attendance_submissions WHERE event_id=$1) submissions",( [event]));
 assert.equal(Number(result.rows[0].marks),1);assert.equal(Number(result.rows[0].walkins),1);assert.equal(Number(result.rows[0].submissions),1);
 console.log("PASS: event attendance, registered employee, walk-in, company application and scoped memberships");
}finally{
 if(inTransaction)await client.query("ROLLBACK").catch(()=>{});
 await client.end().catch(()=>{});
}
