import test from "node:test";
import assert from "node:assert/strict";
import {navigationForLevel,mayProvisionEmployees} from "../src/lib/v3-navigation";
test("root has organization controls but no direct employee creation",()=>{
 const nav=navigationForLevel("root");
 assert.deepEqual(nav.daily,["home","events","users"]);
 assert(nav.settings.includes("companies")&&nav.settings.includes("hierarchy"));
 assert.equal(mayProvisionEmployees("root"),false);
});
test("country/company admin has hierarchy, people and attendance",()=>{
 const nav=navigationForLevel("country_admin");
 assert(nav.daily.includes("people")&&nav.daily.includes("attendance"));
 assert(nav.settings.includes("hierarchy"));
 assert.equal(mayProvisionEmployees("country_admin"),true);
});
test("new Bihar state admin has People and Attendance but cannot manage hierarchy",()=>{
 const nav=navigationForLevel("state_admin");
 assert.deepEqual(nav.daily,["home","events","attendance","people"]);
 assert.deepEqual(nav.settings,[]);
 assert.equal(mayProvisionEmployees("state_admin"),true);
});
test("regular employee cannot see admin controls or provision accounts",()=>{
 const nav=navigationForLevel("employee");
 assert.deepEqual(nav.daily,["home","events"]);
 assert.deepEqual(nav.settings,["profile"]);
 assert.equal(mayProvisionEmployees("employee"),false);
});
