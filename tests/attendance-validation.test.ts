import test from "node:test";
import assert from "node:assert/strict";
import {validWalkInEmployeeId,validWalkInPhone} from "../src/lib/attendance-validation";
test("walk-in phone accepts legitimate formatted numbers",()=>{
 for(const x of ["9876543210","+91 98765 43210","(079) 1234-5678"])assert.equal(validWalkInPhone(x),true,x);
});
test("walk-in phone rejects letters and short or too-long numbers",()=>{
 for(const x of ["", "123", "98765abc12","++919876543210","1234567890123456"])assert.equal(validWalkInPhone(x),false,x);
});
test("walk-in IDs are restricted to safe employee identifiers",()=>{
 assert.equal(validWalkInEmployeeId("ELX-1020"),true);
 assert.equal(validWalkInEmployeeId("EMP-ABC123"),true);
 assert.equal(validWalkInEmployeeId("abc 123"),false);
 assert.equal(validWalkInEmployeeId("foo@example.org"),false);
});
