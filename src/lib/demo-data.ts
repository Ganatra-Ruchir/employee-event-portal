import {DEMO_GOALS} from "./employee-impact";
import {DEMO_PASSWORD,type PortalData,type Person,type PortalEvent,type RegistrationStatus} from "./portal-model";
import type {PreviewState} from "./v3-preview";
export const DEMO_DATA_VERSION=1;
const organizations=[
 {id:"elixir",name:"Elixir Foundation",prefix:"ELX",area:"202",locations:[["Gujarat","Ahmedabad","Surat"],["Maharashtra","Mumbai","Pune"],["Rajasthan","Jaipur","Udaipur"]]},
 {id:"micron",name:"Micron",prefix:"MIC",area:"212",locations:[["Gujarat","Sanand","Ahmedabad"],["Karnataka","Bengaluru","Mysuru"],["Telangana","Hyderabad","Warangal"]]},
 {id:"microsoft",name:"Microsoft",prefix:"MS",area:"415",locations:[["Telangana","Hyderabad","Warangal"],["Karnataka","Bengaluru","Mysuru"],["Maharashtra","Mumbai","Pune"]]}
];
const first=["Aarav","Priya","Riya","Arjun","Neha","Ishaan","Ananya","Meera","Kabir","Kavya","Dev","Nisha","Rohan","Aditi","Vikram","Sana","Rahul","Isha","Dhruv","Tara"];
const last=["Shah","Patel","Rao","Mehta","Sharma","Iyer","Joshi","Bhat","Desai","Khan","Singh","Nair"];
const departments=["Operations","Engineering","Human Resources","Finance","Marketing","Administration","IT","Community Programs"];
const activities=[
 ["Volunteer Orientation","Volunteering","Support introductions, safety briefings and volunteer coordination."],
 ["Community Tree Plantation","Environment","Plant saplings and help maintain the community garden."],
 ["Digital Literacy for Youth","Education","Guide learners through practical computer exercises."],
 ["Community Health Awareness","Health","Help facilitators manage information and participant registration."],
 ["Library and Book Donation Drive","Community","Sort donated books and prepare reading kits."],
 ["Career Mentoring Workshop","Education","Support practice interviews and career planning."],
 ["Neighborhood Clean-up","Environment","Collect and sort litter with local volunteer teams."],
 ["Food Kit Packing","Volunteering","Assemble and organize food kits for distribution."],
 ["Accessible Technology Session","Workshop","Help participants explore accessible digital tools."],
 ["School Science Activity","Education","Assist facilitators with hands-on science activities."],
 ["Water Conservation Campaign","Environment","Prepare awareness materials and demonstrate conservation practices."],
 ["Employee Wellness Session","Health","Assist with check-in and wellbeing resources."],
 ["Community Skills Fair","Community","Support skills demonstrations and participant guidance."],
 ["Winter Donation Sorting","Volunteering","Sort and label donated essentials for distribution."],
 ["Youth Coding Workshop","Education","Help learners complete introductory coding exercises."],
 ["Park Restoration Drive","Environment","Assist with gardening and cleaning public spaces."],
 ["Financial Literacy Session","Workshop","Support practical budgeting exercises."],
 ["Inclusive Community Day","Community","Coordinate accessible activities and participant support."],
 ["First Aid Awareness","Health","Support a facilitator-led safety awareness session."],
 ["Digital Safety for Families","Education","Guide participants through online safety practices."],
 ["Volunteer Appreciation Meet","Social","Recognize employee volunteers and share lessons learned."],
 ["Employee Impact Town Hall","Town Hall","Review participation and discuss upcoming opportunities."],
 ["Future Volunteer Planning","Workshop","Draft activities and prepare volunteer roles."],
 ["Community Art Activity","Community","Assist with materials and inclusive creative activities."]
];
export function createDemoData(now=Date.now()):PortalData{
 const date=(days:number,hour=9,minutes=0)=>{const d=new Date(now);d.setUTCHours(hour-5,minutes-30,0,0);d.setUTCDate(d.getUTCDate()+days);return d.toISOString();};
 const v3:PreviewState={demoVersion:DEMO_DATA_VERSION,countries:[],states:[],branches:[],members:[],contributions:[],attendanceMarks:[],walkIns:[]};
 const data:PortalData={companies:[],users:[{id:"platform",fullName:"Platform Demo Administrator",email:"admin@elixir.example",department:"Administration",role:"platform_admin",companyId:null,status:"active",verified:true,password:DEMO_PASSWORD}],events:[],registrations:[],invitations:[],v3};
 organizations.forEach((org,oi)=>{
  const domain=org.id+".example",managerId=org.id+"-country-admin";
  data.companies.push({id:org.id,name:org.name,domains:[domain],status:"active",createdAt:date(-210)});
  v3.countries.push({organization_id:org.id,code:"IN",name:"India",organization_name:org.name});
  const base=(id:string,name:string,email:string,role:Person["role"],department:string,employeeNumber:string):Person=>({id,fullName:name,email,department,employeeNumber,role,companyId:org.id,status:"active",verified:true,password:DEMO_PASSWORD,showInAttendeeLists:true});
  const member=(id:string,level:"country_admin"|"state_admin"|"employee",state_id:string|null,branch_id:string|null)=>v3.members.push({user_id:id,level,organization_id:org.id,country_code:"IN",state_id,branch_id});
  data.users.push(base(managerId,org.name+" Country Admin","country@"+domain,"company_admin","People & Impact",org.prefix+"-ADMIN"));
  member(managerId,"country_admin",null,null);
  const employees:Person[]=[];
  org.locations.forEach(([state,c1,c2],si)=>{
   const stateId=org.id+"-state-"+si,adminId=org.id+"-state-admin-"+si;
   v3.states.push({id:stateId,organization_id:org.id,country_code:"IN",name:state});
   data.users.push(base(adminId,state+" Demo Administrator",(si===0?"state":"state"+(si+1))+"@"+domain,"employee","Administration",org.prefix+"-SA"+(si+1)));member(adminId,"state_admin",stateId,null);
   [c1,c2].forEach((city,bi)=>{
    const branchId=stateId+"-branch-"+bi;
    v3.branches.push({id:branchId,organization_id:org.id,country_code:"IN",state_id:stateId,name:city});
    for(let n=0;n<10;n++){
     const i=si*20+bi*10+n,id=org.id+"-employee-"+(i+1),num=org.prefix+"-"+(1001+i),name=first[(i+oi*3)%first.length]+" "+last[(Math.floor(i/first.length)*4+i+oi)%last.length];
     const p=base(id,name,(i===0?"employee":"employee"+(i+1))+"@"+domain,"employee",departments[i%departments.length],num);
     p.jobTitle=["Associate","Analyst","Coordinator","Specialist","Executive"][i%5];p.phone="+1 "+org.area+" 555-"+String(100+i).padStart(4,"0");
     employees.push(p);data.users.push(p);member(id,"employee",stateId,branchId);
    }
   });
  });
  activities.forEach(([title,category,description],ei)=>{
   const past=ei<14,day=past?-(125-ei*9):3+(ei-14)*6,minutes=90+(ei%4)*30,city=org.locations[ei%3][1+ei%2],eventId=org.id+"-event-"+(ei+1),status:PortalEvent["status"]=ei===22?"draft":ei===23?"cancelled":"published",format:PortalEvent["format"]=ei%7===6?"online":ei%5===4?"hybrid":"in_person";
   const startsAt=date(day,10),endsAt=new Date(Date.parse(startsAt)+minutes*60000).toISOString(),capacity=ei===16?20:ei%3===0?45:40;
   const event:PortalEvent={primarySdg:DEMO_GOALS[ei],id:eventId,companyId:org.id,title,summary:description,description:description+" This is a fictional demo activity for the Employee Volunteer System. Bring any materials listed by the organizer and follow the event briefing.",category,format,location:format==="online"?"":city+" · Demo community venue",onlineLink:format==="in_person"?"":"https://meeting.example.com/"+eventId,startsAt,endsAt,capacity,deadline:date(day-1,17),contactEmail:"country@"+domain,status,cancellationReason:status==="cancelled"?"Demo: venue unavailable":"",createdBy:managerId,waitlistEnabled:true};
   if(ei%4===2)event.speakers=[{id:eventId+"-speaker-1",name:"Demo Facilitator "+(ei+1),jobTitle:"Community Program Facilitator",company:org.name,talkTitle:"Introduction and practical activities",bio:"Fictional facilitator profile for testing the speaker gallery.",agendaSlot:"10:00 AM – Orientation"},{id:eventId+"-speaker-2",name:"Demo Volunteer Lead "+(ei+1),jobTitle:"Volunteer Coordinator",company:org.name,talkTitle:"Team participation and impact",bio:"Sample speaker profile for preview only.",agendaSlot:"10:45 AM – Guided activity"}];
   data.events.push(event);
   if(status!=="published")return;
   const confirmed=ei===16?20:24+ei%9,featured=ei<12||(ei>=14&&ei<=17),order=Array.from({length:60},(_,k)=>(k+ei*7+oi*3)%60).filter(i=>i!==0);
   const indices=featured?[0,...order]:order;const registered=indices.slice(0,confirmed);
   const reg=(i:number,s:RegistrationStatus)=>data.registrations.push({id:eventId+"-reg-"+i,eventId,userId:employees[i].id,status:s,createdAt:date(day-7,12),waitlistedAt:s==="waitlisted"?date(day-6,12):null});
   registered.forEach((i,k)=>{
    reg(i,"going");
    if(past&&ei!==13){
     const present=i===0|| (i+ei)%5!==0,updatedAt=endsAt;
     v3.attendanceMarks!.push({eventId,userId:employees[i].id,status:present?"present":"absent",updatedBy:managerId,updatedAt});
     if(present)v3.contributions.push({event_id:eventId,user_id:employees[i].id,volunteer_minutes:minutes-(k%3)*15,contribution:description,verified_at:updatedAt});
    }
   });
   if(ei===16)indices.slice(confirmed,confirmed+5).forEach(i=>reg(i,"waitlisted"));
   indices.slice(confirmed+(ei===16?5:0),confirmed+(ei===16?5:0)+2).forEach(i=>reg(i,"cancelled"));
   if(past&&ei!==13){
    const unregistered=indices.filter(i=>!registered.includes(i)).slice(-2);
    unregistered.forEach(i=>{const p=employees[i],scope=v3.members.find(m=>m.user_id===p.id)!;v3.walkIns!.push({eventId,employeeId:p.employeeNumber!,phone:p.phone!,userId:p.id,organizationId:org.id,countryCode:"IN",stateId:scope.state_id,updatedBy:managerId,updatedAt:endsAt});v3.contributions.push({event_id:eventId,user_id:p.id,volunteer_minutes:minutes-30,contribution:"Walk-in volunteer support",verified_at:endsAt});});
   }
  });
  data.invitations.push({id:org.id+"-invite-accepted",email:"country@"+domain,companyId:org.id,role:"company_admin",code:org.prefix+"-DEMO-ACCEPTED",accepted:true},{id:org.id+"-invite-pending",email:"future.admin@"+domain,companyId:org.id,role:"company_admin",code:org.prefix+"-DEMO-PENDING",accepted:false});
 });
 return data;
}
