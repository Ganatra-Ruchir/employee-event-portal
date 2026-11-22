import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";
import {writeVerifiedAttendance} from "../src/lib/db/attendance-sync";

test("attendance and verified contributions remain synchronized in one transaction",async t=>{
 const url=process.env.CI_DATABASE_URL;
 if(!url){t.skip("Only runs against disposable PostgreSQL in CI");return;}
 const db=new pg.Client({connectionString:url,ssl:false});
 await db.connect();
 const suffix=randomUUID(),org="sync-org-"+suffix,admin="sync-admin-"+suffix,employee="sync-employee-"+suffix,event="sync-event-"+suffix;
 try{
  await db.query("BEGIN");
  await db.query("INSERT INTO organizations(id,name) VALUES($1,$2)",[org,"Attendance Test Org"]);
  await db.query("INSERT INTO users(id,full_name,email,password_hash,role,organization_id,verified) VALUES($1,'Audit Administrator',$2,'test','company_admin',$3,true),($4,'Audit Employee',$5,'test','employee',$3,true)",[admin,"admin-"+suffix+"@example.test",org,employee,"employee-"+suffix+"@example.test"]);
  await db.query("INSERT INTO events(id,organization_id,created_by,title,status,starts_at,ends_at,capacity,payload) VALUES($1,$2,$3,'Attendance Test Event','published',now()-interval '2 days',now()-interval '1 day',10,'{}'::jsonb)",[event,org,admin]);
  await db.query("INSERT INTO registrations(id,event_id,user_id,status) VALUES($1,$2,$3,'going')",["sync-reg-"+suffix,event,employee]);
  const base={eventId:event,userId:employee,verifiedBy:admin,contribution:"Verified test shift"};
  await writeVerifiedAttendance(db,{...base,status:"present",minutes:180});
  let result=await db.query("SELECT a.status,c.volunteer_minutes FROM event_attendance a LEFT JOIN v3_contributions c USING(event_id,user_id) WHERE a.event_id=$1 AND a.user_id=$2",[event,employee]);
  assert.equal(result.rows[0].status,"present");assert.equal(result.rows[0].volunteer_minutes,180);
  await writeVerifiedAttendance(db,{...base,status:"present",minutes:240});
  result=await db.query("SELECT a.status,c.volunteer_minutes FROM event_attendance a LEFT JOIN v3_contributions c USING(event_id,user_id) WHERE a.event_id=$1 AND a.user_id=$2",[event,employee]);
  assert.equal(result.rows[0].volunteer_minutes,240,"Repeated verification should update, not double count");
  await writeVerifiedAttendance(db,{...base,status:"absent",minutes:0,contribution:""});
  result=await db.query("SELECT a.status,c.volunteer_minutes FROM event_attendance a LEFT JOIN v3_contributions c USING(event_id,user_id) WHERE a.event_id=$1 AND a.user_id=$2",[event,employee]);
  assert.equal(result.rows[0].status,"absent");assert.equal(result.rows[0].volunteer_minutes,null,"Absent employees cannot retain credited hours");
  await db.query("ROLLBACK");
 }finally{await db.query("ROLLBACK").catch(()=>{});await db.end();}
});
