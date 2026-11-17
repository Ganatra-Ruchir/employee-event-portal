import {chromium} from "playwright";
import assert from "node:assert/strict";
const base=process.env.BASE_URL||"http://127.0.0.1:3000";
const roles=[
 ["admin@elixir.example",["overview","events","accounts","companies","invitations","hierarchy","profile"]],
 ["country@micron.example",["overview","events","attendance","people","registrations","hierarchy","profile"]],
 ["state@microsoft.example",["overview","events","attendance","people","profile"]],
 ["employee@elixir.example",["overview","events","registrations","profile"]]
];
const viewportSizes=[{width:2300,height:1100},{width:1440,height:900},{width:390,height:844}];
const browser=await chromium.launch({headless:true});
let checked=0;
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
    await page.goto(base+"/"+route);
    await page.locator(".ep-shell .ep-main").waitFor();
    await page.locator(".ep-sidebar [aria-current=page]").waitFor();
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
    checked++;console.log("PASS",label);
   }
   assert.deepEqual(errors,[],email+": browser errors");
   await context.close();
  }
 }
 for(const route of ["/","/signup","/admin/activate"]){
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(base+route);
  await page.waitForLoadState("domcontentloaded");
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),route+": public mobile overflow");
  checked++;console.log("PASS public",route);await page.close();
 }
 console.log("Layout checks passed:",checked);
}finally{await browser.close();}
