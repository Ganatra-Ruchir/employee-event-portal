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
 assert.equal((portal.match(/role="menuitem" onClick=\{\(\)=>\{setAccountMenuOpen\(false\);logout\(\);\}\}/g)||[]).length,1);\n assert.match(portal,/aria-label="Open profile and settings"/);
 assert.doesNotMatch(portal,/className="ep-side-bottom"|className="ed-mobile-rsvp"/);
 assert.equal((portal.match(/cc-priority-registration/g)||[]).length,1);
});

test("public landing has one login action and one signup link",()=>{
 const landing=source("src/components/public-landing.tsx");
 assert.equal((landing.match(/onClick=\{onEnter\}/g)||[]).length,1);
 assert.equal((landing.match(/href="\/signup"/g)||[]).length,1);
});
