import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:granite", amount: 63 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const posati = new Map();
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const k = `${p.x},${p.y},${p.z}`; const t = posati.get(k) ?? (p.y <= 63 ? "minecraft:grass_block" : "minecraft:air");
    return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, setType: (id) => posati.set(k, id) }; },
  getTopmostBlock: (q) => ({ typeId: "minecraft:grass_block", location: { x: q.x, y: 63, z: q.z } }), getEntities: () => [] };
const bot = { isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, dimension: dim, getComponent: (c) => c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined, setEquipment: () => true },
  stopMoving() {}, lookAtBlock() {}, navigateToLocation() { return { isFullPath: true, getPath: () => [] }; }, moveToLocation() {}, teleport(p) { this.ultimo = p; } };
system.currentTick = 10; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {}; mem.sospesi = [];
const blocchi = [[1, 0, 0, "minecraft:cobblestone"], [2, 0, 0, "minecraft:cobblestone"], [3, 0, 0, "minecraft:cobblestone"]];
assegna({ tipo: "costruisci", x: 10, y: 64, z: 10, descrizione: "rifugio", blocchi, routine: "notte_sicura" }, "piano");
for (let i = 0; i < 40 && mem.compito; i++) { system.currentTick += 4; eseguiCompito(bot); }
const graniti = [...posati.values()].filter((t) => t === "minecraft:granite").length;
assert.equal(graniti, 3, "rifugio non costruito col granito: " + JSON.stringify([...posati]));
assert.ok(bot.ultimo && bot.ultimo.x === 12.5 && bot.ultimo.y === 65 && bot.ultimo.z === 10.5, "non entra nel rifugio: " + JSON.stringify(bot.ultimo));
assert.equal(mem.rifugio.x, 12, "rifugio non registrato");
console.log("test v2.8.11/12 ok");
