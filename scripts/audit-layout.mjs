import {mkdir} from "node:fs/promises";
import {chromium} from "playwright";
import assert from "node:assert/strict";
const base=process.env.BASE_URL||"http://127.0.0.1:3000";
const roles=[
 ["admin@elixir.example",["overview","events","accounts","companies","invitations","hierarchy","profile"]],
 ["country@micron.example",["overview","events","attendance","people","registrations","hierarchy","profile"]],
 ["state@microsoft.example",["overview","events","attendance","people","profile"]],
 ["employee@elixir.example",["overview","events","registrations","profile"]]
];
const viewportSizes=[{width:2300,height:1100},{width:1440,height:900},{width:768,height:1024},{width:390,height:844}];
const browser=await chromium.launch({headless:true});
let checked=0;
const navigationMs=[];
await mkdir("artifacts/client-ui",{recursive:true});
const pageErrors=[];
let landingPalette=null;
try{
 for(const viewport of viewportSizes){
  for(const [email,routes] of roles){
   const context=await browser.newContext({viewport});
   const page=await context.newPage();
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"/?auth=login");
   await page.locator('input[autocomplete="username"]').fill(email);
   await page.locator('input[autocomplete="current-password"]').fill("Demo@2026!");
   await page.locator(".ep-auth-submit").click();
   await page.locator(".ep-shell .ep-main").waitFor();
   for(const route of routes){
    const navigationStart=Date.now();
    await page.goto(base+"/"+route);
    await page.locator(".ep-shell .ep-main").waitFor();
    const expectedView=route==="overview"?"home":route==="accounts"?"users":route;
    await page.locator(`.ep-sidebar button.ep-nav-link[data-view="${expectedView}"][aria-current="page"]`).waitFor();
    // A dynamically loaded workspace can activate its sidebar before its content is ready.
    // Wait for actual page content, so screenshots and latency describe usable screens.
    if(route==="people"||route==="hierarchy"||(route==="overview"&&email.startsWith("state"))){
     await page.locator(".cc-kpi-grid").first().waitFor({timeout:20000});
    }
    if(route==="overview"&&email.startsWith("employee"))await page.locator(".cc-impact-grid").waitFor({timeout:20000});
    navigationMs.push(Date.now()-navigationStart);
    if((viewport.width===1440||viewport.width===768)&&["overview","attendance","companies","events","people","hierarchy","accounts","registrations","profile"].includes(route))await page.screenshot({path:"artifacts/client-ui/"+email.split("@")[0]+"-"+route+(viewport.width===768?"-tablet":"")+".png",fullPage:false});
    const dimensions=await page.evaluate(()=>{
     const main=document.querySelector(".ep-main"),nav=document.querySelector(".ep-sidebar");
     const box=main.getBoundingClientRect(),n=nav.getBoundingClientRect(),style=getComputedStyle(main);
     return {vw:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth,left:box.left,right:box.right,navRight:n.right,padL:parseFloat(style.paddingLeft),padR:parseFloat(style.paddingRight),maxWidth:style.maxWidth,overflow:[...main.querySelectorAll(".ep-field input,.ep-field select,.ep-field textarea")].filter(el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().right>box.right+2).length};
    });
    const label=email+" "+route+" "+viewport.width;
    assert.equal(dimensions.maxWidth,"none",label+": page width cap");
    assert.ok(dimensions.vw-dimensions.right<=2,label+": excess right margin "+JSON.stringify(dimensions));
    assert.ok(dimensions.left-(viewport.width>900?dimensions.navRight:0)<=2,label+": excess left margin");
    assert.ok(dimensions.padL<=14&&dimensions.padR<=14,label+": excess gutters");
    assert.ok(dimensions.scroll<=dimensions.vw+2,label+": horizontal page overflow "+JSON.stringify(dimensions));
    assert.equal(dimensions.overflow,0,label+": input overflow");
    if(email.startsWith("employee")&&route==="overview"){
     assert.equal(await page.locator(".cc-impact-chart").count(),3);
     assert.equal(await page.locator(".cc-chart-legend").first().evaluate(el=>getComputedStyle(el).overflowY),"visible");
     assert.ok(await page.locator(".cc-impact-grid").evaluate(el=>el.getBoundingClientRect().top<document.querySelector(".v3-list").getBoundingClientRect().top));
    }
    if(route==="profile"){
     assert.equal(await page.locator(".cc-profile-details").count(),1,label+": read-only profile missing");
     assert.equal(await page.locator(".aw-profile-form").count(),0,label+": inputs shown before Edit");
     const inside=await page.locator(".cc-profile-summary").evaluate(el=>[...el.querySelectorAll("h2,p")].every(node=>node.getBoundingClientRect().right<=el.getBoundingClientRect().right+2));
     assert.ok(inside,label+": long name/email overflows profile card");
     if(viewport.width===1440){
      await page.getByRole("button",{name:"Edit profile"}).first().click();
      await page.locator(".aw-profile-form").waitFor();
      await page.getByRole("button",{name:"Cancel"}).last().click();
      assert.equal(await page.locator(".aw-profile-form").count(),0,label+": Cancel left editor visible");
     }
    }
    if(route==="hierarchy"&&email.startsWith("country")){
     assert.ok(await page.locator(".cc-kpi-grid").count()>0,label+": missing location KPIs");
     assert.equal(await page.locator(".cc-location-form").count(),0,label+": setup form shown before Add state");
     assert.equal(await page.getByRole("button",{name:/Generate new temporary password/i}).count(),0,label+": unwanted reset action");
     if(viewport.width===1440){await page.getByRole("button",{name:/Add state/i}).first().click();assert.equal(await page.locator(".cc-location-form").count(),1,label+": Add state did not open form");}
    }
    if(route==="people"&&(email.startsWith("country")||email.startsWith("state"))){
     assert.ok(await page.locator(".cc-kpi-grid").count()>0,label+": People summary missing");
     assert.ok(await page.locator(".cc-participation-donut").count()>0,label+": People chart missing");
     assert.equal(await page.locator(".cc-action-composer").count(),0,label+": Add employee form open by default");
     if(viewport.width===1440){await page.getByRole("button",{name:/Add employee/i}).first().click();assert.equal(await page.locator(".cc-action-composer").count(),1,label+": Add employee failed");}
    }
    checked++;console.log("PASS",label);
   }
   if(viewport.width===1440&&email.startsWith("country")){
    await page.locator('.ep-sidebar button[data-view="events"]').click();
    await page.getByRole("button",{name:/Create event/i}).first().click();
    await page.locator("form.ep-form").waitFor();
    assert.equal(await page.getByRole("button",{name:/Add speaker/i}).count(),0,"Event creation offers an unwanted speaker control");
    console.log("PASS speaker-free event creation");
   }
   if(viewport.width===1440){
    const buttons=page.locator(".ep-sidebar button.ep-nav-link");
    const count=await buttons.count();
    assert.ok(count>0,email+": no sidebar navigation buttons");
    for(let i=0;i<count;i++){
     await buttons.nth(i).click();
     await buttons.nth(i).waitFor({state:"visible"});
     await assert.equal(await buttons.nth(i).getAttribute("aria-current"),"page",email+": sidebar click did not activate the expected page");
     assert.ok(new URL(page.url()).pathname!=="/",email+": sidebar click did not route");
    }
    console.log("PASS sidebar click-through",email,count);
   }
   assert.deepEqual(errors,[],email+": browser errors");
   pageErrors.push(...errors);
   await context.close();
  }
 }
 for(const route of ["/","/signup","/login","/apply","/admin/activate"]){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(base+route);
  await page.waitForLoadState("domcontentloaded");
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),route+": public mobile overflow");
  if(route==="/"||route==="/apply"){
   const colors=await page.evaluate(()=>{
    const get=(selector,property)=>{const node=document.querySelector(selector);return node?getComputedStyle(node)[property]:null;};
    return {logo:get(".landing-mark","backgroundColor"),accent:get(".landing-brand-light","color"),action:get(".landing-signup","backgroundColor")};
   });
   if(route==="/")landingPalette=colors;
   else assert.deepEqual(colors,landingPalette,"Public application uses a different logo/accent/CTA palette");
   if(route==="/"){
    const hero=await page.locator(".landing-hero-main").evaluate(el=>{const r=el.getBoundingClientRect();return {top:r.top,opacity:Number(getComputedStyle(el).opacity)};});
    assert.ok(hero.opacity>.9,"Mobile landing hero begins invisible");
    assert.ok(hero.top<265,"Mobile landing hero has excessive empty space above the headline: "+JSON.stringify(hero));
   }
   await page.screenshot({path:"artifacts/client-ui/public-"+(route==="/"?"landing":"apply")+".png",fullPage:false});
  }
  if(route==="/apply"){
   assert.ok(await page.locator('form input[type="email"]').count()>0,"Company application contact email field missing");
   assert.ok(await page.locator('a[href="/"]').count()>0,"Company application has no main-site navigation");
  }
  if(route==="/"){
   assert.ok(await page.locator('a[href="/apply"]').count()>0,"Landing page does not link to company applications");
  }
  checked++;console.log("PASS public",route);await page.close();
 }
 for(const route of ["/","/apply"]){
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(base+route);await page.waitForLoadState("domcontentloaded");
  await page.screenshot({path:"artifacts/client-ui/public-"+(route==="/"?"landing":"apply")+"-desktop.png",fullPage:false});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),route+": desktop overflow");
  checked++;await page.close();
 }
 navigationMs.sort((a,b)=>a-b);
 const p95=navigationMs[Math.floor(.95*(navigationMs.length-1))]||0;
 console.log("Client audit:",JSON.stringify({pages:checked,roles:roles.length,viewports:viewportSizes.map(v=>v.width),navigationSampleCount:navigationMs.length,p50NavigationMs:navigationMs[Math.floor(.5*(navigationMs.length-1))]||0,p95NavigationMs:p95,browserErrors:pageErrors.length}));
 assert.ok(p95<20000,"CI navigation p95 exceeded 20s; inspect performance regression");
 console.log("Layout checks passed:",checked);
}finally{await browser.close();}
