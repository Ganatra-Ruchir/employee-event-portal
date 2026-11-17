export type CityLocation={city:string;state:string};
export const cityKey=(c:CityLocation)=>JSON.stringify([c.city,c.state]);
const normalize=(s:string)=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9\p{L}]+/gu,"");
const aliases:Record<string,string[]>={ahmedabad:["ahmadabad","ahemadabad","ahemdabad","ahmedbad","ahemadbad","ahemdabd"],ahmadabad:["ahmedabad","ahemadabad","ahemdabad","ahemadbad","ahemdabd"],mumbai:["bombay"],bengaluru:["bangalore"],kolkata:["calcutta"],chennai:["madras"]};
function distance(a:string,b:string):number{
 let prev=Array.from({length:b.length+1},(_,i)=>i),older=prev;
 for(let i=1;i<=a.length;i++){
  const row=[i];
  for(let j=1;j<=b.length;j++){
   row[j]=Math.min(prev[j]+1,row[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
   if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])row[j]=Math.min(row[j],older[j-2]+1);
  }
  older=prev;prev=row;
 }
 return prev[b.length];
}
export function suggestCities(cities:CityLocation[],query:string,limit=12):CityLocation[]{
 const q=normalize(query.trim()); if(!q)return cities.slice(0,limit);
 const ranked=cities.flatMap(c=>{
  const name=normalize(c.city),names=[name,...(aliases[name]||[])];
  let score=Infinity;
  for(const n of names){
   if(n===q)score=Math.min(score,n===name?0:1);
   else if(n.startsWith(q))score=Math.min(score,2+(n.length-q.length)/100);
   else if(n.includes(q))score=Math.min(score,4);
   else if(q.length>=3){
    const threshold=q.length>=7?3:q.length>=5?2:1;
    const d=Math.min(distance(q,n),distance(q,n.slice(0,q.length)));
    if(d<=threshold)score=Math.min(score,6+d+Math.abs(n.length-q.length)/100);
   }
  }
  return Number.isFinite(score)?[{c,score}]:[];
 });
 return ranked.sort((a,b)=>a.score-b.score||a.c.city.localeCompare(b.c.city)||a.c.state.localeCompare(b.c.state)).slice(0,limit).map(x=>x.c);
}
