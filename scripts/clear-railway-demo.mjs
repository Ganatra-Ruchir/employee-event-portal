import pg from "pg";

// Manual cleanup only, never called from preDeploy or CI.
// Destructive mode requires TWO explicit opt-in variables and the isolated project ID.
const PROJECT="e0160026-4cdb-4ca6-9110-f4fc0ff2533f";
const orgs=["demo-v4-org-elixir","demo-v4-org-micron","demo-v4-org-microsoft"];
const url=process.env.DATABASE_URL||"";
if(!url||!new URL(url).hostname.endsWith(".railway.internal")||
 process.env.RAILWAY_PROJECT_ID!==PROJECT||
 process.env.PORTAL_APPROVED_STAGING_PROJECT_ID!==PROJECT||
 process.env.PORTAL_STAGING_DATABASE_ONLY!=="true"){
 console.error("Refused: only the isolated Railway sample-data project can be inspected or cleaned.");
 process.exit(1);
}
const db=new pg.Client({connectionString:url,ssl:false});
const wipe=process.env.ALLOW_DEMO_CLEAR==="true"&&process.env.DEMO_CLEAR_CONFIRM==="DELETE_DEMO_V4_DATA";
const step=async(sql,params=[])=>{const r=await db.query(sql,params);return r.rowCount;};
try{
 await db.connect();
 await db.query("BEGIN");
 const before=await db.query("SELECT (SELECT count(*)::int FROM organizations WHERE id=ANY($1::text[])) AS organizations, (SELECT count(*)::int FROM users WHERE organization_id=ANY($1::text[]) OR id='demo-v4-user-root') AS accounts, (SELECT count(*)::int FROM events WHERE organization_id=ANY($1::text[])) AS events",[orgs]);
 console.log("DEMO_V4_COUNTS "+JSON.stringify(before.rows[0]));
 if(!wipe){
  await db.query("ROLLBACK");
  console.log("DRY RUN ONLY. No rows changed. Deletion requires ALLOW_DEMO_CLEAR=true and DEMO_CLEAR_CONFIRM=DELETE_DEMO_V4_DATA.");
  process.exitCode=0;
 }else{
  // Limit scope to the three exact fictional organization IDs. Do not touch others.
  const q="(SELECT id FROM events WHERE organization_id=ANY($1::text[]))";
  const u="(SELECT id FROM users WHERE organization_id=ANY($1::text[]) OR id='demo-v4-user-root')";
  const c="(SELECT id FROM csr_campaigns WHERE organization_id=ANY($1::text[]))";
  await step("DELETE FROM notification_outbox WHERE organization_id=ANY($1::text[]) OR recipient_id IN "+u",[orgs]);
  await step("DELETE FROM sessions WHERE user_id IN "+u",[orgs]);
  await step("DELETE FROM volunteer_certificates WHERE event_id IN "+q+"",[orgs]);
  await step("DELETE FROM event_feedback WHERE event_id IN "+q+"",[orgs]);
  await step("DELETE FROM event_attendance WHERE event_id IN "+q+"",[orgs]);
  await step("DELETE FROM v3_contributions WHERE event_id IN "+q+"",[orgs]);
  await step("DELETE FROM event_invitees WHERE event_id IN "+q+"",[orgs]);
  await step("DELETE FROM event_audiences WHERE event_id IN "+q+"",[orgs]);
  await step("DELETE FROM registrations WHERE event_id IN "+q+"",[orgs]);
  await step("DELETE FROM csr_impact_records WHERE organization_id=ANY($1::text[])",[orgs]);
  await step("DELETE FROM csr_campaign_events WHERE campaign_id IN "+c OR event_id IN "+q+"",[orgs]);
  await step("DELETE FROM csr_campaigns WHERE organization_id=ANY($1::text[])",[orgs]);
  await step("DELETE FROM csr_partners WHERE organization_id=ANY($1::text[])",[orgs]);
  await step("DELETE FROM events WHERE organization_id=ANY($1::text[])",[orgs]);
  await step("DELETE FROM audit_logs WHERE organization_id=ANY($1::text[]) OR actor_user_id='demo-v4-user-root'",[orgs]);
  await step("DELETE FROM invitations WHERE organization_id=ANY($1::text[])",[orgs]);
  await step("DELETE FROM v3_memberships WHERE organization_id=ANY($1::text[])",[orgs]);
  await step("DELETE FROM users WHERE organization_id=ANY($1::text[]) OR id='demo-v4-user-root'",[orgs]);
  await step("DELETE FROM v3_branches WHERE organization_id=ANY($1::text[])",[orgs]);
  await step("DELETE FROM v3_states WHERE organization_id=ANY($1::text[])",[orgs]);
  await step("DELETE FROM v3_countries WHERE organization_id=ANY($1::text[])",[orgs]);
  await step("DELETE FROM organization_domains WHERE organization_id=ANY($1::text[])",[orgs]);
  await step("DELETE FROM organizations WHERE id=ANY($1::text[])",[orgs]);
  await db.query("COMMIT");
  console.log("DEMO_V4_CLEARED " + JSON.stringify(before.rows[0]));
 }
}catch(err){
 await db.query("ROLLBACK").catch(()=>{});
 console.error("Refused or failed demo cleanup:",err instanceof Error?err.message:"unknown");
 process.exitCode=1;
}finally{await db.end().catch(()=>{});}
