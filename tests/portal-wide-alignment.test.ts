import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("shared alignment styles load last on all portal routes",()=>{
 for(const path of ["src/app/layout.tsx","src/app/page.tsx"]){
  const source=file(path);
  assert.match(source,/import "\.\/event-layout-polish\.css";\s*import "\.\/portal-wide-alignment\.css";/);
 }
});
test("shared layout preserves compact event registration and responsive KPI grids",()=>{
 const css=file("src/app/portal-wide-alignment.css");
 assert.match(css,/\.ep-compact-registration/);
 assert.match(css,/\.aw-metric-grid,\.ep-stats,\.v3-metrics,\.cc-kpi-grid/);
 assert.match(css,/\.cc-attendance \.cc-att-event/);
 assert.match(css,/@media\(max-width:640px\)/);
});
