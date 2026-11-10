import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// tana accanto a una grotta: le pareti aperte si tappano (mostri e frecce entravano di lato)
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:dirt", amount: 8 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const blocchi = new Map();
const tipo = (p) => blocchi.get(`${p.x},${p.y},${p.z}`) ?? (p.y <= 63 ? "minecraft:dirt" : "minecraft:air");
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, setType: (id) => blocchi.set(`${p.x},${p.y},${p.z}`, id) }; },
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) blocchi.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); },
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", location: { x: q.x, y: 63, z: q.z } }), getEntities: () => [] };
const bot = { isValid: true, location: { x: 40.5, y: 64, z: 40.5 }, selectedSlotIndex: 0, dimension: dim,
  getComponent: (c) => c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined, setEquipment: () => true },
  stopMoving() {}, lookAtBlock() {}, attack() {}, teleport(p) { this.location = p; } };
system.currentTick = 10; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {}; mem.compito = null;
blocchi.set("41,63,40", "minecraft:air"); blocchi.set("41,62,40", "minecraft:air"); // grotta a est della buca
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
for (let i = 0; i < 6 && mem.compito; i++) { system.currentTick += 5; eseguiCompito(bot); }
assert.equal(bot.location.y, 62, "tana non scavata");
assert.equal(tipo({ x: 41, y: 63, z: 40 }), "minecraft:dirt", "parete alta rimasta aperta");
assert.equal(tipo({ x: 41, y: 62, z: 40 }), "minecraft:dirt", "parete bassa rimasta aperta");
console.log("test v2.8.58 ok");
