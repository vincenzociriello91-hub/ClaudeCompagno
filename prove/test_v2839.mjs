import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:oak_sapling", amount: 5 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const blocchi = new Map();
const tipo = (p) => blocchi.get(`${p.x},${p.y},${p.z}`) ?? (p.y <= 63 ? "minecraft:grass_block" : p.y === 64 ? "minecraft:short_grass" : "minecraft:air");
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, setType: (id) => blocchi.set(`${p.x},${p.y},${p.z}`, id) }; },
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) blocchi.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); },
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", location: { x: q.x, y: 64, z: q.z } }), getEntities: () => [] };
const bot = { isValid: true, location: { x: 5.5, y: 64, z: 5.5 }, selectedSlotIndex: 0, dimension: dim,
  getComponent: (c) => c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined, setEquipment: () => true },
  stopMoving() {}, moveToLocation() {}, jump() {}, lookAtBlock() {}, attack() {}, teleport(p) { this.location = p; } };
system.currentTick = 10; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {};
// 1) prato con erba alta: il bosco deve piantare (prima "piantati 0 alberelli")
mem.luoghi = { casa: { x: 0, y: 64, z: 0 }, bosco: { x: 0, y: 64, z: 0 } }; mem.compito = null;
bot.location = { x: 1.5, y: 64, z: 1.5 };
assegna({ tipo: "bosco" }, "piano");
let ultimo = "";
for (let i = 0; i < 200 && mem.compito; i++) { system.currentTick += 5; bot.location = { x: 4.5, y: 64, z: 4.5 }; eseguiCompito(bot); }
const piantati = [...blocchi.values()].filter((t) => t === "minecraft:oak_sapling").length;
assert.ok(piantati >= 3, "alberelli piantati nell'erba: " + piantati);
// 2) fornace senza legna né banco: il messaggio dice la causa vera, non "né 8 pietre"
slot.fill(undefined); slot[0] = { typeId: "minecraft:cobblestone", amount: 28 };
mem.compito = null; mem.coda = [];
assegna({ tipo: "fornace", prereq: 3 }, "piano");
for (let i = 0; i < 20 && mem.compito; i++) { system.currentTick += 5; bot.location = { x: 0.5, y: 64, z: 2.5 }; eseguiCompito(bot); }
const txt = JSON.stringify(mem.esperienza);
assert.ok(!txt.includes("né 8 pietre"), "messaggio vecchio fuorviante: " + txt);
console.log("test v2.8.39 ok");
