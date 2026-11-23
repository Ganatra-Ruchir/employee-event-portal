import {chromium} from "playwright";
import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
const base=process.env.BASE_URL||"http://127.0.0.1:3000";
const output="artifacts/ui-audit";
const roles=[
 {email:"admin@elixir.example",name:"root",routes:["overview","events","accounts","companies","invitations","hierarchy","profile"]},
 {email:"country@micron.example",name:"country",routes:["overview","events","attendance","people","registrations","hierarchy","profile"]},
 {email:"state@microsoft.example",name:"state",routes:["overview","events","attendance","people","profile"]},
 {email:"employee@elixir.example",name:"employee",routes:["overview","events","registrations","profile"]}
];
const screens=[
 {width:320,height:740},{width:390,height:844},
 {width:768,height:1024},{width:1024,height:768},
 {width:1440,height:900},{width:2300,height:1100}
];
const browser=await chromium.launch({headless:true});
await mkdir(output,{recursive:true});
let checked=0,interactionChecks=0,visualScreenshots=0;
const failures=[];
const screenshot=async(page,name)=>{await page.screenshot({path:output+"/"+name+".png",fullPage:false,animations:"disabled"});visualScreenshots++;};
function checkGeometry(g,label,width){
 const summary=JSON.stringify(g);
 assert.ok(g.header.top>=-2&&g.header.top<=3,label+": header not at top "+summary);
 assert.ok(g.header.height>=54&&g.header.height<=76,label+": broken header height "+summary);
 assert.ok(Math.abs(g.main.top-g.header.bottom)<=4,label+": blank space above dashboard "+summary);
 assert.ok(g.firstTop>=g.main.top-12&&g.firstTop<=g.main.top+90,label+": blank area before content "+summary);
 assert.ok(g.main.right>=g.viewport-3,label+": missing content width "+summary);
 assert.ok(g.scroll<=g.viewport+3,label+": horizontal document scroll "+summary);
 assert.ok(g.main.padL<=16&&g.main.padR<=16,label+": oversized main gutters "+summary);
 assert.equal(g.inputOverflow,0,label+": form inputs extend out of dashboard "+summary);
 assert.match(g.font,/Inter|Segoe|Arial|sans-serif/i,label+": legacy serif heading");
 if(width>800){
  assert.ok(g.sidebar.width>=195&&g.sidebar.width<=270,label+": sidebar not a vertical column "+summary);
  assert.ok(g.sidebar.left>=-2&&g.sidebar.left<=3,label+": sidebar detached "+summary);
  assert.ok(g.sidebar.right<=g.main.left+3,label+": nav overlaps content "+summary);
  assert.ok(g.main.left>=g.sidebar.right-3,label+": dashboard not beside sidebar "+summary);
  assert.equal(g.navDirection,"column",label+": horizontal navigation on desktop "+summary);
  assert.ok(g.navVerticalSpread>=80,label+": navigation links not stacked "+summary);
 }else{
  assert.ok(g.main.left>=-2&&g.main.left<=3,label+": mobile content shifted "+summary);
  assert.ok(g.sidebar.right<20,label+": mobile nav visible without menu opened "+summary);
 }
}
const evaluate=async page=>page.evaluate(()=>{
 const rect=el=>{const b=el.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
 const header=document.querySelector(".ep-shell>.ep-topbar"),
  sidebar=document.querySelector(".ep-shell>.ep-layout>.ep-sidebar"),
  main=document.querySelector(".ep-shell>.ep-layout>.ep-main");
 if(!header||!sidebar||!main)throw new Error("Missing application structural elements");
 const first=main.firstElementChild,links=sidebar.querySelectorAll(".ep-nav-link"),
  heading=main.querySelector("h1,h2,h3");
 const style=getComputedStyle(main);
 return {viewport:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,
 header:rect(header),sidebar:rect(sidebar),main:{...rect(main),padL:parseFloat(style.paddingLeft),padR:parseFloat(style.paddingRight)},
 firstTop:first?.getBoundingClientRect().top??Number.POSITIVE_INFINITY,
 navDirection:getComputedStyle(sidebar).flexDirection,
 navVerticalSpread:links.length>1?links[links.length-1].getBoundingClientRect().top-links[0].getBoundingClientRect().top:0,
 inputOverflow:[...main.querySelectorAll(".ep-field input,.ep-field select,.ep-field textarea")].filter(el=>{
   const b=el.getBoundingClientRect();return b.width>0&&(b.right>main.getBoundingClientRect().right+2||b.left<main.getBoundingClientRect().left-2);
 }).length,font:heading?getComputedStyle(heading).fontFamily:"sans-serif"};
});
try{
 for(const screen of screens){
  for(const actor of roles){
   const context=await browser.newContext({viewport:screen,reducedMotion:"reduce"});
   const page=await context.newPage();
   const errors=[];page.on("pageerror",err=>errors.push(err.message));
   try{
    await page.goto(base+"/?auth=login",{waitUntil:"domcontentloaded"});
    await page.locator('input[autocomplete="username"]').fill(actor.email);
    await page.locator('input[autocomplete="current-password"]').fill("Demo@2026!");
    await page.locator(".ep-auth-submit").click();
    await page.locator(".ep-shell>.ep-layout>.ep-main").waitFor({timeout:20000});
    for(const route of actor.routes){
     const label=actor.name+"-"+route+"-"+screen.width;
     try{
      await page.goto(base+"/"+route,{waitUntil:"domcontentloaded"});
      await page.locator(".ep-shell>.ep-layout>.ep-main").waitFor({timeout:4500});
      await page.locator('.ep-sidebar [aria-current="page"]').waitFor({timeout:4500});
      const expectedView=route==="overview"?"home":route==="accounts"?"users":route;
      await page.locator('.ep-main[data-evs-view="'+expectedView+'"]').waitFor({timeout:4500});
      assert.equal(new URL(page.url()).pathname,"/"+route,label+": unexpected route redirect to "+page.url());
      const geometry=await evaluate(page);
      checkGeometry(geometry,label,screen.width);
      if(actor.name==="root"&&route==="overview"){
       assert.equal(await page.locator(".evs-insight-card").count(),3,label+": three admin analytics charts");
       await page.locator(".evs-insights-period button").last().click();
       assert.equal(await page.locator(".evs-insights-period button").last().getAttribute("aria-pressed"),"true",label+": period filter");
       await page.locator(".evs-chart-toggle button").last().click();
       assert.equal(await page.locator(".evs-chart-toggle button").last().getAttribute("aria-pressed"),"true",label+": metric filter");
       assert.ok((await page.locator(".evs-admin-bars").getAttribute("aria-label"))?.includes("events"),label+": live chart update");
       interactionChecks+=3;
      }
      if(actor.name==="employee"&&route==="overview"){
       assert.equal(await page.locator(".cc-impact-chart").count(),3,label+": employee charts");
       assert.equal(await page.locator(".cc-chart-legend").first().evaluate(el=>getComputedStyle(el).overflowY),"visible");
       interactionChecks+=2;
      }
      if(route==="overview"&&screen.width<=800){
       await page.locator(".ep-menu").click();
       assert.ok(await page.locator(".ep-sidebar").evaluate(el=>el.getBoundingClientRect().left>=-2),label+": mobile drawer opens");
       await page.locator(".ep-nav-backdrop").click({position:{x:screen.width-10,y:10}});
       assert.ok(await page.locator(".ep-sidebar").evaluate(el=>el.getBoundingClientRect().right<20),label+": mobile drawer closes");
       interactionChecks+=2;
      }
      if((screen.width===390||screen.width===1440)&&actor.routes.includes(route)){
       await screenshot(page,label);
      }
      checked++;console.log("PASS",label,"header",geometry.header.height,"nav",geometry.sidebar.width,"contentTop",geometry.firstTop);
     }catch(error){
      await screenshot(page,"FAILED-"+label).catch(()=>{});
      failures.push(label+": "+(error instanceof Error?error.message:String(error)));
      const state=await page.locator(".ep-main").first().getAttribute("data-evs-view").catch(()=>null);
      const role=await page.locator(".ep-main").first().getAttribute("data-evs-role").catch(()=>null);
      console.error("AUDIT FAILURE",label,JSON.stringify({url:page.url(),view:state,role}),error instanceof Error?error.message:String(error));
      if(failures.length>=8)throw Error("Systemic route failure after eight checks:\\n"+failures.join("\\n"));
     }
    }
    if(screen.width===390&&actor.name==="country"){
     try{
      await page.goto(base+"/events");
      await page.locator('.ep-main[data-evs-view="events"]').waitFor({timeout:4500});
      const createButton=page.getByRole("button",{name:/Create event/i});
      if(!await createButton.count()){
       throw Error("Create event button missing. role="+await page.locator(".ep-main").getAttribute("data-evs-role")+" view="+await page.locator(".ep-main").getAttribute("data-evs-view")+" text="+(await page.locator(".ep-main").innerText()).slice(0,700));
      }
      await createButton.click();
      await page.locator('.ep-main[data-evs-view="eventForm"]').waitFor();
      assert.ok(await page.locator('input[required]').count()>=2,"Event creation form present");
      await screenshot(page,"country-create-event-390");
      checked++;interactionChecks++;
     }catch(error){
      await screenshot(page,"FAILED-country-create-event-390").catch(()=>{});
      failures.push("country-create-event-390: "+(error instanceof Error?error.message:String(error)));
      console.error("AUDIT FAILURE country-create-event",error);
     }
    }
    if(screen.width===1440&&actor.name==="root"){
     try{
      await page.goto(base+"/companies");
      await page.locator('.ep-main[data-evs-view="companies"]').waitFor({timeout:4500});
      await page.getByRole("button",{name:/Add organization/i}).click();
      await page.locator('.ep-main[data-evs-view="companyForm"]').waitFor();
      await screenshot(page,"root-create-organization-1440");
      checked++;interactionChecks++;
     }catch(error){
      await screenshot(page,"FAILED-root-create-organization-1440").catch(()=>{});
      failures.push("root-create-organization-1440: "+(error instanceof Error?error.message:String(error)));
      console.error("AUDIT FAILURE root-create-organization",error);
     }
    }
    assert.deepEqual(errors,[],actor.name+" "+screen.width+": JavaScript runtime errors");
   }finally{await context.close();}
  }
 }
 const pages=["/","/login","/signup","/admin/activate","/companies/register","/admin/company-requests","/impact"];
 for(const screen of [screens[1],screens[4]]){
  for(const route of pages){
   const page=await browser.newPage({viewport:screen,reducedMotion:"reduce"});
   try{
    await page.goto(base+route,{waitUntil:"domcontentloaded"});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+3),route+" "+screen.width+": public horizontal overflow");
    await screenshot(page,"public-"+route.replaceAll("/","-").replace(/^-+/,"")+"-"+screen.width);
    checked++;console.log("PASS public",route,screen.width);
   }finally{await page.close();}
  }
 }
 console.log("AUDIT SUMMARY "+JSON.stringify({pages:checked,interactions:interactionChecks,screenshots:visualScreenshots,failed:failures.length,screenWidths:screens.map(v=>v.width),roles:roles.map(v=>v.name)}));
 if(failures.length)throw Error("UI audit failed with "+failures.length+" issues:\n"+failures.join("\n"));
}finally{await browser.close();}
