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
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
eseguiCompito(bot);
assert.equal(tipo({ x: 5, y: 63, z: 5 }), "minecraft:air", "non ha scavato");
assert.equal(tipo({ x: 5, y: 62, z: 5 }), "minecraft:air", "non ha scavato abbastanza");
assert.equal(bot.location.y, 62, "non è sceso nella tana");
assert.equal(tipo({ x: 5, y: 64, z: 5 }), "minecraft:dirt", "tana non chiusa sopra la testa");
assert.equal(mem.rifugio?.y, 62, "rifugio non registrato");
// sopra una grotta: niente tana lì (dalla 2.8.23 prova un posto vicino senza grotta)
blocchi.clear(); blocchi.set("9,61,9", "minecraft:air"); bot.location = { x: 9.5, y: 64, z: 9.5 }; mem.compito = null;
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano"); eseguiCompito(bot);
assert.ok(!(Math.floor(bot.location.x) === 9 && Math.floor(bot.location.z) === 9 && bot.location.y < 64), "è sceso sopra una grotta");
// sopra un blocco basso (piedi a 63.94): la tana si chiude lo stesso
blocchi.clear(); bot.location = { x: 20.5, y: 63.94, z: 20.5 }; mem.compito = null; slot[0] = { typeId: "minecraft:dirt", amount: 3 };
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano"); eseguiCompito(bot);
assert.equal(bot.location.y, 62, "sentiero: non è sceso");
assert.equal(tipo({ x: 20, y: 64, z: 20 }), "minecraft:dirt", "sentiero: tana non chiusa");
console.log("test v2.8.13/14 ok");
