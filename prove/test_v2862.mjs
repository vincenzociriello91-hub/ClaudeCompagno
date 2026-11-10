import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:dirt", amount: 8 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
// palude: acqua in superficie per 5 blocchi intorno al bot, terra asciutta più in là
const bagnato = (p) => Math.abs(p.x - 40) <= 5 && Math.abs(p.z - 40) <= 5;
const blocchi = new Map();
const tipo = (p) => blocchi.get(`${p.x},${p.y},${p.z}`) ?? (p.y <= 62 ? "minecraft:dirt" : p.y === 63 ? (bagnato(p) ? "minecraft:water" : "minecraft:dirt") : "minecraft:air");
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: /water/.test(t), location: p, setType: (id) => blocchi.set(`${p.x},${p.y},${p.z}`, id) }; },
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) blocchi.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); },
  getTopmostBlock: (q) => ({ typeId: tipo({ x: q.x, y: 63, z: q.z }), location: { x: q.x, y: 63, z: q.z } }), getEntities: () => [] };
const bot = { isValid: true, location: { x: 40.5, y: 64, z: 40.5 }, selectedSlotIndex: 0, dimension: dim,
  getComponent: (c) => c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined, setEquipment: () => true },
  stopMoving() {}, lookAtBlock() {}, attack() {}, teleport(p) { this.location = p; } };
system.currentTick = 10; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {}; mem.compito = null; mem.pericoli = [];
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
for (let i = 0; i < 8 && mem.compito; i++) { system.currentTick += 5; eseguiCompito(bot); }
assert.ok(bot.location.y < 64, "nessuna tana: " + JSON.stringify(bot.location));
assert.ok(!bagnato({ x: Math.floor(bot.location.x), z: Math.floor(bot.location.z) }), "tana scavata nell'acqua");
// crafta stick senza assi né tronchi: va a far legna invece di fallire
slot.fill(undefined); mem.coda = []; mem.compito = null;
assegna({ tipo: "crafta", oggetto: "stick", quantita: 4 }, "test");
system.currentTick += 5; eseguiCompito(bot);
assert.deepEqual(mem.coda.map((p) => `${p.tipo}:${p.blocco ?? p.oggetto}`), ["raccogli:legna", "crafta:stick"], "niente raccolta di legna: " + JSON.stringify(mem.coda));
mem.coda = []; mem.compito = null;
console.log("test v2.8.62 ok");
