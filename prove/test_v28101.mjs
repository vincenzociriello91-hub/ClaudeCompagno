import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.101 — 12/11 07:31-08:35: cunicolo, fattoria, "Creeper a pochi passi", tana, ogni 17 minuti per un'ora. Dopo una tana
// per un creeper accanto alla fattoria, la fattoria aspetta (ultimaFattoria nel futuro: il piano la salta per 25 minuti).
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: (q) => (q?.type ? [] : mostri),
  getBlock: (p) => ({ typeId: p.y <= 63 ? "minecraft:dirt" : "minecraft:air", isAir: p.y > 63, isLiquid: false, location: p }),
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", location: { x: q.x, y: 63, z: q.z } }) };
let mostri = [];
const base = { id: "bot", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, isSneaking: false, selectedSlotIndex: 0, dimension: dim,
  getComponent: (n) => /health/.test(n) ? { currentValue: 20 } : /equippable/.test(n) ? { getEquipment: () => undefined, setEquipment: () => true } : { container: { size: 36, getItem: () => undefined } },
  moveToLocation() {}, teleport(p) { this.location = p; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
mem.protettoFino = 0; mem.rifugio = null; mem.compito = null; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {};
mem.luoghi = { fattoria: { x: 12, y: 63, z: 12 } }; mem.ultimaFattoria = 0; mem.emergenzaT = 0; mem.tanaKo = 0;
system.currentTick = 5000;
mostri = [{ isValid: true, id: "c9", typeId: "minecraft:creeper", location: { x: 15.5, y: 64, z: 10.5 }, dimension: dim, applyDamage() {} }];
for (let i = 0; i < 3 && mem.compito?.tipo !== "tana"; i++) { system.currentTick += 20; difendi(bot); }
assert.equal(mem.compito?.tipo, "tana", "il creeper a 5 blocchi non ha fatto scavare la tana");
assert.ok(mem.ultimaFattoria > Date.now(), "dopo la tana per il creeper accanto alla fattoria, la fattoria non aspetta");
console.log("test v2.8.101 ok");
