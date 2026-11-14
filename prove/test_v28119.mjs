import assert from "node:assert/strict";
import { liberaInTana } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.119 — 14/11 18:37 UTC: chiuso nella tana a 145,60,292 ha preso danno da soffocamento; il salvataggio lo ha portato
// in superficie (142,64,294) di notte e un creeper lo ha ucciso. Ora nella tana libera lo spazio del corpo e resta dentro.
const blocchi = { "145,60,292": "minecraft:dirt", "145,61,292": "minecraft:gravel" };
let tp = null;
const comandi = [];
const dim = { id: "minecraft:overworld", runCommand: (c) => comandi.push(c), getEntities: () => [], getBlock: (p) => { const id = blocchi[`${p.x},${p.y},${p.z}`] ?? "minecraft:air";
  return { typeId: id, isAir: id === "minecraft:air", isLiquid: false, isSolid: id !== "minecraft:air", location: p }; } };
const bot = { dimension: dim, location: { x: 145.5, y: 60, z: 292.5 }, teleport: (p) => (tp = p), lookAtBlock() {}, attack() {},
  getComponent: () => ({ container: { size: 0, getItem: () => undefined }, getEquipment: () => undefined }),
  selectedSlotIndex: 0 };
mem.rifugio = { x: 145, y: 60, z: 292, ok: true };
assert.equal(liberaInTana(bot), true, "nella tana deve restare dentro");
assert.deepEqual(tp, { x: 145.5, y: 60, z: 292.5 }, "resta nella tana, non in superficie");
assert.equal(comandi.filter((c) => /setblock 145 6[01] 292 air destroy/.test(c)).length, 2, "deve liberare piedi e testa");
// fuori dalla tana: vale il salvataggio di sempre
bot.location = { x: 120.5, y: 64, z: 300.5 };
assert.equal(liberaInTana(bot), false);
mem.rifugio = null; bot.location = { x: 145.5, y: 60, z: 292.5 };
assert.equal(liberaInTana(bot), false, "senza tana chiusa non fa niente");
console.log("test v2.8.119 ok");
