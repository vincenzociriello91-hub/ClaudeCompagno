import assert from "node:assert/strict";
import { suolo } from "./scripts/azioni.js";
import { errore, sessione } from "./scripts/memoria.js";
const aria = (p) => ({ typeId: "minecraft:air", isAir: true, isLiquid: false, location: p });
const dim = { heightRange: { min: -64, max: 320 }, getBlock: (p) => p.y <= 63 ? { typeId: "minecraft:stone", isAir: false, isLiquid: false, location: p } : aria(p),
  getTopmostBlock: (q) => ({ typeId: "minecraft:stone", isAir: false, location: { x: q.x, y: 319, z: q.z } }) };
dim.getBlock = (p) => p.y === 319 ? { typeId: "minecraft:stone", isAir: false, isLiquid: false, location: p } : aria(p);
assert.equal(suolo(dim, 0, 0), null, "punto al tetto del mondo non valido");
dim.getTopmostBlock = (q) => ({ typeId: "minecraft:grass_block", isAir: false, location: { x: q.x, y: 63, z: q.z } });
dim.getBlock = (p) => p.y <= 63 ? { typeId: "minecraft:grass_block", isAir: false, isLiquid: false, location: p } : aria(p);
assert.equal(suolo(dim, 0, 0).y, 64);
const prima = sessione.errori.length;
for (let i = 0; i < 50; i++) errore("ciclo", new Error("fuori dal mondo"));
assert.equal(sessione.errori.length - prima, 1, "errori ripetuti non raggruppati");
console.log("test v2.6.6 ok");
