import {sameOrigin} from "@/lib/http";
import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {getEmailAuth} from "@/lib/auth/email-server";
import {databaseEnabled,passwordHash,sqlPool} from "@/lib/db/server";
import {isPersonalDomain} from "@/lib/portal-model";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const fail=(message:string,status=400)=>NextResponse.json({error:message},{status,headers:{"Cache-Control":"no-store"}});
const validEmail=(v:unknown)=>typeof v==="string"&&v.length<=255&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
async function companyFor(email:string){
 // Even if a public provider was once added as a company domain, it must not let strangers join that company.
 if(isPersonalDomain(email.split("@")[1]||""))return {rows:[] as {id:string;name:string}[]};
 return sqlPool().query("SELECT o.id,o.name FROM organizations o JOIN organization_domains d ON d.organization_id=o.id WHERE d.domain=$1 AND o.status='active'",[email.split("@")[1]]);
}
export async function GET(req:NextRequest){
 if(!databaseEnabled())return fail("Database registration not enabled",503);
 const email=(req.nextUrl.searchParams.get("email")||"").toLowerCase().trim();
 if(!validEmail(email))return fail("Enter a valid company email address");
 try{
  const company=await companyFor(email);
  if(!company.rows.length)return fail("This work email domain is not registered with an organization",403);
  const existing=await sqlPool().query("SELECT role,verified,status FROM users WHERE email=$1",[email]);
  if(existing.rows.length&&(existing.rows[0].role!=="employee"||existing.rows[0].verified||existing.rows[0].status!=="active"))
   return fail("This email already has an account. Sign in or contact your administrator.",409);
  return NextResponse.json({eligible:true,organization:company.rows[0].name},{headers:{"Cache-Control":"no-store"}});
 }catch{return fail("Unable to check this organization",503);}
}
export async function POST(req:NextRequest){
 if(!databaseEnabled())return fail("Database registration not enabled",503);
 if(!sameOrigin(req))return fail("Invalid origin",403);
 if(Number(req.headers.get("content-length")||0)>4000)return fail("Request too large",413);
 let body:{email?:unknown;name?:unknown;department?:unknown;password?:unknown};
 try{body=await req.json();}catch{return fail("Invalid submission");}
 const email=typeof body.email==="string"?body.email.trim().toLowerCase():"";
 const name=typeof body.name==="string"?body.name.trim():"";
 const department=typeof body.department==="string"?body.department.trim():"";
 const password=typeof body.password==="string"?body.password:"";
 if(!validEmail(email)||name.length<2||name.length>100||department.length>100||password.length<12||password.length>128)return fail("Invalid registration details");
 try{
  const {data:identity,error:sessionError}=await getEmailAuth().getSession();
  const verifiedIdentity=identity?.user;
  if(sessionError||!verifiedIdentity||verifiedIdentity.email?.trim().toLowerCase()!==email||verifiedIdentity.emailVerified!==true){
   return fail("Verify the emailed OTP before completing registration",403);
  }
  const company=await companyFor(email);
  if(!company.rows.length)return fail("Your company is not registered",403);
  const id=randomUUID(),hash=await passwordHash(password);
  const client=await sqlPool().connect();
  let elevated=false;
  try{
   await client.query("BEGIN");
   const result=await client.query(
    "INSERT INTO users(id,full_name,email,password_hash,department,role,organization_id,verified,status) VALUES($1,$2,$3,$4,$5,'employee',$6,true,'active') ON CONFLICT(email) DO NOTHING RETURNING id",
    [id,name,email,hash,department,company.rows[0].id]
   );
   let userId=result.rows[0]?.id;
   if(!userId){
    // Retry an unverified legacy employee only after confirmed mailbox ownership.
    const changed=await client.query(
     "UPDATE users SET verified=true,password_hash=$1,full_name=$2,department=$3,failed_attempts=0,locked_until=NULL WHERE email=$4 AND role='employee' AND verified=false AND status='active' AND organization_id=$5 RETURNING id",
     [hash,name,department,email,company.rows[0].id]
    );
    if(!changed.rowCount){await client.query("ROLLBACK");return fail("This account cannot be activated automatically. Contact your administrator.",409);}
    userId=changed.rows[0].id;
   }
   if(process.env.PORTAL_V4_ENABLED==="true"){
    // Automatic Country Admin grants only for an explicitly approved company application,
    // a matching one-time invitation, AND a newly verified exact company work email.
    const authorized=await client.query(
     "SELECT a.country_code,i.id AS invitation_id FROM company_applications a JOIN invitations i ON i.email=a.contact_email AND i.organization_id=a.organization_id AND i.accepted=false WHERE a.status='approved' AND a.organization_id=$1 AND a.contact_email=$2 FOR UPDATE OF i",
     [company.rows[0].id,email]);
    if(authorized.rows.length===1){
     const invite=authorized.rows[0];
     const promoted=await client.query("UPDATE users SET role='company_admin' WHERE id=$1 AND role='employee' AND verified=true AND organization_id=$2 RETURNING id",[userId,company.rows[0].id]);
     if(!promoted.rowCount)throw new Error("Approved company contact cannot be promoted");
     const membership=await client.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,level) VALUES($1,$2,$3,'country_admin') ON CONFLICT(user_id) DO NOTHING RETURNING user_id",[userId,company.rows[0].id,invite.country_code]);
     if(!membership.rowCount)throw new Error("Existing membership requires manual administrator review");
     await client.query("UPDATE invitations SET accepted=true WHERE id=$1 AND accepted=false",[invite.invitation_id]);
     await client.query("INSERT INTO audit_logs(actor_user_id,organization_id,action,subject_id) VALUES($1,$2,'company_application.contact_verified',$3)",[userId,company.rows[0].id,invite.invitation_id]);
     elevated=true;
    }
   }
   await client.query("COMMIT");
  }catch(e){await client.query("ROLLBACK").catch(()=>{});throw e;}
  finally{client.release();}
  return NextResponse.json({success:true,organization:company.rows[0].name,
   message:elevated?"Work email verified. Your approved company administrator account is ready to use.":"Email verified. Your employee account is active. You can sign in now.",
   role:elevated?"company_admin":"employee"},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("Verified employee registration failed",error instanceof Error?error.name:"unknown");
  return fail("Unable to finish registration",503);
 }
}
