import {canAssign,canManageScope,type V3Actor,type V3Membership,type V3Scope} from "./v3-permissions";
import {DEMO_PASSWORD,isPersonalDomain,type PortalData,type Person} from "./portal-model";
import type {AttendanceMark,WalkIn} from "./event-attendance";
export type Row=Record<string,string|number|null>;
export type PreviewState={demoVersion?:number;countries:Row[];states:Row[];branches:Row[];members:V3Membership[];contributions:Row[];attendanceMarks?:AttendanceMark[];walkIns?:WalkIn[]};
export type PreviewData=PortalData&{v3?:PreviewState};
const str=(v:unknown)=>typeof v==="string"?v.trim():"";
const scopeOf=(org:string,country:string,state:string|null=null,branch:string|null=null):V3Scope=>({organization_id:org,country_code:country,state_id:state,branch_id:branch});
export function seedPreview(data:PreviewData):PreviewData{
 if(data.v3)return data;
 const countries:Row[]=[],states:Row[]=[],branches:Row[]=[],members:V3Membership[]=[];
 for(const org of data.companies){
  countries.push({organization_id:org.id,code:"IN",name:"India",organization_name:org.name});
  const s=org.id+"-gj",b=org.id+"-ahm";
  states.push({id:s,organization_id:org.id,country_code:"IN",name:"Gujarat"});
  branches.push({id:b,...scopeOf(org.id,"IN",s),name:"Ahmedabad"});
  for(const user of data.users.filter(u=>u.companyId===org.id)){
   members.push({user_id:user.id,level:user.role==="company_admin"?"country_admin":"employee",...scopeOf(org.id,"IN",user.role==="company_admin"?null:s,user.role==="company_admin"?null:b)});
  }
 }
 const users=[...data.users];
 if(data.companies.some(c=>c.id==="northwind")&&!users.some(u=>u.email==="state@northwind.example")){
  users.push({id:"demo-state-admin",email:"state@northwind.example",fullName:"Gujarat State Administrator",department:"Management",role:"employee",companyId:"northwind",status:"active",verified:true,password:DEMO_PASSWORD});
  members.push({user_id:"demo-state-admin",level:"state_admin",...scopeOf("northwind","IN","northwind-gj")});
 }
 return {...data,users,v3:{countries,states,branches,members,contributions:[]}};
}
export function previewActor(user:Person,data:PreviewData):V3Actor{
 if(user.role==="platform_admin")return {level:"root",scope:null};
 const m=data.v3?.members.find(x=>x.user_id===user.id&&x.organization_id===user.companyId);
 return {level:m?.level==="country_admin"&&user.role==="company_admin"?"country_admin":m?.level==="state_admin"&&user.role==="employee"?"state_admin":"employee",scope:m||null};
}
export function previewWorkspace(user:Person,data:PreviewData){
 const v=seedPreview(data).v3!,actor=previewActor(user,{...data,v3:v});
 const {level,scope}=actor;
 if(level==="employee")return {level,scope,contributions:v.contributions.filter(r=>r.user_id===user.id).flatMap(r=>{const e=data.events.find(e=>e.id===r.event_id&&e.companyId===user.companyId&&e.status==="published");return e?[{...r,id:e.id,title:e.title,starts_at:e.startsAt,volunteer_minutes:r.volunteer_minutes,contribution:r.contribution}]:[];})};
 const visible=(r:Row)=>canManageScope(actor,scopeOf(str(r.organization_id),str(r.country_code||r.code),str(r.state_id||r.id)||null,str(r.branch_id)||null));
 const members=v.members.filter(m=>canManageScope(actor,m)).flatMap(m=>{const u=data.users.find(u=>u.id===m.user_id&&u.companyId===m.organization_id);return u?[{...m,full_name:u.fullName,email:u.email,employee_number:u.employeeNumber||u.id}]:[];});
 const attendance=level==="root"?[]:data.registrations.flatMap(r=>{
  const e=data.events.find(e=>e.id===r.eventId),m=members.find(m=>m.user_id===r.userId&&m.level==="employee");
  if(!e||!m||e.companyId!==m.organization_id||e.status!=="published"||r.status!=="going"||Date.parse(e.endsAt)>Date.now())return [];
  const c=v.contributions.find(c=>c.event_id===e.id&&c.user_id===r.userId);
  return [{event_id:e.id,user_id:r.userId,title:e.title,full_name:m.full_name,volunteer_minutes:c?.volunteer_minutes??null,contribution:c?.contribution??"",attendance_status:v.attendanceMarks?.find(x=>x.eventId===e.id&&x.userId===r.userId)?.status||(c?"present":"unmarked")}];
 });
 return {level,scope,countries:v.countries.filter(r=>level==="root"||r.organization_id===scope?.organization_id&&r.code===scope?.country_code),states:v.states.filter(visible),branches:v.branches.filter(visible),members,attendance};
}
export async function previewAction(user:Person,input:PreviewData,a:Record<string,unknown>,hash:(s:string)=>Promise<string>):Promise<{data:PreviewData;credentials:Row|null}>{
 const d=structuredClone(seedPreview(input)),v=d.v3!,actor=previewActor(user,d);
 const action=str(a.action),org=str(a.organization_id),country=str(a.country_code).toUpperCase(),state=str(a.state_id)||null,branch=str(a.branch_id)||null,name=str(a.name),email=str(a.email).toLowerCase();
 const scope=scopeOf(org,country,state,branch),company=d.companies.find(c=>c.id===org&&c.status==="active");
 if(!company||!/^[A-Z]{2}$/.test(country)||!canManageScope(actor,scope))throw Error("Invalid or unauthorized scope");
 const hasCountry=v.countries.some(c=>c.organization_id===org&&c.code===country);
 const hasState=v.states.some(s=>s.organization_id===org&&s.country_code===country&&s.id===state);
 const hasBranch=v.branches.some(b=>b.organization_id===org&&b.country_code===country&&b.state_id===state&&b.id===branch);
 let credentials:Row|null=null;
 if(action==="cityStateAdmin"){
  const city=str(a.city),stateName=str(a.state_name),employeeNumber=str(a.employee_number).toUpperCase();
  if(actor.level!=="country_admin"||!hasCountry||!city||!stateName||city.length>160||stateName.length>100||!/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(employeeNumber))throw Error("Select a city and enter a valid company ID number");
  if(d.users.some(u=>u.id.toUpperCase()===employeeNumber||u.employeeNumber?.toUpperCase()===employeeNumber))throw Error("This ID number is already in use");
  let targetState=v.states.find(s=>s.organization_id===org&&s.country_code===country&&str(s.name).toLowerCase()===stateName.toLowerCase());
  if(!targetState){targetState={id:crypto.randomUUID(),organization_id:org,country_code:country,name:stateName};v.states.push(targetState);}
  const sid=str(targetState.id);
  if(!v.branches.some(b=>b.organization_id===org&&b.country_code===country&&b.state_id===sid&&str(b.name).toLowerCase()===city.toLowerCase()))v.branches.push({id:crypto.randomUUID(),...scopeOf(org,country,sid),name:city});
  const result=await previewAction(user,d,{action:"provision",level:"state_admin",organization_id:org,country_code:country,state_id:sid,name:email.split("@")[0].replace(/[._-]+/g," ")||"State administrator",email,department:"Administration"},hash);
  const account=result.data.users.find(u=>u.id===result.credentials?.employeeId);
  if(!account||!result.credentials)throw Error("Unable to provision account");
  account.employeeNumber=employeeNumber;
  result.credentials.employeeId=employeeNumber;
  return result;
 }
 if(action==="resetStateAdmin"){
  const target=d.users.find(u=>u.id===str(a.user_id)&&u.status==="active"),m=v.members.find(m=>m.user_id===target?.id&&m.level==="state_admin");
  if(actor.level!=="country_admin"||!target||!m||!canManageScope(actor,m))throw Error("Account outside your country scope");
  const password=crypto.randomUUID().replaceAll("-","").slice(0,24);
  target.password=await hash(password);target.mustChangePassword=true;target.temporaryPasswordConsumedAt=undefined;target.temporaryPasswordExpiresAt=new Date(Date.now()+86400000).toISOString();
  return {data:d,credentials:{employeeId:target.employeeNumber||target.id,email:target.email,temporaryPassword:password,expiresIn:"24 hours"}};
 }
 if(action==="country"&&actor.level==="root"){
  if(hasCountry||name.length<2||name.length>100)throw Error("Enter a new country and valid name");
  v.countries.push({organization_id:org,code:country,name,organization_name:company.name});
 }else if(action==="state"&&actor.level==="country_admin"){
  if(!hasCountry||name.length<2||v.states.some(x=>x.organization_id===org&&x.country_code===country&&x.name===name))throw Error("Enter a unique state name");
  v.states.push({id:crypto.randomUUID(),organization_id:org,country_code:country,name});
 }else if(action==="branch"&&actor.level==="country_admin"){
  if(!hasState||name.length<2||v.branches.some(b=>b.state_id===state&&b.name===name))throw Error("Select a state and unique branch name");
  v.branches.push({id:crypto.randomUUID(),...scopeOf(org,country,state),name});
 }else if(action==="assignCountryAdmin"&&actor.level==="root"){
  const target=d.users.find(u=>u.email===email&&u.companyId===org&&u.role==="company_admin"&&u.verified&&u.status==="active");
  if(!hasCountry||!target)throw Error("Select a country and approved company administrator");
  v.members=v.members.filter(m=>m.user_id!==target.id);v.members.push({...scopeOf(org,country),user_id:target.id,level:"country_admin"});
 }else if(action==="provision"){
  const level=a.level==="country_admin"?"country_admin":a.level==="state_admin"?"state_admin":a.level==="employee"?"employee":null;
  if(!level||!canAssign(actor,level,scope)||!hasCountry||(level!=="country_admin"&&!hasState)||(level==="employee"&&branch!==null&&!hasBranch))throw Error("Invalid account scope");
  if(name.length<2||name.length>100||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||isPersonalDomain(email.split("@")[1])||!company.domains.includes(email.split("@")[1]))throw Error("Enter a name and approved company email");
  if(d.users.some(u=>u.email.toLowerCase()===email))throw Error("Email already registered");
  const id="EMP-"+crypto.randomUUID().toUpperCase(),password=crypto.randomUUID().replaceAll("-","").slice(0,24);
  d.users.push({id,fullName:name,email,department:str(a.department),role:level==="country_admin"?"company_admin":"employee",companyId:org,status:"active",verified:true,password:await hash(password),mustChangePassword:true,temporaryPasswordExpiresAt:new Date(Date.now()+86400000).toISOString()});
  v.members.push({user_id:id,level,...scopeOf(org,country,level==="country_admin"?null:state,level==="employee"?branch:null)});
  credentials={employeeId:id,email,temporaryPassword:password,expiresIn:"24 hours"};
 }else if(action==="verify"&&(actor.level==="country_admin"||actor.level==="state_admin")){
  const eventId=str(a.event_id),userId=str(a.user_id),minutes=Number(a.volunteer_minutes),e=d.events.find(x=>x.id===eventId&&x.companyId===org),m=v.members.find(x=>x.user_id===userId&&x.level==="employee");
  if(!e||e.status!=="published"||Date.parse(e.endsAt)>Date.now()||!m||!canManageScope(actor,m)||!d.registrations.some(r=>r.eventId===eventId&&r.userId===userId&&r.status==="going")||!Number.isInteger(minutes)||minutes<0||minutes>10080)throw Error("Invalid contribution or registration");
  v.contributions=v.contributions.filter(r=>r.event_id!==eventId||r.user_id!==userId);
  v.contributions.push({event_id:eventId,user_id:userId,volunteer_minutes:minutes,contribution:str(a.contribution).slice(0,1000),verified_at:new Date().toISOString()});
 }else throw Error("Not authorized");
 return {data:d,credentials};
}
