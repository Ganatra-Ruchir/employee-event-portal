import {readFile,readdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import pg from "pg";

// Run manually against an empty staging database. Never migrate production in this script.
const connectionString=process.env.DATABASE_URL_UNPOOLED||process.env.DIRECT_URL||process.env.DATABASE_PUBLIC_URL||process.env.DATABASE_URL;
const forbidden=process.env.VERCEL_ENV==="production"||process.env.RAILWAY_ENVIRONMENT_NAME==="production";
if(!connectionString||forbidden||process.env.ALLOW_STAGING_MIGRATIONS!=="true"){
 console.error("Refused: supply a Railway staging connection and ALLOW_STAGING_MIGRATIONS=true; production is blocked.");
 process.exit(1);
}
const host=new URL(connectionString).hostname;
const privateRailway=host.endsWith(".railway.internal");
const mode=process.env.DATABASE_SSL_MODE||(privateRailway?"disable":"verify-full");
if(!["disable","verify-full"].includes(mode)||mode==="disable"&&!privateRailway&&process.env.ALLOW_INSECURE_STAGING_DB!=="true"){
 console.error("Unsafe SSL configuration: TLS verification is required for public databases.");
 process.exit(1);
}
const ssl=mode==="disable"?false:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT?.replace(/\\n/g,"\n")};
const client=new pg.Client({connectionString,ssl,connectionTimeoutMillis:10000});
try{
 await client.connect();
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
}catch(error){console.error("Migration failed:",error instanceof Error?error.message:"unknown");process.exitCode=1;}
finally{await client.query("SELECT pg_advisory_unlock(hashtext('elixir_schema_migrations'))").catch(()=>{});await client.end().catch(()=>{});}
