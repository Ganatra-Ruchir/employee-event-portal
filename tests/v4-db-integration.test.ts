import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import pg from "pg";
import {v4AudienceSql} from "../src/lib/db/event-audience";

// Only runs with the disposable PostgreSQL created by CI; never use a production database.
test("V4 audience: cross-tenant, country, state, branch, and invitation isolation",async t=>{
 const url=process.env.CI_DATABASE_URL;
 if(!url){t.skip("Requires disposable CI_DATABASE_URL");return;}
 const client=new pg.Client({connectionString:url,ssl:false});
 await client.connect();
 const suffix=randomUUID().slice(0,12),org="test-org-"+suffix,admin="test-admin-"+suffix;
 const members=["a","b","c"].map(x=>"test-member-"+x+"-"+suffix),event="test-event-"+suffix;
 try{
  await client.query("BEGIN");
  await client.query("INSERT INTO organizations(id,name) VALUES($1,$2)",[org,"Test Organization "+suffix]);
  await client.query("INSERT INTO users(id,full_name,email,password_hash,role,organization_id,verified) VALUES($1,$2,$3,'test','company_admin',$4,true)",[admin,"Test Admin","admin-"+suffix+"@testing.example",org]);
  for(let i=0;i<3;i++)await client.query("INSERT INTO users(id,full_name,email,password_hash,role,organization_id,verified) VALUES($1,$2,$3,'test','employee',$4,true)",[members[i],"Test Employee "+i,"employee-"+i+"-"+suffix+"@testing.example",org]);
  await client.query("INSERT INTO v3_countries(organization_id,code,name) VALUES($1,'IN','India'),($1,'US','United States')",[org]);
  await client.query("INSERT INTO v3_states(id,organization_id,country_code,name) VALUES($1,$3,'IN','Gujarat'),($2,$3,'US','California')",[suffix+"-gj",suffix+"-ca",org]);
  await client.query("INSERT INTO v3_branches(id,organization_id,country_code,state_id,name) VALUES($1,$3,'IN',$4,'Ahmedabad'),($2,$3,'US',$5,'San Francisco')",[suffix+"-ahm",suffix+"-sf",org,suffix+"-gj",suffix+"-ca"]);
  await client.query("INSERT INTO v3_memberships(user_id,organization_id,country_code,state_id,branch_id,level) VALUES($1,$4,'IN',$5,$6,'employee'),($2,$4,'IN',$5,$6,'employee'),($3,$4,'US',$7,$8,'employee')",[...members,org,suffix+"-gj",suffix+"-ahm",suffix+"-ca",suffix+"-sf"]);
  await client.query("INSERT INTO events(id,organization_id,created_by,title,status,starts_at,ends_at,capacity,payload) VALUES($1,$2,$3,'Volunteer Test Event','published',now()+interval '1 day',now()+interval '2 days',30,'{}'::jsonb)",[event,org,admin]);
  async function visible(userId:string){return (await client.query("SELECT 1 FROM events e WHERE e.id=$1 AND e.organization_id=$3 AND "+v4AudienceSql("e"),[event,userId,org])).rowCount===1;}
  assert.equal(await visible(members[0]),true,"legacy company event visible");
  await client.query("INSERT INTO event_audiences(event_id,organization_id,audience,country_code,state_id,branch_id,updated_by) VALUES($1,$2,'country','IN',NULL,NULL,$3)",[event,org,admin]);
  assert.equal(await visible(members[0]),true);
  assert.equal(await visible(members[2]),false,"different country denied");
  await client.query("UPDATE event_audiences SET audience='state',state_id=$2 WHERE event_id=$1",[event,suffix+"-gj"]);
  assert.equal(await visible(members[0]),true);
  assert.equal(await visible(members[2]),false);
  await client.query("UPDATE event_audiences SET audience='branch',branch_id=$2 WHERE event_id=$1",[event,suffix+"-ahm"]);
  assert.equal(await visible(members[1]),true);
  assert.equal(await visible(members[2]),false);
  await client.query("UPDATE event_audiences SET audience='invited',country_code=NULL,state_id=NULL,branch_id=NULL WHERE event_id=$1",[event]);
  assert.equal(await visible(members[0]),false,"invite-only defaults deny");
  await client.query("INSERT INTO event_invitees(event_id,user_id,invited_by) VALUES($1,$2,$3)",[event,members[1],admin]);
  assert.equal(await visible(members[1]),true,"invited employee allowed");
  assert.equal(await visible(members[0]),false,"non-invited employee denied");
  assert.equal(await visible("unknown-user"),false);
  await client.query("ROLLBACK");
 }finally{await client.query("ROLLBACK").catch(()=>{});await client.end();}
});
