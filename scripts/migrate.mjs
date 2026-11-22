import {readFile,readdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import pg from "pg";

// Run manually against an empty staging database. Never migrate production in this script.
const connectionString=process.env.DATABASE_URL_UNPOOLED||process.env.DIRECT_URL||process.env.DATABASE_PUBLIC_URL||process.env.DATABASE_URL;
const host=connectionString?new URL(connectionString).hostname:"";
const privateRailway=host.endsWith(".railway.internal");
// Railway's first environment is named "production" even when the entire project
// is explicitly used solely for staging. Permit this exception only for a
// separately authorized staging project and a private PostgreSQL connection.
const approvedIsolatedRailwayStaging=privateRailway &&
 process.env.RAILWAY_PROJECT_ID &&
 process.env.RAILWAY_PROJECT_ID===process.env.PORTAL_APPROVED_STAGING_PROJECT_ID &&
 process.env.PORTAL_STAGING_DATABASE_ONLY==="true";
const forbidden=process.env.VERCEL_ENV==="production" ||
 (process.env.RAILWAY_ENVIRONMENT_NAME==="production"&&!approvedIsolatedRailwayStaging);
if(!connectionString||forbidden||process.env.ALLOW_STAGING_MIGRATIONS!=="true"){
 console.error("Refused: migrations require a dedicated staging project and ALLOW_STAGING_MIGRATIONS=true; all production databases are blocked.");
 process.exit(1);
}
const mode=process.env.DATABASE_SSL_MODE||(privateRailway?"disable":"verify-full");
if(!["disable","verify-full"].includes(mode)||mode==="disable"&&!privateRailway&&process.env.ALLOW_INSECURE_STAGING_DB!=="true"){
 console.error("Unsafe SSL configuration: TLS verification is required for public databases.");
 process.exit(1);
}
const ssl=mode==="disable"?false:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT?.replace(/\\n/g,"\n")};
// Railway Free-plan PostgreSQL can be sleeping while a web service is being deployed.
 // Retry only transient *private staging* connection failures; never retry schema errors.
let client;
const transient=new Set(["ECONNREFUSED","ETIMEDOUT","ECONNRESET","EHOSTUNREACH","ENETUNREACH","EAI_AGAIN","ENOTFOUND"]);
function errorCodes(error){
 const all=error instanceof AggregateError?error.errors:[error];
 return all.map(e=>e?.code||"UNKNOWN");
}
try{
 for(let attempt=1;attempt<=6;attempt++){
  const candidate=new pg.Client({connectionString,ssl,connectionTimeoutMillis:12000});
  try{await candidate.connect();client=candidate;break;}
  catch(error){
   await candidate.end().catch(()=>{});
   const codes=errorCodes(error);
   console.error("Staging PostgreSQL connection attempt "+attempt+" failed: "+codes.join(","));
   if(!privateRailway||attempt===6||!codes.every(code=>transient.has(code)))throw error;
   await new Promise(resolve=>setTimeout(resolve,5000));
  }
 }
 if(!client)throw Error("Staging PostgreSQL connection unavailable after retries");
 await client.query("SELECT pg_advisory_lock(hashtext('elixir_schema_migrations'))");
 await client.query("CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum_sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())");
 const folder=fileURLToPath(new URL("../db/migrations/",import.meta.url));
 const files=(await readdir(folder)).filter(name=>/^\d+_[a-z0-9_-]+\.sql$/.test(name)).sort();
 if(!files.length)throw Error("No migrations found");
 for(const name of files){
  const content=await readFile(new URL("../db/migrations/"+name,import.meta.url),"utf8");
  const checksum=createHash("sha256").update(content).digest("hex");
  const existing=await client.query("SELECT checksum_sha256 FROM schema_migrations WHERE name=$1",[name]);
  if(existing.rowCount){
   if(existing.rows[0].checksum_sha256!==checksum)throw Error(name+" has changed since it was applied. Create a new numbered migration.");
   console.log("Already applied "+name);continue;
  }
  await client.query(content);
  await client.query("INSERT INTO schema_migrations(name,checksum_sha256) VALUES($1,$2)",[name,checksum]);
  console.log("Applied "+name);
 }
 console.log("Staging migrations completed");
}catch(error){
 const detail=error instanceof Error?error.message||error.name:"unknown";
 const codes=errorCodes(error).join(",");
 console.error("Migration failed: "+detail+" (code: "+codes+")");
 process.exitCode=1;
}
finally{
 if(client){
  await client.query("SELECT pg_advisory_unlock(hashtext('elixir_schema_migrations'))").catch(()=>{});
  await client.end().catch(()=>{});
 }
}
