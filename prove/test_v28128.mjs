import assert from "node:assert/strict";
import { celleBozzolo, sottoterra } from "./scripts/azioni.js";
// 2.8.128 — 16/11 15:22-15:48 UTC: in miniera a y 17 di notte la tana falliva ("acqua o grotte tutto intorno", 8 volte) e il
// rifugio da 34 blocchi pure ("blocchi irraggiungibili", 8 volte). Sottoterra ora si chiude in un bozzolo di pietra.
assert.equal(sottoterra({ location: { x: 149, y: 17, z: 252 } }), true, "a y 17 è sottoterra");
assert.equal(sottoterra({ location: { x: 79, y: 84, z: 230 } }), false, "a casa (y 84) no");
const c = celleBozzolo({ x: 0, y: 17, z: 0 });
assert.equal(c.length, 10, "4 lati x 2 altezze + soffitto + pavimento");
assert.ok(!c.some((q) => q.x === 0 && q.z === 0 && (q.y === 17 || q.y === 18)), "mai un blocco su piedi o testa");
assert.ok(c.some((q) => q.x === 0 && q.z === 0 && q.y === 19) && c.some((q) => q.x === 0 && q.z === 0 && q.y === 16));
console.log("test v2.8.128 ok");
