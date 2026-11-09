import assert from "node:assert/strict";
import { ariaSopra } from "./scripts/azioni.js";
// tronco da y 64 a 69, chioma 70-72, aria sopra: il bot è dentro il tronco a y 65
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => p.y < 64 ? { typeId: "minecraft:dirt", isAir: false } : p.y <= 69 ? { typeId: "minecraft:oak_log", isAir: false } : p.y <= 72 ? { typeId: "minecraft:oak_leaves", isAir: false } : { typeId: "minecraft:air", isAir: true } };
const g = ariaSopra(dim, { x: 0.5, y: 65, z: 0.5 });
assert.deepEqual(g, { x: 0, y: 73, z: 0 }, "deve uscire sopra la chioma, non dentro il tronco: " + JSON.stringify(g));
assert.equal(ariaSopra({ ...dim, getBlock: () => ({ typeId: "minecraft:stone", isAir: false }) }, { x: 0, y: 10, z: 0 }), null);
console.log("test v2.8.20 ok");
