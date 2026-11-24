/**
 * Non-mutating shared-backend smoke check. Uses two fresh cookie jars.
 * Example: PORTAL_URL=https://employee-event-portal.vercel.app TEST_COUNTRY_EMAIL=...
 * TEST_COUNTRY_PASSWORD=... TEST_STATE_EMAIL=... TEST_STATE_PASSWORD=...
 * node scripts/verify-shared-neon.mjs
 *
 * Never print secrets; do not put passwords in CLI argument lists or CI logs.
 */
const origin=(process.env.PORTAL_URL||"").replace(/\/$/,"");
if(!/^https:\/\/[^/]+$/.test(origin)){console.error("Set PORTAL_URL to the exact HTTPS website origin");process.exit(1);}
const check=async(path,options={})=>{
 const r=await fetch(origin+path,{redirect:"manual",cache:"no-store",...options});
 let data={};try{data=await r.json();}catch{}
 return {status:r.status,data,cookie:r.headers.get("set-cookie")||""};
};
const health=await check("/api/portal/health");
if(health.status!==200||health.data.mode!=="postgresql"||!health.data.ready){
 console.error("FAIL: the live URL is not yet serving the shared PostgreSQL backend");
 process.exit(1);
}
console.log("PASS: live shared PostgreSQL backend ready");
const accounts=[
 [process.env.TEST_COUNTRY_EMAIL,process.env.TEST_COUNTRY_PASSWORD,"country_admin"],
 [process.env.TEST_STATE_EMAIL,process.env.TEST_STATE_PASSWORD,"state_admin"]
];
if(accounts.some(([email,password])=>!email||!password)){console.log("Authenticated check skipped (provide both private test accounts via environment)");process.exit(0);}
const sessions=[];
for(const [email,password,expectedLevel] of accounts){
 const login=await check("/api/portal",{method:"POST",headers:{"Origin":origin,"Content-Type":"application/json"},body:JSON.stringify({action:"login",args:{email,password}})});
 if(login.status!==200||!login.cookie.includes("elixir_session=")){
  console.error("FAIL: independent login did not succeed for",expectedLevel);
  process.exit(1);
 }
 if(login.data.accessLevel!==expectedLevel){
  console.error("FAIL: wrong database role; expected",expectedLevel);
  process.exit(1);
 }
 sessions.push(login.cookie.split(";")[0]);
 console.log("PASS: independent browser session identifies",expectedLevel);
}
const results=await Promise.all(sessions.map(cookie=>check("/api/portal",{headers:{Cookie:cookie}})));
if(results.some(r=>r.status!==200||!r.data.enabled)){
 console.error("FAIL: authenticated backend cannot refresh both independent sessions");
 process.exit(1);
}
const company=results[0].data.data?.companies||[];
const state=results[1].data.data?.companies||[];
if(!company.length||!state.length||state.some(c=>!company.some(x=>x.id===c.id))){
 console.error("FAIL: inconsistent organization data between the separate browser sessions");
 process.exit(1);
}
console.log("PASS: separate client sessions see persisted shared organization records");
