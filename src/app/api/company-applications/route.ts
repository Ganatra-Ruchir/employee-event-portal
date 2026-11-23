import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {databaseEnabled,getSession,sqlPool,logAudit} from "@/lib/db/server";
import {sameOrigin} from "@/lib/http";
import {isPersonalDomain} from "@/lib/portal-model";
export const runtime="nodejs";export const dynamic="force-dynamic";
const out=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store"}});
const val=(v:unknown,max=200)=>typeof v==="string"?v.trim().slice(0,max):"";
async function admin(req:NextRequest){const u=await getSession(req.cookies.get("elixir_session")?.value);return u?.role==="platform_admin"?u:null;}
export async function GET(req:NextRequest){
 if(!databaseEnabled())return out({error:"Applications not configured"},503);
 const u=await admin(req);if(!u)return out({error:"Unauthorized"},403);
 try{const r=await sqlPool().query("SELECT * FROM company_applications ORDER BY created_at DESC LIMIT 300");return out({applications:r.rows});}
 catch{return out({error:"Applications database migration is required"},503);}
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return out({error:"Invalid origin"},403);
 if(!databaseEnabled())return out({error:"Applications not available"},503);
 if(Number(req.headers.get("content-length")||0)>10000)return out({error:"Request too large"},413);
 try{
  const b=await req.json();
  const name=val(b.organizationName,160),contact=val(b.contactName,100),email=val(b.contactEmail,255).toLowerCase(),domain=val(b.workDomain,120).toLowerCase().replace(/^@/,""),website=val(b.website,250),phone=val(b.phone,30),count=val(b.employeeCount,50),message=val(b.message,1600);
  if(name.length<3||contact.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(domain)||isPersonalDomain(domain))return out({error:"Enter a valid organization, contact and company domain"},400);
  if(email.split("@")[1]!==domain)return out({error:"Contact email must use the company work domain"},400);
  const r=await sqlPool().query("INSERT INTO company_applications(id,organization_name,website,contact_name,contact_email,phone,work_domain,employee_count,message) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",[randomUUID(),name,website,contact,email,phone,domain,count,message]);
  return out({success:true,applicationId:r.rows[0].id},201);
 }catch(e){if((e as {code?:string}).code==="23505")return out({error:"An application from this email is already pending"},409);return out({error:"Could not submit application; check the applications database setup"},503);}
}
export async function PATCH(req:NextRequest){
 if(!sameOrigin(req))return out({error:"Invalid origin"},403);
 const u=await admin(req);if(!u)return out({error:"Unauthorized"},403);
 const b=await req.json(),id=val(b.id,120),decision=val(b.decision,20);
 if(!id||!["approved","rejected"].includes(decision))return out({error:"Invalid decision"},400);
 const client=await sqlPool().connect();
 try{await client.query("BEGIN");const app=(await client.query("SELECT * FROM company_applications WHERE id=$1 AND status='pending' FOR UPDATE",[id])).rows[0];if(!app){await client.query("ROLLBACK");return out({error:"Pending application not found"},404);}
  if(decision==="approved"){
   const conflict=await client.query("SELECT 1 FROM organization_domains WHERE domain=$1",[app.work_domain]);if(conflict.rowCount){await client.query("ROLLBACK");return out({error:"This work domain already belongs to a company"},409);}
   const orgId=randomUUID();await client.query("INSERT INTO organizations(id,name) VALUES($1,$2)",[orgId,app.organization_name]);
   await client.query("INSERT INTO organization_domains(domain,organization_id) VALUES($1,$2)",[app.work_domain,orgId]);
  }
  await client.query("UPDATE company_applications SET status=$2,reviewed_by=$3,reviewed_at=now() WHERE id=$1",[id,decision,u.id]);
  await logAudit(client,u,"company_application."+decision,id);await client.query("COMMIT");return out({success:true});
 }catch{await client.query("ROLLBACK");return out({error:"Unable to review application"},503);}finally{client.release();}
}
