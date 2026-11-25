import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("event image stays inside a positioned 16:9 frame, rather than overlaying the page",()=>{
 const css=source("src/app/event-layout-polish.css");
 const component=source("src/components/elixir-portal.tsx");
 assert.match(component,/ep-detail-layout ep-event-sketch-layout/);
 assert.match(component,/ep-event-sketch-main/);
 assert.match(css,/\.ep-event-sketch-layout \.ep-banner\.ed-event-detail-preview\s*\{[^}]*position:relative!important/);
 assert.match(css,/\.ep-event-sketch-layout \.ed-cover,\s*\.ep-shell\.ep-shell \.ep-event-sketch-layout \.ed-cover-wide\s*\{[^}]*position:relative!important/);
 assert.doesNotMatch(css,/\.ep-event-sketch-layout \.ed-cover-wide\s*\{[^}]*position:absolute!important/);
 assert.match(css,/\.ep-event-sketch-layout \.ed-cover>img\s*\{[^}]*object-fit:cover!important/);
 assert.match(css,/\.ep-event-sketch-layout \.ep-banner\.ed-event-detail-preview\s*\{[^}]*aspect-ratio:16\/9!important/);
});

test("participants list is initially collapsed and requires explicit expansion",()=>{
 const component=source("src/components/elixir-portal.tsx");
 assert.match(component,/const \[showParticipants,setShowParticipants\]=useState\(false\)/);
 assert.match(component,/Show all participants/);
 assert.match(component,/\{showParticipants&&<>\s*<div className="ep-participant-search"/);
});

test("account menu and event layout have no separate My events page",()=>{
 const component=source("src/components/elixir-portal.tsx");
 assert.doesNotMatch(component,/view==="registrations"/);
 assert.match(component,/ep-account-dropdown/);
 assert.match(component,/ep-event-bottom-grid/);
});
