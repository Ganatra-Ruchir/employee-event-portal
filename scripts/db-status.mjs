import pg from "pg";
const url=process.env.DATABASE_URL||process.env.DATABASE_PUBLIC_URL;
if(!url){console.error("Database connection URL not set");process.exit(1);}
const privateRailway=new URL(url).hostname.endsWith(".railway.internal");
const mode=process.env.DATABASE_SSL_MODE||(privateRailway?"disable":"verify-full");
if(!["disable","verify-full"].includes(mode)||mode==="disable"&&!privateRailway){console.error("Public database connections require verified TLS");process.exit(1);}
const ssl=mode==="disable"?false:{rejectUnauthorized:true,ca:process.env.DATABASE_CA_CERT?.replace(/\\n/g,"\n")};
const client=new pg.Client({connectionString:url,ssl,connectionTimeoutMillis:8000});
try{
 await client.connect();
 const r=await client.query("SELECT current_database() AS database, current_schema() AS schema, version() AS version");
 const m=await client.query("SELECT to_regclass('public.schema_migrations') IS NOT NULL AS migrations_ready");
 console.log({database:r.rows[0].database,schema:r.rows[0].schema,version:r.rows[0].version.split(" on ")[0],migrations_ready:m.rows[0].migrations_ready});
}catch(e){console.error("Database status failed:",e instanceof Error?e.message:"unknown");process.exitCode=1;}
finally{await client.end().catch(()=>{});}
