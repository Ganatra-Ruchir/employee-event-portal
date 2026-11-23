import {chromium} from "playwright";
import assert from "node:assert/strict";
const base=process.env.BASE_URL||"http://127.0.0.1:3000";
const cases=[
 {level:"country_admin",width:1440,height:900},
 {level:"country_admin",width:390,height:844},
 {level:"state_admin",width:390,height:844},
 {level:"employee",width:390,height:844},
 {level:"employee",width:1440,height:900}
];
const fixture=level=>({
 level,currentUserId:"ci-demo-employee",scope:{state_id:"state-1",branch_id:"branch-1"},
 campaigns:[{id:"camp-1",title:"Test Campaign",status:"active",primary_sdg:4,starts_on:"2026-01-01",ends_on:"2026-12-31",description:"Sample campaign"}],
 impact:[{id:"impact-1",metric:"beneficiaries_reached",value:20,status:"verified",period_start:"2026-01-01",period_end:"2026-01-31"}],
 verifiedTotals:{beneficiaries_reached:20,volunteer_hours:3},
 certificates:[],feedback:[],
 eligibleFeedbackEvents:[{id:"event-1",title:"Completed Volunteer Workshop",ends_at:"2026-11-01T10:00:00Z"}],
 events:[{id:"event-1",title:"Completed Volunteer Workshop",audience:"company"}],
 states:[{id:"state-1",name:"Gujarat"}],branches:[{id:"branch-1",state_id:"state-1",name:"Ahmedabad"}],
 partners:[{id:"partner-1",name:"Demo NGO",status:"verified",kind:"ngo"}],
 roster:[{event_id:"event-1",user_id:"ci-demo-employee",full_name:"Demo Employee",title:"Completed Volunteer Workshop",attendance_status:"present",volunteer_minutes:180,ends_at:"2026-11-01T10:00:00Z"}]
});
const browser=await chromium.launch({headless:true});
try{
 for(const entry of cases){
  const context=await browser.newContext({viewport:{width:entry.width,height:entry.height}});
  const page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.route("**/api/impact",route=>route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixture(entry.level))}));
  await page.goto(base+"/impact",{waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:"CSR & volunteer impact"}).waitFor();
  await page.locator(".csr-page .v3-metrics > div").first().waitFor();
  const dims=await page.evaluate(()=>{
    const root=document.querySelector(".csr-page"),card=document.querySelector(".csr-page .ep-panel"),grid=document.querySelector(".csr-page .v3-form");
    if(!root||!card)return null;
    const rect=root.getBoundingClientRect(),style=getComputedStyle(card);
    return {viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
      left:rect.left,right:rect.right,border:style.borderStyle,background:style.backgroundColor,
      form:grid?getComputedStyle(grid).display:"none",maxInputRight:Math.max(0,...Array.from(root.querySelectorAll("input,select,textarea")).map(el=>el.getBoundingClientRect().right))};
  });
  assert.ok(dims,entry.level+" page rendered");
  assert.ok(dims.scroll<=dims.viewport+2,entry.level+" "+entry.width+" horizontal overflow "+JSON.stringify(dims));
  assert.ok(dims.right<=dims.viewport+2,entry.level+" "+entry.width+" main clipped");
  assert.equal(dims.border,"solid","CSR card styles loaded");
  assert.equal(dims.background,"rgb(255, 255, 255)","CSR cards are white");
  if(entry.level==="employee"){
   const choices=page.getByLabel("Completed event");
   assert.equal(await choices.locator("option").count(),2,"Employee can pick a completed verified event");
   assert.equal(await page.getByRole("heading",{name:"Create campaign"}).count(),0,"Employees cannot create campaigns");
  }else{
   assert.equal(await page.getByRole("heading",{name:"Create campaign"}).count(),1,"Manager campaign available");
   assert.ok(await page.getByText("Attendance & certificates").isVisible());
   if(entry.level==="country_admin"){
    assert.equal(await page.getByLabel("Campaign state").count(),1);
    assert.equal(await page.getByLabel("Campaign branch").count(),1);
   }
  }
  assert.deepEqual(errors,[],"No CSR browser runtime errors");
  console.log("PASS CSR layout",entry.level,entry.width);await context.close();
 }
}finally{await browser.close();}
