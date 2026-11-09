import assert from "node:assert/strict";
import { suolo } from "./scripts/azioni.js";
// lago: fondale di sabbia a y 50, acqua fino a 62; getTopmostBlock salta l'acqua e dà il fondale
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => (p.y <= 50 ? { typeId: "minecraft:sand", isAir: false, isLiquid: false } : p.y <= 62 ? { typeId: "minecraft:water", isAir: false, isLiquid: true } : { typeId: "minecraft:air", isAir: true, isLiquid: false }),
  getTopmostBlock: (q) => ({ typeId: "minecraft:sand", location: { x: q.x, y: 50, z: q.z } }) };
const g = suolo(dim, 0, 0);
assert.ok(g && g.liquido, "fondale del lago scambiato per terra asciutta: " + JSON.stringify(g));
console.log("test v2.8.19 ok");
