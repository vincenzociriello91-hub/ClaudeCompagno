import assert from "node:assert/strict";
import { difendi } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// rinato protetto dopo una raffica di morti: niente combattimenti finché dura la protezione
mem.protettoFino = Date.now() + 60000;
assert.equal(difendi({ isValid: true, location: { x: 0, y: 64, z: 0 } }), false);
mem.protettoFino = 0;
console.log("test v2.8.54 ok");
