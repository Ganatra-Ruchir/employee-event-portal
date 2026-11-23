import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Create event has one entry point, on the event management page",()=>{
 const portal=source("src/components/elixir-portal.tsx");
 const dashboards=source("src/components/admin-workspace.tsx");
 assert.equal((portal.match(/> Create event<\/Action>/g)||[]).length,1);
 assert.match(portal,/view==="events"[^\n]*\n[^\n]*\n[^\n]*Create event<\/Action>/);
 assert.doesNotMatch(dashboards,/>\s*Create event\b/);
});

test("authenticated shell has one sign-out action and one responsive RSVP section",()=>{
 const portal=source("src/components/elixir-portal.tsx");
 assert.equal((portal.match(/className="ep-header-signout"/g)||[]).length,1);
 assert.doesNotMatch(portal,/className="ep-side-bottom"|className="ed-mobile-rsvp"/);
 assert.equal((portal.match(/cc-priority-registration/g)||[]).length,1);
});

test("public landing routes all entry points to their intended actions",()=>{
 const landing=source("src/components/public-landing.tsx");
 assert.ok((landing.match(/onClick=\{onEnter\}/g)||[]).length>=1,"sign-in actions share one supplied callback");
 assert.ok((landing.match(/href="\/signup"/g)||[]).length>=1,"employee signup exists");
 assert.ok((landing.match(/href="\/companies\/register"/g)||[]).length>=2,"company application is prominent");
 assert.match(landing,/Illustrative preview · not live data/,"sample metrics must not masquerade as verified statistics");
});
