import assert from "node:assert/strict";
import { sogliaRitirata } from "./scripts/azioni.js";
// 2.8.130 — 17/11 07:52 UTC: 3 zombie insieme, vita da 9 a 3 in un secondo, ritirata solo a vita 4 e morto.
// Con 2 o più mostri vicini si arretra già a vita 10; contro uno solo come prima (6).
assert.equal(sogliaRitirata(1), 6);
assert.equal(sogliaRitirata(3), 10, "contro 3 zombie si arretra a vita 10");
assert.ok(9 <= sogliaRitirata(3), "il caso del 17/11 (vita 9, 3 zombie) deve arretrare");
console.log("test v2.8.130 ok");
