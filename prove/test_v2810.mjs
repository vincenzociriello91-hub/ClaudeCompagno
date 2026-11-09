import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// estrae terraSicura da main.js e la prova con un suolo finto
const src = readFileSync("./scripts/main.js", "utf8");
const corpo = src.match(/function terraSicura\(dim, l\) \{[\s\S]*?\n\}/)[0];
const pericoli = [{ x: 40, y: 97, z: 100, r: 8 }];
const inPericolo = (p) => pericoli.some((z) => Math.hypot(z.x - p.x, z.z - p.z) <= z.r && Math.abs(z.y - p.y) <= z.r);
const suolo = (dim, x, z) => (x === 48 ? { x, y: 97, z, liquido: true } : { x, y: 96, z, liquido: false });
const terraSicura = new Function("suolo", "inPericolo", corpo + "; return terraSicura;")(suolo, inPericolo);
const p = terraSicura({}, { x: 40.3, y: 97, z: 100.6 });
assert.ok(p && !inPericolo(p), "punto in zona pericolosa: " + JSON.stringify(p));
assert.notEqual(p.x, 48.5, "ha scelto l'acqua");
assert.ok(/salvataggi\.length >= 3/.test(src) && /ultimoSicuro = \{ \.\.\.altrove/.test(src), "logica dei salvataggi ripetuti assente");
console.log("test v2.8.10 ok", JSON.stringify(p));
