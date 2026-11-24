import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {databaseEnabled,getSessionWithMembership,sqlPool,passwordHash,makeToken,logAudit} from "@/lib/db/server";
import {sameOrigin} from "@/lib/http";
import {validWalkInEmployeeId,validWalkInPhone} from "@/lib/attendance-validation";
import {canAssign,canManageScope,type V3Actor,type V3Membership,type V3Scope} from "@/lib/v3-permissions";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const fail=(error:string,status=400)=>reply({error},status);
const txt=(v:unknown,n=160)=>typeof v==="string"?v.trim().slice(0,n):"";
async function context(req:NextRequest){
 if(process.env.PORTAL_V3_ENABLED!=="true"||!databaseEnabled())return null;
 const session=await getSessionWithMembership(req.cookies.get("elixir_session")?.value);
 const user=session?.user;
 if(!user||!user.verified||user.mustChangePassword)return null;
 const db=sqlPool();
 const membership=session?.membership as V3Membership|null;
 const actor:V3Actor=user.role==="platform_admin"?{level:"root",scope:null}:
  {level:membership?.level==="country_admin"&&user.role==="company_admin"?"country_admin":membership?.level==="state_admin"&&user.role==="employee"?"state_admin":"employee",scope:membership||null};
 return {user,actor,db};
}
export async function GET(req:NextRequest){
 try{
  const c=await context(req);if(!c)return fail("V3 is not enabled or sign-in is required",404);
  const {user,actor,db}=c;
  if(actor.level==="employee"){
   const result=await db.query("SELECT e.id,e.title,e.starts_at,c.volunteer_minutes,c.contribution,c.verified_at FROM v3_contributions c JOIN events e ON e.id=c.event_id WHERE c.user_id=$1 AND e.organization_id=$2 AND e.status='published' ORDER BY e.starts_at DESC",[user.id,user.companyId]);
   return reply({level:actor.level,scope:actor.scope,contributions:result.rows});
  }
  const root=actor.level==="root",s=actor.scope;
  const args=[root?null:s?.organization_id||null,root?null:s?.country_code||null,actor.level==="state_admin"?s?.state_id||null:null];
  const [countries,states,branches,members,attendance,attendanceMarks,attendanceExtras,attendanceSubmissions]=await Promise.all([
   db.query("SELECT c.*,o.name AS organization_name FROM v3_countries c JOIN organizations o ON o.id=c.organization_id WHERE ($1::text IS NULL OR c.organization_id=$1) AND ($2::text IS NULL OR c.code=$2) ORDER BY o.name,c.name",args.slice(0,2)),
   db.query("SELECT * FROM v3_states WHERE ($1::text IS NULL OR organization_id=$1) AND ($2::text IS NULL OR country_code=$2) AND ($3::text IS NULL OR id=$3) ORDER BY name",args),
   db.query("SELECT * FROM v3_branches WHERE ($1::text IS NULL OR organization_id=$1) AND ($2::text IS NULL OR country_code=$2) AND ($3::text IS NULL OR state_id=$3) ORDER BY name",args),
   db.query("SELECT m.*,u.full_name,u.email,u.department,u.status,u.job_title,u.phone FROM v3_memberships m JOIN users u ON u.id=m.user_id AND u.organization_id=m.organization_id WHERE ($1::text IS NULL OR m.organization_id=$1) AND ($2::text IS NULL OR m.country_code=$2) AND ($3::text IS NULL OR m.state_id=$3) ORDER BY u.full_name",args),
   root?Promise.resolve({rows:[]}):db.query("SELECT r.event_id,r.user_id,e.title,u.full_name,c.volunteer_minutes,c.contribution FROM registrations r JOIN events e ON e.id=r.event_id JOIN users u ON u.id=r.user_id JOIN v3_memberships m ON m.user_id=u.id AND m.organization_id=e.organization_id AND u.organization_id=m.organization_id LEFT JOIN v3_contributions c ON c.event_id=r.event_id AND c.user_id=r.user_id WHERE m.organization_id=$1 AND m.country_code=$2 AND ($3::text IS NULL OR m.state_id=$3) AND m.level='employee' AND r.status='going' AND e.status='published' AND e.ends_at<=now() AND ($3::text IS NULL OR e.payload->>'stateId'=$3) ORDER BY e.ends_at DESC LIMIT 250",args),
   root?Promise.resolve({rows:[]}):db.query("SELECT x.event_id,x.user_id,x.status FROM v3_attendance_marks x JOIN events e ON e.id=x.event_id JOIN v3_memberships m ON m.user_id=x.user_id AND m.organization_id=e.organization_id WHERE m.organization_id=$1 AND m.country_code=$2 AND ($3::text IS NULL OR m.state_id=$3)",args),
   root?Promise.resolve({rows:[]}):db.query("SELECT w.event_id,w.employee_id,w.phone FROM v3_attendance_walkins w JOIN events e ON e.id=w.event_id WHERE e.organization_id=$1 AND ($2::text IS NULL OR (w.state_id=$2 AND e.payload->>'stateId'=$2)) ORDER BY w.added_at", [args[0],actor.level==="state_admin"?s?.state_id:null]),
   root?Promise.resolve({rows:[]}):db.query("SELECT sub.event_id FROM v3_attendance_submissions sub JOIN events e ON e.id=sub.event_id WHERE e.organization_id=$1 AND EXISTS(SELECT 1 FROM v3_countries c WHERE c.organization_id=e.organization_id AND c.code=$2) AND ($3::text IS NULL OR e.payload->>'stateId'=$3)",args)
  ]);
  return reply({level:actor.level,scope:s,countries:countries.rows,states:states.rows,branches:branches.rows,members:members.rows,attendance:attendance.rows,attendanceMarks:attendanceMarks.rows,attendanceExtras:attendanceExtras.rows,attendanceSubmissions:attendanceSubmissions.rows});
 }catch(e){console.error("V3 read failed",e);return fail("V3 workspace unavailable; check staging migration",503);}
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return fail("Invalid request origin",403);
 try{
  const c=await context(req);if(!c)return fail("V3 is not enabled or sign-in is required",404);
  const {user,actor,db}=c;
  if(actor.level==="employee")return fail("Not authorized",403);
  const a=await req.json();if(!a||typeof a!=="object")return fail("Invalid request");
  const action=txt(a.action,40),org=txt(a.organization_id),country=txt(a.country_code,2).toUpperCase(),state=txt(a.state_id)||null,branch=txt(a.branch_id)||null;
  const scope:V3Scope={organization_id:org,country_code:country,state_id:state,branch_id:branch};
  if(!org||!/^[A-Z]{2}$/.test(country)||!canManageScope(actor,scope))return fail("Invalid or unauthorized scope",403);
  const name=txt(a.name);
  const client=await db.connect();
  try{
   await client.query("BEGIN");
   let credentials:Record<string,string>|undefined;
   let subject="";
   if(action==="country"&&actor.level==="root"){
    if(name.length<2||name.length>100)return fail("Enter country name");
    const inserted=await client.query("INSERT INTO v3_countries(organization_id,code,name) SELECT id,$2,$3 FROM organizations WHERE id=$1 AND status='active' RETURNING code",[org,country,name]);if(!inserted.rowCount)return fail("Company is unavailable",404);subject=country;
   }else if(action==="state"&&actor.level==="country_admin"){
    if(name.length<2||name.length>100)return fail("Enter state name");
    subject=randomUUID();await client.query("INSERT INTO v3_states(id,organization_id,country_code,name) VALUES($1,$2,$3,$4)",[subject,org,country,name]);
   }else if(action==="branch"&&actor.level==="country_admin"){
    if(name.length<2||!state)return fail("Enter branch name and state");
    subject=randomUUID();await client.query("INSERT INTO v3_branches(id,organization_id,country_code,state_id,name) VALUES($1,$2,$3,$4,$5)",[subject,org,country,state,name]);
   }else if(action==="assignCountryAdmin"&&canAssign(actor,"country_admin",scope)){
    const email=txt(a.email,255).toLowerCase();
    const target=(await client.query("SELECT id FROM users WHERE email=$1 AND organization_id=$2 AND role='company_admin' AND status='active' AND verified=true FOR UPDATE",[email,org])).rows[0];
    if(!target)return fail("Create or activate the company admin first",404);
    subject=target.id;await client.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,level) VALUES($1,$2,$3,'country_admin')",[subject,org,country]);
   }else if(action==="provision"){
    const level=a.level==="state_admin"?"state_admin":a.level==="employee"?"employee":null;
    if(!level||!canAssign(actor,level,scope)||!state||(level==="state_admin"&&branch))return fail("Invalid or unauthorized account scope",403);
    const email=txt(a.email,255).toLowerCase();
    if(name.length<2||name.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail("Enter name and valid work email");
    const valid=await client.query("SELECT 1 FROM organization_domains d JOIN organizations o ON o.id=d.organization_id WHERE d.organization_id=$1 AND d.domain=$2 AND o.status='active'",[org,email.split("@")[1]]);
    if(!valid.rowCount)return fail("Use an approved company email domain",403);
    subject="EMP-"+randomUUID().toUpperCase();const temporaryPassword=makeToken().slice(0,24);
    await client.query("INSERT INTO users(id,full_name,email,password_hash,department,role,organization_id,verified,status,must_change_password,v3_temporary_password_expires_at) VALUES($1,$2,$3,$4,$5,'employee',$6,true,'active',true,now()+interval '24 hours')",[subject,name,email,await passwordHash(temporaryPassword),txt(a.department,100),org]);
    await client.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,state_id,branch_id,level) VALUES($1,$2,$3,$4,$5,$6)",[subject,org,country,state,branch,level]);
    credentials={employeeId:subject,email,temporaryPassword,expiresIn:"24 hours"};
   }else if(["employeeUpdate","employeeStatus","employeeReset"].includes(action)&&(actor.level==="country_admin"||actor.level==="state_admin")){
    // The server chooses the employee's actual membership; callers cannot
    // elevate themselves by passing another organization's state or branch.
    const employeeId=txt(a.user_id,120);
    const found=await client.query<V3Membership&{email:string;status:string}>(
     "SELECT m.*,u.email,u.status FROM v3_memberships m JOIN users u ON u.id=m.user_id AND u.organization_id=m.organization_id WHERE m.user_id=$1 AND m.organization_id=$2 AND m.level='employee' FOR UPDATE OF m,u",
     [employeeId,org]
    );
    const target=found.rows[0];
    if(!target||!canManageScope(actor,target))return fail("This employee is outside your assigned state or country",403);
    subject=employeeId;
    if(action==="employeeUpdate"){
     const fullName=txt(a.name,100),newEmail=txt(a.email,255).toLowerCase(),department=txt(a.department,100),jobTitle=txt(a.job_title,100),phone=txt(a.phone,25);
     if(fullName.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)||phone&&!/^\+?[0-9 ()-]{7,25}$/.test(phone))return fail("Enter a valid employee name, work email and phone");
     const domain=newEmail.split("@")[1];
     const valid=await client.query("SELECT 1 FROM organization_domains WHERE organization_id=$1 AND domain=$2",[org,domain]);
     if(!valid.rowCount)return fail("Use an approved company email domain",403);
     await client.query("UPDATE users SET full_name=$1,email=$2,department=$3,job_title=$4,phone=$5 WHERE id=$6",[fullName,newEmail,department,jobTitle,phone,employeeId]);
     if(newEmail!==target.email)await client.query("DELETE FROM sessions WHERE user_id=$1",[employeeId]);
    }else if(action==="employeeStatus"){
     const status=a.status==="active"?"active":a.status==="suspended"?"suspended":null;
     if(!status)return fail("Choose active or suspended status");
     await client.query("UPDATE users SET status=$1 WHERE id=$2",[status,employeeId]);
     if(status==="suspended")await client.query("DELETE FROM sessions WHERE user_id=$1",[employeeId]);
    }else{
     const password=makeToken().slice(0,24);
     await client.query("UPDATE users SET password_hash=$1,must_change_password=true,v3_temporary_password_expires_at=now()+interval '24 hours',failed_attempts=0,locked_until=NULL WHERE id=$2",[await passwordHash(password),employeeId]);
     await client.query("DELETE FROM sessions WHERE user_id=$1",[employeeId]);
     credentials={employeeId,email:target.email,temporaryPassword:password,expiresIn:"24 hours"};
    }
   }else if(action==="attendanceSubmit"&&(actor.level==="country_admin"||actor.level==="state_admin")){
    const eventId=txt(a.event_id,120);
    const rows=Array.isArray(a.rows)?a.rows:null;
    if(!eventId||!rows||rows.length>2000)return fail("Invalid attendance roster");
    const event=(await client.query("SELECT id,payload FROM events WHERE id=$1 AND organization_id=$2 AND status='published' AND starts_at<=now()",[eventId,org])).rows[0];
    if(!event)return fail("Event is unavailable for attendance",404);
     if(actor.level==="state_admin"&&event.payload?.stateId!==actor.scope?.state_id)return fail("Only events assigned to your state can be marked",403);
    const expected=await client.query<V3Membership>("SELECT m.* FROM registrations r JOIN users u ON u.id=r.user_id JOIN v3_memberships m ON m.user_id=u.id AND m.organization_id=u.organization_id WHERE r.event_id=$1 AND r.status='going' AND u.organization_id=$2 AND m.country_code=$3 AND ($4::text IS NULL OR m.state_id=$4) AND m.level='employee'",[eventId,org,country,actor.level==="state_admin"?actor.scope?.state_id:null]);
    const eligible=new Set(expected.rows.filter(m=>canManageScope(actor,m)).map(m=>m.user_id));
    if(rows.length!==eligible.size)return fail("Submit the complete registered employee roster",400);
    const seen=new Set<string>();
    for(const item of rows){
     const id=txt(item?.user_id,120),status=item?.present===true?"present":"absent";
     if(!eligible.has(id)||seen.has(id))return fail("Invalid or duplicate attendee",403);
     seen.add(id);
     await client.query("INSERT INTO v3_attendance_marks(event_id,user_id,status,marked_by) VALUES($1,$2,$3,$4) ON CONFLICT(event_id,user_id) DO UPDATE SET status=excluded.status,marked_by=excluded.marked_by,marked_at=now()",[eventId,id,status,user.id]);
     if(status==="present")await client.query("INSERT INTO v3_contributions(event_id,user_id,volunteer_minutes,contribution,verified_by) VALUES($1,$2,0,'', $3) ON CONFLICT(event_id,user_id) DO NOTHING",[eventId,id,user.id]);
     else await client.query("DELETE FROM v3_contributions WHERE event_id=$1 AND user_id=$2",[eventId,id]);
    }
    await client.query("INSERT INTO v3_attendance_submissions(event_id,submitted_by) VALUES($1,$2) ON CONFLICT(event_id) DO UPDATE SET submitted_by=excluded.submitted_by,submitted_at=now()",[eventId,user.id]);
    subject=eventId;
   }else if(action==="attendanceExtra"&&(actor.level==="country_admin"||actor.level==="state_admin")){
    const eventId=txt(a.event_id,120),employeeId=txt(a.employee_id,80).toUpperCase(),phone=txt(a.phone,25);
    if(!validWalkInEmployeeId(employeeId)||!validWalkInPhone(phone))return fail("Enter valid employee ID and phone");
    const event=(await client.query("SELECT id,payload FROM events WHERE id=$1 AND organization_id=$2 AND status='published' AND starts_at<=now()",[eventId,org])).rows[0];
    if(!event)return fail("Event unavailable",404);
     if(actor.level==="state_admin"&&event.payload?.stateId!==actor.scope?.state_id)return fail("Only your state events accept extra attendees",403);
    const submitted=await client.query("SELECT 1 FROM v3_attendance_submissions WHERE event_id=$1",[eventId]);
    if(!submitted.rowCount)return fail("Submit registered attendance before adding extras",409);
    const person=await client.query("SELECT u.id,m.* FROM users u LEFT JOIN v3_memberships m ON m.user_id=u.id WHERE (upper(u.id)=$1 OR upper('EMP-'||left(u.id,8))=$1) AND u.organization_id=$2",[employeeId,org]);
    if(!person.rowCount)return fail("Select an existing company employee",404);
    if(person.rowCount){
     const m=person.rows[0] as V3Membership;
     if(!canManageScope(actor,m))return fail("Employee is outside your attendance scope",403);
     if((await client.query("SELECT 1 FROM registrations WHERE event_id=$1 AND user_id=$2 AND status='going'",[eventId,m.user_id])).rowCount)return fail("Employee is registered; use the checkbox roster",409);
    }
    await client.query("INSERT INTO v3_attendance_walkins(event_id,employee_id,phone,added_by,state_id) VALUES($1,$2,$3,$4,$5)",[eventId,employeeId,phone,user.id,person.rows[0].state_id]);
    subject=eventId+":"+employeeId;
   }else if(action==="verify"&&(actor.level==="country_admin"||actor.level==="state_admin")){
    const eventId=txt(a.event_id),userId=txt(a.user_id),minutes=Number(a.volunteer_minutes);
    if(!Number.isInteger(minutes)||minutes<0||minutes>10080)return fail("Enter valid volunteer minutes");
    const target=(await client.query<V3Membership>("SELECT m.* FROM v3_memberships m JOIN users u ON u.id=m.user_id AND u.organization_id=m.organization_id JOIN registrations r ON r.user_id=u.id JOIN events e ON e.id=r.event_id AND e.organization_id=m.organization_id WHERE u.id=$1 AND e.id=$2 AND m.level='employee' AND r.status='going' AND e.status='published' AND e.ends_at<=now() FOR UPDATE OF r,m",[userId,eventId])).rows[0];
    if(!target||!canManageScope(actor,target))return fail("No eligible registration in your scope",403);
     const eventOwner=await client.query("SELECT payload FROM events WHERE id=$1",[eventId]);
     if(actor.level==="state_admin"&&eventOwner.rows[0]?.payload?.stateId!==actor.scope?.state_id)return fail("Cannot verify another state's event",403);
     const attendanceMark=await client.query("SELECT status FROM v3_attendance_marks WHERE event_id=$1 AND user_id=$2",[eventId,userId]);
     if(attendanceMark.rows[0]?.status==="absent")return fail("Cannot award volunteer hours to an employee marked absent",409);
    subject=eventId+":"+userId;
    await client.query("INSERT INTO v3_contributions(event_id,user_id,volunteer_minutes,contribution,verified_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id,user_id) DO UPDATE SET volunteer_minutes=excluded.volunteer_minutes,contribution=excluded.contribution,verified_by=excluded.verified_by,verified_at=now()",[eventId,userId,minutes,txt(a.contribution,1000),user.id]);
   }else return fail("Not authorized",403);
   await logAudit(client,user,"v3."+action,subject,org);
   await client.query("COMMIT");
   return reply({success:true,...credentials});
  }catch(e){await client.query("ROLLBACK");const code=(e as {code?:string}).code;if(code==="23505")return fail("This record or account already exists",409);if(code==="23503"||code==="23514")return fail("Invalid organization or location assignment");throw e;}
  finally{await client.query("ROLLBACK").catch(()=>{});client.release();}
 }catch(e){console.error("V3 write failed",e);return fail("V3 operation unavailable",503);}
}
