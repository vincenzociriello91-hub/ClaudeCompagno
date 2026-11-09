import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:dirt", amount: 3 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const blocchi = new Map();
const tipo = (p) => blocchi.get(`${p.x},${p.y},${p.z}`) ?? (p.y <= 63 ? "minecraft:dirt" : "minecraft:air");
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, setType: (id) => blocchi.set(`${p.x},${p.y},${p.z}`, id) }; },
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) blocchi.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); },
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", location: { x: q.x, y: 63, z: q.z } }), getEntities: () => [] };
const bot = { isValid: true, location: { x: 5.5, y: 64, z: 5.5 }, selectedSlotIndex: 0, dimension: dim,
  getComponent: (c) => c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined, setEquipment: () => true },
  stopMoving() {}, lookAtBlock() {}, attack() {}, teleport(p) { this.location = p; } };
system.currentTick = 10; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
// acqua accanto alla buca: la tana non va scavata lì (annegato nella tana a 107,61,422)
blocchi.set("21,62,20", "minecraft:water"); blocchi.set("21,63,20", "minecraft:water");
bot.location = { x: 20.5, y: 64, z: 20.5 };
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
eseguiCompito(bot);
assert.ok(!(Math.floor(bot.location.x) === 20 && Math.floor(bot.location.z) === 20 && bot.location.y < 64), "tana scavata accanto all'acqua: " + JSON.stringify(bot.location));
assert.equal(tipo({ x: 20, y: 62, z: 20 }), "minecraft:dirt", "ha scavato accanto all'acqua");
console.log("test v2.8.33 ok");
