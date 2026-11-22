import pg from "pg";
import {randomBytes,scrypt as scryptCallback} from "node:crypto";
import {promisify} from "node:util";

// One-time, auditable correction of *fictional* data in the isolated Railway project.
// Guard rejects any other project, database host, or missing explicit authorization.
const PROJECT="e0160026-4cdb-4ca6-9110-f4fc0ff2533f";
const url=process.env.DATABASE_URL||"",password=process.env.DEMO_REVIEWER_PASSWORD||"";
if(!url||!new URL(url).hostname.endsWith(".railway.internal")||
 process.env.RAILWAY_PROJECT_ID!==PROJECT||
 process.env.PORTAL_APPROVED_STAGING_PROJECT_ID!==PROJECT||
 process.env.PORTAL_STAGING_DATABASE_ONLY!=="true"||
 process.env.ALLOW_DEMO_REPAIR!=="true"||password.length<20){
 console.error("Refused: isolated staging project, private database and one-time reviewer password required.");process.exit(1);
}
const db=new pg.Client({connectionString:url,ssl:false,connectionTimeoutMillis:10000});
const scrypt=promisify(scryptCallback);
const slugs=["elixir","micron","microsoft"];
try{
 await db.connect();await db.query("BEGIN");
 await db.query("SELECT pg_advisory_xact_lock(hashtext('employee_volunteer_demo_repair'))");
 let corrected=0,reviewers=0;
 for(const slug of slugs){
  const org="demo-v4-org-"+slug,event="demo-v4-event-"+slug+"-past",recordId="demo-v4-impact-"+slug+"-hours";
  const o=await db.query("SELECT name FROM organizations WHERE id=$1 FOR UPDATE",[org]);
  if(o.rowCount!==1||!String(o.rows[0].name).endsWith("— DEMO"))throw Error("Demo organization not found: "+slug);
  const hours=await db.query("SELECT COALESCE(sum(v.volunteer_minutes),0)::int AS minutes FROM v3_contributions v JOIN event_attendance a ON a.event_id=v.event_id AND a.user_id=v.user_id AND a.status='present' JOIN events e ON e.id=v.event_id WHERE e.id=$1 AND e.organization_id=$2",[event,org]);
  const minutes=Number(hours.rows[0].minutes);
  if(minutes!==630)throw Error("Unexpected sample attendance data for "+slug+"; no automatic correction applied");
  const metric=await db.query("SELECT value,status,evidence_reference FROM csr_impact_records WHERE id=$1 AND organization_id=$2 AND metric='volunteer_hours' FOR UPDATE",[recordId,org]);
  if(metric.rowCount!==1||metric.rows[0].status!=="verified"||metric.rows[0].evidence_reference!=="DEMO-EVIDENCE-NOT-REAL")throw Error("Demo impact record is not pristine");
  const value=Number(metric.rows[0].value),expected=minutes/60;
  if(value!==11.25&&value!==expected)throw Error("Demo hours edited manually; refusing to overwrite");
  if(value!==expected){
   const fixed=await db.query("UPDATE csr_impact_records SET value=$1 WHERE id=$2 AND organization_id=$3 AND metric='volunteer_hours' AND value=11.25 AND evidence_reference='DEMO-EVIDENCE-NOT-REAL' RETURNING id",[expected,recordId,org]);
   if(fixed.rowCount!==1)throw Error("Demo impact update conflict");corrected++;
  }
  const id="demo-v4-user-"+slug+"-reviewer",salt=randomBytes(16).toString("hex");
  const digest=await scrypt(password,salt,64);
  const hash="scrypt:"+salt+":"+digest.toString("hex"),email="reviewer@"+slug+".example";
  const created=await db.query("INSERT INTO users(id,full_name,email,password_hash,role,organization_id,department,job_title,verified,status,must_change_password) VALUES($1,$2,$3,$4,'company_admin',$5,'CSR Review','Independent Country Reviewer',true,'active',false) ON CONFLICT(id) DO NOTHING RETURNING id",[id,"Demo Independent Reviewer — "+slug.toUpperCase(),email,hash,org]);
  if(created.rowCount){
   await db.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,level) VALUES($1,$2,'IN','country_admin')",[id,org]);reviewers++;
  }else{
   const prior=await db.query("SELECT id,organization_id,email FROM users WHERE id=$1",[id]);
   if(prior.rowCount!==1||prior.rows[0].organization_id!==org||prior.rows[0].email!==email)throw Error("Reviewer record conflicts with existing account");
  }
 }
 await db.query("COMMIT");
 console.log("DEMO_REPAIR_SUCCESS "+JSON.stringify({corrected_hour_records:corrected,reviewer_accounts_added:reviewers,verified_hours_per_organization:10.5}));
}catch(error){await db.query("ROLLBACK").catch(()=>{});console.error("Demo repair failed:",error instanceof Error?error.message:"unknown");process.exitCode=1;}
finally{await db.end().catch(()=>{});}
