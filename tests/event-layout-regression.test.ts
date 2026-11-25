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

test("event About card shows host and attendee summary without Participants panel",()=>{
 const component=source("src/components/elixir-portal.tsx");
 assert.match(component,/ep-event-about-community/);
 assert.match(component,/ep-event-host/);
 assert.match(component,/ep-event-attendee-heading/);
 assert.match(component,/See attendees/);
 assert.doesNotMatch(component,/className="ep-panel ep-participants"/);
 assert.doesNotMatch(component,/Show all participants/);
});

test("account menu and event layout have no separate My events page",()=>{
 const component=source("src/components/elixir-portal.tsx");
 assert.doesNotMatch(component,/view==="registrations"/);
 assert.match(component,/ep-account-dropdown/);
 assert.match(component,/ep-event-about-community/);
});

test("event registration uses a compact count-action-management row",()=>{
 const component=source("src/components/elixir-portal.tsx");
 const css=source("src/app/event-layout-polish.css");
 assert.match(component,/className="ep-panel ep-detail-side ed-linktree-registration cc-priority-registration ep-compact-registration"/);
 assert.match(component,/ep-compact-registration-stats/);
 assert.match(component,/ep-compact-registration-action/);
 assert.match(component,/ep-compact-registration-manage/);
 assert.doesNotMatch(component,/className="ed-rsvp-count"/);
 assert.doesNotMatch(component,/className="ed-rsvp-progress"/);
 assert.match(css,/\.ep-detail-side\.ep-compact-registration\{/);
 assert.match(css,/grid-template-columns:minmax\(88px,.22fr\)/);
});
