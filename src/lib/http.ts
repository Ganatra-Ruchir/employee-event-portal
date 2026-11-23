import type {NextRequest} from "next/server";

/** Return false for malformed or cross-origin browser requests without throwing. */
export function sameOrigin(req:NextRequest){
 const origin=req.headers.get("origin");
 if(!origin)return true;
 try{
  const url=new URL(origin);
  if((url.protocol!=="https:"&&url.protocol!=="http:"))return false;
  if(url.host===req.headers.get("host"))return true;
  // Vercel's trusted, branch-bound public domain forwards same-origin browser
  // calls to the private Railway-owned API using a server-side rewrite.
  // This is an exact-host exception, not a wildcard CORS policy.
  const trusted=process.env.PORTAL_TRUSTED_PROXY_ORIGIN;
  if(trusted){
   const allowed=new URL(trusted);
   if(allowed.protocol==="https:"&&allowed.origin==="https://employee-volunteer-v4.vercel.app"&&url.origin===allowed.origin)return true;
  }
  return false;
 }catch{return false;}
}
