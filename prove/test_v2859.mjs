import assert from "node:assert/strict";
import { suolo, accanto, inPericolo } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// albero a 10,64..68,10 su terra a y 63: arrivando col teletrasporto non si deve finire dentro il tronco
const tipo = (p) => (p.x === 10 && p.z === 10 && p.y >= 64 && p.y <= 68 ? "minecraft:oak_log" : p.y <= 63 ? "minecraft:dirt" : "minecraft:air");
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p }; },
  getTopmostBlock: (q) => ({ location: { x: q.x, y: q.x === 10 && q.z === 10 ? 68 : 63, z: q.z } }) };
mem.pericoli = [];
assert.equal(tipo(suolo(dim, 10, 10)), "minecraft:oak_log", "premessa: suolo() sul tronco dà una cella di legno");
const g = accanto(dim, { x: 10, y: 66, z: 10 });
assert.ok(g && tipo(g) === "minecraft:air" && g.y === 64 && Math.abs(g.x - 10) + Math.abs(g.z - 10) > 0, "accanto() non dà un punto libero: " + JSON.stringify(g));
// zone nate da un salvataggio: scadono dopo 3 ore; le morti per acqua, cadute e lava restano (dalla 2.8.65 quelle per mostri scadono in 30 minuti: test_v2865)
const vecchio = Date.now() - 4 * 3600000;
mem.pericoli = [{ x: 0, y: 64, z: 0, r: 8, motivo: "grotta (caduta)", t: vecchio }, { x: 50, y: 64, z: 0, r: 12, motivo: "acqua (annegamento)", t: vecchio },
  { x: 100, y: 64, z: 0, r: 8, motivo: "grotta (caduta)", t: Date.now() }];
assert.equal(inPericolo({ x: 0, y: 64, z: 0 }), false, "caduta di 4 ore fa ancora pericolosa");
assert.equal(inPericolo({ x: 50, y: 64, z: 0 }), true, "morte dimenticata");
assert.equal(inPericolo({ x: 100, y: 64, z: 0 }), true, "caduta recente ignorata");
mem.pericoli = [];
console.log("test v2.8.59 ok");
