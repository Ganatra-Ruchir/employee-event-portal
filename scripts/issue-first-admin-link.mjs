import pg from "pg";
import {randomBytes,createHash} from "node:crypto";

/** Manual, one-use first-admin link for an empty PostgreSQL deployment.
 * Execute only in a trusted shell with a direct DB URL. Never run in CI logs.
 */
const url=process.env.DATABASE_URL_UNPOOLED||process.env.DIRECT_URL;
const email=(process.env.BOOTSTRAP_ADMIN_EMAIL||"").trim().toLowerCase();
const origin=(process.env.PORTAL_PUBLIC_URL||"").replace(/\/$/,"");
if(process.env.ALLOW_FIRST_ADMIN_INVITE!=="true"||!url||
   !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
   !/^https:\/\/[a-z0-9.-]+$/i.test(origin)){
 console.error("Refused. Set ALLOW_FIRST_ADMIN_INVITE=true, DATABASE_URL_UNPOOLED, BOOTSTRAP_ADMIN_EMAIL and PORTAL_PUBLIC_URL.");
 process.exit(1);
}
const client=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:true}});
try{
 await client.connect();
 await client.query("BEGIN");
 await client.query("SELECT pg_advisory_xact_lock(71623901)");
 const existing=await client.query("SELECT count(*)::int AS total FROM users WHERE role='platform_admin'");
 if(existing.rows[0].total!==0)throw Error("A platform administrator already exists; refusing to issue another first-admin link");
 const token=randomBytes(32).toString("base64url");
 const hash=createHash("sha256").update(token).digest("hex");
 await client.query("INSERT INTO admin_setup_tokens(token_hash,email,expires_at) VALUES($1,$2,now()+interval '48 hours')",[hash,email]);
 await client.query("COMMIT");
 // Treat this URL as a password. Do not paste it into public tickets or build logs.
 process.stdout.write("One-time private administrator activation link (48h):\n"+origin+"/admin/activate?token="+token+"\n");
}catch(e){await client.query("ROLLBACK").catch(()=>{});console.error("Activation link unavailable:",e instanceof Error?e.message:"unknown");process.exitCode=1;}
finally{await client.end().catch(()=>{});}
