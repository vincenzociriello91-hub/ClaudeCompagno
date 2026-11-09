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
// blocco che non si scava sotto i piedi (bedrock): prova il posto successivo invece di arrendersi
blocchi.set("40,62,40", "minecraft:bedrock");
bot.location = { x: 40.5, y: 64, z: 40.5 }; mem.compito = null;
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
for (let i = 0; i < 6 && mem.compito; i++) { system.currentTick += 5; eseguiCompito(bot); }
assert.ok(bot.location.y < 64, "nessuna tana scavata: " + JSON.stringify(bot.location));
assert.ok(!(Math.floor(bot.location.x) === 40 && Math.floor(bot.location.z) === 40), "scavata sopra la bedrock");
console.log("test v2.8.36 ok");
