import {NextRequest,NextResponse} from "next/server";
import {randomUUID} from "node:crypto";
import {databaseEnabled,getSession,sqlPool,logAudit} from "@/lib/db/server";
import {sameOrigin} from "@/lib/http";
import {canManageScope,type V3Actor,type V3Membership,type V3Scope} from "@/lib/v3-permissions";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{"Cache-Control":"no-store"}});
const fail=(error:string,status=400)=>reply({error},status);
const txt=(v:unknown,max=500)=>typeof v==="string"?v.trim().slice(0,max):"";
const day=(v:unknown)=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))?v:null;
async function context(req:NextRequest){
 if(process.env.PORTAL_V4_ENABLED!=="true"||process.env.PORTAL_V3_ENABLED!=="true"||!databaseEnabled())return null;
 const user=await getSession(req.cookies.get("elixir_session")?.value);
 if(!user||!user.verified||user.mustChangePassword||!user.companyId)return null;
 const m=(await sqlPool().query<V3Membership>("SELECT * FROM v3_memberships WHERE user_id=$1 AND organization_id=$2",[user.id,user.companyId])).rows[0];
 if(!m)return null;
 const level=m.level==="country_admin"&&user.role==="company_admin"?"country_admin":m.level==="state_admin"&&user.role==="employee"?"state_admin":"employee";
 return {user,m,actor:{level,scope:m} as V3Actor,manager:level==="country_admin"||level==="state_admin"};
}
export async function GET(req:NextRequest){
 try{
  const c=await context(req);if(!c)return fail("V4 preview not enabled or sign-in required",404);
  const {user,m,actor}=c,db=sqlPool(),s=actor.level==="country_admin"?null:m.state_id,b=actor.level==="employee"?m.branch_id:null;
  const [campaigns,impact,certificates,feedback,events,states,branches,partners,roster]=await Promise.all([
   db.query("SELECT id,title,description,primary_sdg,starts_on,ends_on,status,target_beneficiaries,budget_inr,state_id,partner_id FROM csr_campaigns WHERE organization_id=$1 AND country_code=$2 AND ($3::text IS NULL OR state_id IS NULL OR state_id=$3) AND ($4::text IS NULL OR branch_id IS NULL OR branch_id=$4) ORDER BY created_at DESC LIMIT 100",[m.organization_id,m.country_code,s,b]),
   db.query("SELECT i.id,i.campaign_id,i.metric,i.metric_label,i.value,i.status,i.period_start,i.period_end FROM csr_impact_records i JOIN csr_campaigns c ON c.id=i.campaign_id WHERE i.organization_id=$1 AND c.country_code=$2 AND ($3::text IS NULL OR c.state_id IS NULL OR c.state_id=$3) AND ($5::text IS NULL OR c.branch_id IS NULL OR c.branch_id=$5) AND ($4::text<>'employee' OR i.status='verified') ORDER BY i.created_at DESC LIMIT 100",[m.organization_id,m.country_code,s,actor.level,b]),
   db.query("SELECT c.id,c.certificate_number,c.event_id,c.issued_at,e.title FROM volunteer_certificates c JOIN events e ON e.id=c.event_id JOIN event_attendance a ON a.event_id=c.event_id AND a.user_id=c.user_id AND a.status='present' WHERE c.user_id=$1 AND e.organization_id=$2 AND e.ends_at<=now() AND c.revoked_at IS NULL ORDER BY c.issued_at DESC LIMIT 100",[user.id,m.organization_id]),
   db.query("SELECT event_id,rating,comments,updated_at FROM event_feedback WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100",[user.id]),
   c.manager?db.query("SELECT e.id,e.title,COALESCE(a.audience,'company') AS audience,a.state_id,a.branch_id FROM events e LEFT JOIN event_audiences a ON a.event_id=e.id WHERE e.organization_id=$1 AND e.created_by=$2 ORDER BY e.starts_at DESC LIMIT 100",[m.organization_id,user.id]):Promise.resolve({rows:[]}),
   c.manager?db.query("SELECT id,name FROM v3_states WHERE organization_id=$1 AND country_code=$2 ORDER BY name",[m.organization_id,m.country_code]):Promise.resolve({rows:[]}),
   c.manager?db.query("SELECT id,name,state_id FROM v3_branches WHERE organization_id=$1 AND country_code=$2 ORDER BY name",[m.organization_id,m.country_code]):Promise.resolve({rows:[]}),
   c.manager?db.query("SELECT id,name,kind,status,contact_email FROM csr_partners WHERE organization_id=$1 ORDER BY name LIMIT 100",[m.organization_id]):Promise.resolve({rows:[]}),
   c.manager?db.query("SELECT r.event_id,r.user_id,u.full_name,u.email,e.title,e.ends_at,t.status AS attendance_status,COALESCE(v.volunteer_minutes,0) AS volunteer_minutes,cert.certificate_number FROM registrations r JOIN events e ON e.id=r.event_id JOIN users u ON u.id=r.user_id AND u.organization_id=e.organization_id JOIN v3_memberships em ON em.user_id=u.id AND em.organization_id=e.organization_id AND em.level='employee' LEFT JOIN event_attendance t ON t.event_id=r.event_id AND t.user_id=r.user_id LEFT JOIN v3_contributions v ON v.event_id=r.event_id AND v.user_id=r.user_id LEFT JOIN volunteer_certificates cert ON cert.event_id=r.event_id AND cert.user_id=r.user_id AND cert.revoked_at IS NULL WHERE e.organization_id=$1 AND em.country_code=$2 AND ($3::text IS NULL OR em.state_id=$3) AND r.status='going' AND e.status='published' AND e.starts_at<=now() ORDER BY e.starts_at DESC,u.full_name LIMIT 250",[m.organization_id,m.country_code,s]):Promise.resolve({rows:[]})
  ]);
  return reply({level:actor.level,scope:m,campaigns:campaigns.rows,impact:impact.rows,certificates:certificates.rows,feedback:feedback.rows,events:events.rows,states:states.rows,branches:branches.rows,partners:partners.rows,roster:roster.rows});
 }catch(e){console.error("CSR read failed",e);return fail("CSR database unavailable or migrations missing",503);}
}
export async function POST(req:NextRequest){
 if(!sameOrigin(req))return fail("Invalid request origin",403);
 if(Number(req.headers.get("content-length")||0)>32000)return fail("Request too large",413);
 try{
  const c=await context(req);if(!c)return fail("V4 preview not enabled or sign-in required",404);
  const {user,m,actor,manager}=c;
  const a=await req.json();if(!a||typeof a!=="object")return fail("Invalid JSON");
  const action=txt(a.action,40),db=sqlPool();
  if(action==="createPartner"){
   if(actor.level!=="country_admin")return fail("Country administrator role required",403);
   const name=txt(a.name,180),kind=txt(a.kind,30)||"ngo",email=txt(a.contact_email,255).toLowerCase();
   if(name.length<2||!["ngo","school","government","community","other"].includes(kind)||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail("Invalid partner details");
   const id=randomUUID();
   await db.query("INSERT INTO csr_partners(id,organization_id,name,kind,contact_email,created_by) VALUES($1,$2,$3,$4,$5,$6)",[id,m.organization_id,name,kind,email||null,user.id]);
   await logAudit(db,user,"csr.partner.create",id,m.organization_id);return reply({success:true,id});
  }
  if(action==="reviewPartner"){
   if(actor.level!=="country_admin")return fail("Country administrator role required",403);
   const id=txt(a.id,120),status=txt(a.status,20);
   if(!["verified","rejected"].includes(status))return fail("Invalid review status");
   const record=(await db.query("SELECT id,created_by FROM csr_partners WHERE id=$1 AND organization_id=$2 AND status='pending'",[id,m.organization_id])).rows[0];
   if(!record||record.created_by===user.id)return fail("A different administrator must review this pending partner",403);
   const result=await db.query("UPDATE csr_partners SET status=$1,verification_notes=$2,verified_by=$3,verified_at=now() WHERE id=$4 AND organization_id=$5 AND status='pending' RETURNING id",[status,txt(a.notes,2000),user.id,id,m.organization_id]);
   if(!result.rowCount)return fail("Partner already reviewed",409);
   await logAudit(db,user,"csr.partner.review",id,m.organization_id);return reply({success:true});
  }
  if(action==="setAudience"){
   if(actor.level!=="country_admin")return fail("Only country administrators can set event audiences",403);
   const eventId=txt(a.event_id,120),audience=txt(a.audience,20);
   if(!["company","country","state","branch","invited"].includes(audience))return fail("Invalid audience");
   const state=audience==="state"||audience==="branch"?txt(a.state_id,120):null;
   const branch=audience==="branch"?txt(a.branch_id,120):null;
   if((audience==="state"||audience==="branch")&&!state||audience==="branch"&&!branch)return fail("Choose an assigned state and branch");
   const country=["country","state","branch"].includes(audience)?m.country_code:null;
   const invites=audience==="invited"?(Array.isArray(a.user_ids)?a.user_ids:[]):[];
   if(invites.length>250||invites.some((x:unknown)=>typeof x!=="string"||x.length>120)||new Set(invites).size!==invites.length)return fail("Invalid invitee list");
   const client=await db.connect();
   try{
    await client.query("BEGIN");
    const event=await client.query("SELECT id FROM events WHERE id=$1 AND organization_id=$2 AND created_by=$3 FOR UPDATE",[eventId,m.organization_id,user.id]);
    if(!event.rowCount){await client.query("ROLLBACK");return fail("Only an event creator can configure its audience",403);}
    if(invites.length){
     const approved=await client.query("SELECT count(*)::int AS n FROM users u JOIN v3_memberships x ON x.user_id=u.id AND x.organization_id=u.organization_id WHERE u.id=ANY($1::text[]) AND u.organization_id=$2 AND x.country_code=$3 AND x.level='employee' AND u.status='active'",[invites,m.organization_id,m.country_code]);
     if(approved.rows[0].n!==invites.length){await client.query("ROLLBACK");return fail("Invitees must be active employees in your country",403);}
    }
    await client.query("INSERT INTO event_audiences(event_id,organization_id,audience,country_code,state_id,branch_id,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(event_id) DO UPDATE SET audience=excluded.audience,country_code=excluded.country_code,state_id=excluded.state_id,branch_id=excluded.branch_id,updated_by=excluded.updated_by,updated_at=now()",[eventId,m.organization_id,audience,country,state,branch,user.id]);
    await client.query("DELETE FROM event_invitees WHERE event_id=$1",[eventId]);
    for(const target of invites)await client.query("INSERT INTO event_invitees(event_id,user_id,invited_by) VALUES($1,$2,$3)",[eventId,target,user.id]);
    await logAudit(client,user,"event.audience.set",eventId,m.organization_id);
    await client.query("COMMIT");
   }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
   return reply({success:true});
  }
  if(action==="createCampaign"){
   if(!manager)return fail("Administrator role required",403);
   const title=txt(a.title,180),start=day(a.starts_on),end=day(a.ends_on);
   const sdg=a.primary_sdg==null||a.primary_sdg===""?null:Number(a.primary_sdg);
   const target=a.target_beneficiaries==null||a.target_beneficiaries===""?null:Number(a.target_beneficiaries);
   const budget=Number(a.budget_inr??0);
   if(title.length<3||!start||!end||end<start||(sdg!==null&&(!Number.isInteger(sdg)||sdg<1||sdg>17))||(target!==null&&(!Number.isInteger(target)||target<0))||!Number.isFinite(budget)||budget<0||budget>1e10)return fail("Invalid campaign details");
   const state=actor.level==="state_admin"?m.state_id:txt(a.state_id,120)||null;
   const branch=txt(a.branch_id,120)||null;
   const partner=txt(a.partner_id,120)||null;
   if(partner){const approved=await db.query("SELECT 1 FROM csr_partners WHERE id=$1 AND organization_id=$2 AND status='verified'",[partner,m.organization_id]);if(!approved.rowCount)return fail("Choose a verified partner",403);}
   if(branch&&!state)return fail("Select a state before branch");
   const id=randomUUID();
   await db.query("INSERT INTO csr_campaigns(id,organization_id,country_code,state_id,branch_id,partner_id,title,description,primary_sdg,starts_on,ends_on,budget_inr,target_beneficiaries,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)",
   [id,m.organization_id,m.country_code,state,branch,partner,title,txt(a.description,5000),sdg,start,end,budget,target,user.id]);
   await logAudit(db,user,"csr.campaign.create",id,m.organization_id);return reply({success:true,id});
  }
  if(action==="recordImpact"||action==="verifyImpact"){
   if(!manager)return fail("Administrator role required",403);
   const id=txt(a.id,120),campaignId=txt(a.campaign_id,120);
   if(action==="recordImpact"){
    const cRow=(await db.query("SELECT organization_id,country_code,state_id,branch_id FROM csr_campaigns WHERE id=$1",[campaignId])).rows[0];
    if(!cRow||!canManageScope(actor,cRow as V3Scope))return fail("Campaign outside assigned scope",403);
    const metric=txt(a.metric,40),value=Number(a.value),start=day(a.period_start),end=day(a.period_end);
    if(!["beneficiaries_reached","sessions_delivered","volunteer_hours","trees_planted","other"].includes(metric)||!Number.isFinite(value)||value<0||!start||!end||end<start)return fail("Invalid impact entry");
    const newId=randomUUID();await db.query("INSERT INTO csr_impact_records(id,organization_id,campaign_id,metric,metric_label,value,period_start,period_end,evidence_reference,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
    [newId,m.organization_id,campaignId,metric,txt(a.metric_label,120),value,start,end,txt(a.evidence_reference,1000)||null,user.id]);
    await logAudit(db,user,"csr.impact.record",newId,m.organization_id);return reply({success:true,id:newId});
   }
   const record=(await db.query("SELECT i.id,i.recorded_by,c.organization_id,c.country_code,c.state_id,c.branch_id FROM csr_impact_records i JOIN csr_campaigns c ON c.id=i.campaign_id WHERE i.id=$1 AND i.status='draft'",[id])).rows[0];
   if(!record||record.recorded_by===user.id||!canManageScope(actor,record as V3Scope))return fail("A different authorized reviewer must verify this record",403);
   const result=await db.query("UPDATE csr_impact_records SET status='verified',verified_by=$1,verified_at=now() WHERE id=$2 AND status='draft' RETURNING id",[user.id,id]);
   if(!result.rowCount)return fail("Already reviewed",409);
   await logAudit(db,user,"csr.impact.verify",id,m.organization_id);return reply({success:true});
  }
  if(action==="feedback"){
   if(actor.level!=="employee")return fail("Only participating employees can submit feedback",403);
   const eventId=txt(a.event_id,120),rating=Number(a.rating);
   if(!Number.isInteger(rating)||rating<1||rating>5)return fail("Enter a rating from 1 to 5");
   const eligible=await db.query("SELECT 1 FROM events e JOIN event_attendance t ON t.event_id=e.id AND t.user_id=$2 AND t.status='present' WHERE e.id=$1 AND e.organization_id=$3 AND e.ends_at<=now()",[eventId,user.id,m.organization_id]);
   if(!eligible.rowCount)return fail("Only verified attendees may review a completed event",403);
   await db.query("INSERT INTO event_feedback(event_id,user_id,rating,comments) VALUES($1,$2,$3,$4) ON CONFLICT(event_id,user_id) DO UPDATE SET rating=excluded.rating,comments=excluded.comments,updated_at=now()",[eventId,user.id,rating,txt(a.comments,2000)]);
   return reply({success:true});
  }
  if(action==="verifyAttendance"||action==="issueCertificate"){
   if(!manager)return fail("Administrator role required",403);
   const eventId=txt(a.event_id,120),employeeId=txt(a.user_id,120);
   const found=(await db.query("SELECT e.organization_id,m.country_code,m.state_id,m.branch_id,e.starts_at,e.ends_at,r.status AS registration_status,t.status AS attendance_status FROM events e JOIN registrations r ON r.event_id=e.id AND r.user_id=$2 JOIN v3_memberships m ON m.user_id=r.user_id AND m.organization_id=e.organization_id AND m.level='employee' LEFT JOIN event_attendance t ON t.event_id=r.event_id AND t.user_id=r.user_id WHERE e.id=$1 AND e.status='published'",[eventId,employeeId])).rows[0];
   if(!found||!canManageScope(actor,found as V3Scope)||found.registration_status!=="going")return fail("Event attendee outside assigned scope",403);
   if(action==="issueCertificate"){
    if(found.attendance_status!=="present"||new Date(found.ends_at)>new Date())return fail("Completed event with verified attendance required",403);
    const id=randomUUID(),number="EF-"+randomUUID().replace(/-/g,"").slice(0,16).toUpperCase();
    const result=await db.query("INSERT INTO volunteer_certificates(id,event_id,user_id,certificate_number,issued_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id,user_id) DO NOTHING RETURNING id,certificate_number",[id,eventId,employeeId,number,user.id]);
    if(!result.rowCount)return fail("Certificate already issued",409);
    await logAudit(db,user,"csr.certificate.issue",id,m.organization_id);return reply({success:true,certificate:result.rows[0]});
   }
   const status=txt(a.status,20),minutes=Number(a.volunteer_minutes??0);
   if(new Date(found.starts_at)>new Date()||!["present","absent"].includes(status)||!Number.isInteger(minutes)||minutes<0||minutes>10080)return fail("Invalid attendance details");
   const client=await db.connect();
   try{
    await client.query("BEGIN");
    await client.query("INSERT INTO event_attendance(event_id,user_id,status,verified_by) VALUES($1,$2,$3,$4) ON CONFLICT(event_id,user_id) DO UPDATE SET status=excluded.status,verified_by=excluded.verified_by,verified_at=now()",[eventId,employeeId,status,user.id]);
    if(status==="present")await client.query("INSERT INTO v3_contributions(event_id,user_id,volunteer_minutes,contribution,verified_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(event_id,user_id) DO UPDATE SET volunteer_minutes=excluded.volunteer_minutes,contribution=excluded.contribution,verified_by=excluded.verified_by,verified_at=now()",[eventId,employeeId,minutes,txt(a.contribution,1000),user.id]);
    else await client.query("DELETE FROM v3_contributions WHERE event_id=$1 AND user_id=$2",[eventId,employeeId]);
    await logAudit(client,user,"csr.attendance.verify",eventId+":"+employeeId,m.organization_id);
    await client.query("COMMIT");
   }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
   return reply({success:true});
  }
  return fail("Unsupported CSR action",400);
 }catch(e){
  console.error("CSR action failed",e);
  if((e as {code?:string}).code==="23503"||(e as {code?:string}).code==="23514")return fail("Invalid organization, campaign or hierarchy selection");
  if((e as {code?:string}).code==="23505")return fail("Duplicate record",409);
  return fail("CSR action unavailable",503);
 }
}
