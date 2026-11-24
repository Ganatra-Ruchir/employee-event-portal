/**
 * Per-browser V3 workspace request coalescing.
 * Multiple components can request the same view simultaneously without
 * issuing parallel DB queries. Auth and writes call invalidateV3Workspace().
 * The short TTL avoids stale data on tab switches; this is never persisted.
 */
let cache:{value:unknown;expiresAt:number}|null=null;
let pending:Promise<unknown>|null=null;
const TTL_MS=15_000;
export function invalidateV3Workspace(){
 cache=null;
 pending=null;
}
export async function fetchV3Workspace<T=unknown>():Promise<T>{
 if(cache&&cache.expiresAt>Date.now())return cache.value as T;
 if(pending)return pending as Promise<T>;
 const request=fetch("/api/v3",{cache:"no-store"}).then(async response=>{
  if(!response.ok){
   if(response.status===404)throw new Error("V3 workspace is unavailable");
   const body=await response.json().catch(()=>({}));
   throw new Error(body.error||"Unable to load the team workspace");
  }
  const payload=await response.json();
  if(pending===request)cache={value:payload,expiresAt:Date.now()+TTL_MS};
  return payload;
 }).finally(()=>{if(pending===request)pending=null;});
 pending=request;
 return request as Promise<T>;
}
