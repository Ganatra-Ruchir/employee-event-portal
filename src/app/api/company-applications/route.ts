import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {databaseEnabled,getSession,sqlPool,logAudit} from "@/lib/db/server";
import {sameOrigin} from "@/lib/http";
import {isPersonalDomain} from "@/lib/portal-model";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const countries:Record<string,string>={IN:"India",US:"United States",GB:"United Kingdom",CA:"Canada",AU:"Australia",AE:"United Arab Emirates",SG:"Singapore"};
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const fail=(message:string,status=400)=>reply({error:message},status);
const val=(x:unknown,max=200)=>typeof x==="string"?x.trim().slice(0,max):"";
const emailPattern=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const domainPattern=/^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
function enabled(){return process.env.PORTAL_V4_ENABLED==="true"&&databaseEnabled();}
async function root(req:NextRequest){
 const user=await getSession(req.cookies.get("elixir_session")?.value);
 return user?.role==="platform_admin"&&user.verified&&!user.mustChangePassword?user:null;
}
export async function GET(req:NextRequest){
 if(!enabled())return fail("Company applications are not enabled",503);
 try{
  const admin=await root(req);if(!admin)return fail("Platform administrator sign-in required",403);
  const result=await sqlPool().query(
   "SELECT id,organization_name,domain,contact_name,contact_email,country_code,country_name,city,website,employee_band,message,status,review_note,reviewed_at,created_at,organization_id FROM company_applications ORDER BY (status='pending') DESC,created_at DESC LIMIT 150");
  return reply({applications:result.rows});
 }catch(e){console.error("Company application read failed",e instanceof Error?e.name:"unknown");return fail("Could not load company applications",503);}
}
export async function POST(req:NextRequest){
 if(!enabled())return fail("Company registration is not enabled",503);
 if(!sameOrigin(req))return fail("Invalid request origin",403);
 if(Number(req.headers.get("content-length")||0)>8192)return fail("Application exceeds size limit",413);
 let raw:Record<string,unknown>;
 try{const json:unknown=await req.json();if(!json||typeof json!=="object"||Array.isArray(json))return fail("Invalid application");raw=json as Record<string,unknown>;}catch{return fail("Invalid application");}
 // A hidden honeypot field helps avoid automated spam, without blocking assistive technology.
 if(val(raw.website_confirmation))return reply({success:true,message:"Application received for review."},202);
 const name=val(raw.organization_name,160),contactName=val(raw.contact_name,100);
 const email=val(raw.contact_email,255).toLowerCase(),domain=val(raw.domain,255).toLowerCase().replace(/^@/,"");
 const country=val(raw.country_code,2).toUpperCase(),city=val(raw.city,100),band=val(raw.employee_band,20),message=val(raw.message,2000);
 const website=val(raw.website,300),countryName=countries[country];
 if(name.length<3||contactName.length<2||!emailPattern.test(email)||!domainPattern.test(domain)||domain!==email.split("@")[1]||isPersonalDomain(domain)||
  !countryName||city.length<2||!["1-50","51-200","201-1000","1000+"].includes(band)||message.length>2000){
  return fail("Enter a valid organization name, work domain, matching work email, location and team size");
 }
 if(website){
  try{
   const parsed=new URL(website);
   if(parsed.protocol!=="https:"||parsed.username||parsed.password||!domainPattern.test(parsed.hostname))return fail("Use a valid HTTPS website link");
  }catch{return fail("Use a valid HTTPS website link");}
 }
 try{
  const db=sqlPool();
  const claimed=await db.query("SELECT 1 FROM organization_domains WHERE domain=$1 UNION SELECT 1 FROM company_applications WHERE domain=$1 AND status='pending' LIMIT 1",[domain]);
  if(claimed.rowCount)return fail("This organization has already been registered or has a pending application",409);
  const recent=await db.query("SELECT count(*)::int AS n FROM company_applications WHERE contact_email=$1 AND created_at>now()-interval '24 hours'",[email]);
  if(Number(recent.rows[0]?.n||0)>2)return fail("Too many recent applications from this address",429);
  const id=randomUUID();
  await db.query("INSERT INTO company_applications(id,organization_name,domain,contact_name,contact_email,country_code,country_name,city,website,employee_band,message) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
   [id,name,domain,contactName,email,country,countryName,city,website||null,band,message]);
  // No organization, invitation, user or administrator account is created here.
  return reply({success:true,message:"Application submitted. The platform administrator will review the organization before it can join."},202);
 }catch(e){
  if((e as {code?:string}).code==="23505")return fail("An application for this domain is already pending",409);
  console.error("Company application failed",e instanceof Error?e.name:"unknown");
  return fail("Unable to submit application",503);
 }
}
export async function PATCH(req:NextRequest){
 if(!enabled())return fail("Company applications are not enabled",503);
 if(!sameOrigin(req))return fail("Invalid request origin",403);
 if(Number(req.headers.get("content-length")||0)>4096)return fail("Review exceeds size limit",413);
 try{
  const admin=await root(req);if(!admin)return fail("Platform administrator sign-in required",403);
  const body:unknown=await req.json();if(!body||typeof body!=="object"||Array.isArray(body))return fail("Invalid review");
  const a=body as Record<string,unknown>,id=val(a.id,120),decision=val(a.decision,20),notes=val(a.review_note,2000);
  if(!id||!["approved","rejected"].includes(decision)||decision==="rejected"&&notes.length<5)return fail("Select a decision and provide a rejection reason");
  if(decision==="approved"&&(a.confirmOwnership!==true||notes.length<5))return fail("Confirm your review of the company and provide a decision note");
  const client=await sqlPool().connect();
  try{
   await client.query("BEGIN");
   const found=await client.query("SELECT * FROM company_applications WHERE id=$1 AND status='pending' FOR UPDATE",[id]);
   if(!found.rowCount){await client.query("ROLLBACK");return fail("Application is no longer pending",409);}
   const application=found.rows[0];
   let orgId:string|null=null;
   if(decision==="approved"){
    const conflict=await client.query("SELECT 1 FROM organization_domains WHERE domain=$1 UNION SELECT 1 FROM users WHERE email=$2 UNION SELECT 1 FROM invitations WHERE email=$2 AND accepted=false LIMIT 1",
     [application.domain,application.contact_email]);
    if(conflict.rowCount){await client.query("ROLLBACK");return fail("The work domain or contact email is already assigned. Review the account before approving.",409);}
    orgId=randomUUID();
    await client.query("INSERT INTO organizations(id,name,status) VALUES($1,$2,'active')",[orgId,application.organization_name]);
    await client.query("INSERT INTO organization_domains(domain,organization_id) VALUES($1,$2)",[application.domain,orgId]);
    await client.query("INSERT INTO v3_countries(organization_id,code,name) VALUES($1,$2,$3)",[orgId,application.country_code,application.country_name]);
    // Authorized invitation only: no password is created and no admin is promoted here.
    // Contact must prove ownership of this exact work email through existing OTP signup.
    await client.query("INSERT INTO invitations(id,email,organization_id,role) VALUES($1,$2,$3,'company_admin')",
     [randomUUID(),application.contact_email,orgId]);
   }
   await client.query("UPDATE company_applications SET status=$1,review_note=$2,reviewed_by=$3,reviewed_at=now(),updated_at=now(),organization_id=$4 WHERE id=$5 AND status='pending'",
    [decision,notes,admin.id,orgId,id]);
   await logAudit(client,admin,"company_application."+decision,id,orgId);
   await client.query("COMMIT");
   return reply({success:true,status:decision,organization_id:orgId,
    message:decision==="approved"?"Approved. Workspace created. The nominated contact must complete verified company-email signup to activate administrator access.":"Application rejected."});
  }catch(e){
   await client.query("ROLLBACK").catch(()=>{});
   if((e as {code?:string}).code==="23505")return fail("The organization domain or invitation already exists",409);
   console.error("Company application review failed",e instanceof Error?e.name:"unknown");
   return fail("Unable to review the application",503);
  }finally{client.release();}
 }catch{return fail("Invalid review request",400);}
}
