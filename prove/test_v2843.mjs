import assert from "node:assert/strict";
import { system, world } from "@minecraft/server";
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
  stopMoving() {}, moveToLocation() {}, jump() {}, lookAtBlock() {}, attack() {}, teleport(p) { this.location = p; } };
system.currentTick = 10; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
// tana di notte: i lavori in coda (legna) non devono farlo uscire subito al buio
world.getTimeOfDay = () => 15000;
mem.coda = [{ tipo: "raccogli", blocco: "legna", quantita: 2 }]; mem.compito = null;
bot.location = { x: 40.5, y: 64, z: 40.5 };
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
for (let i = 0; i < 8 && mem.compito?.tipo === "tana"; i++) { system.currentTick += 5; eseguiCompito(bot); }
assert.ok(mem.rifugio?.ok, "tana non riuscita");
assert.equal(mem.coda.length, 0, "di notte resta il lavoro in coda: " + JSON.stringify(mem.coda));
// di giorno la coda resta
world.getTimeOfDay = () => 3000; mem.rifugio = null;
mem.coda = [{ tipo: "raccogli", blocco: "legna", quantita: 2 }]; mem.compito = null;
bot.location = { x: 80.5, y: 64, z: 80.5 };
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
for (let i = 0; i < 8 && mem.compito?.tipo === "tana"; i++) { system.currentTick += 5; eseguiCompito(bot); }
assert.equal(mem.coda.length, 1);
delete world.getTimeOfDay;
console.log("test v2.8.43 ok");
