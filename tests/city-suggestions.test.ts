import test from "node:test";
import assert from "node:assert/strict";
import {suggestCities} from "../src/lib/city-suggestions";
const cities=[{city:"Ahmedabad",state:"Gujarat"},{city:"Mumbai",state:"Maharashtra"},{city:"Surat",state:"Gujarat"},{city:"Ahmednagar",state:"Maharashtra"}];
test("city typeahead supports partial words and common misspellings",()=>{
 for(const q of ["ahe","ahemadbad","ahemdabad","ahmedabad","AHMEDA"])assert.equal(suggestCities(cities,q)[0]?.city,"Ahmedabad",q);
 assert.equal(suggestCities(cities,"sur")[0]?.city,"Surat");
 assert.equal(suggestCities(cities,"bombay")[0]?.city,"Mumbai");
 assert.equal(suggestCities(cities,"zzzzzzzz").length,0);
});
test("matching preserves actual state and distinguishes same-name cities",()=>{
 const data=[{city:"Springfield",state:"Illinois"},{city:"Springfield",state:"Missouri"}];
 assert.equal(suggestCities(data,"spring").length,2);
 assert.deepEqual(suggestCities(cities,"ahmedabad",1),[cities[0]]);
});
