import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.108 — 12/11 13:17: cercando legna lontano (56…152 blocchi) il bot restava fermo sulla riva: ogni giro "bloccato"
// dopo 15 secondi, la meta lontana non era caricata e veniva scartata. Ora salta 16 blocchi verso la meta e continua.
const caricato = (p) => Math.abs(p.x - 0) < 40; // oltre 40 blocchi la zona non è caricata
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => [],
  getBlock: (p) => { if (!caricato(p)) return undefined; const t = p.y <= 63 ? "minecraft:dirt" : "minecraft:air";
    return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, above() { return null; }, below() { return null; }, north() { return null; }, south() { return null; }, east() { return null; }, west() { return null; } }; },
  getTopmostBlock: (q) => (caricato(q) ? { typeId: "minecraft:dirt", location: { x: q.x, y: 63, z: q.z } } : undefined) };
const base = { id: "bot", isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, dimension: dim, selectedSlotIndex: 0,
  getComponent: () => ({ container: { size: 36, getItem: () => undefined }, getEquipment: () => undefined }),
  navigateToLocation: () => ({ isFullPath: false }), moveToLocation() {}, teleport(p) { this.location = p; } }; // non si muove mai da solo
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
mem.compito = null; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {}; mem.risorse = {}; mem.pericoli = [];
system.currentTick = 1000;
assegna({ tipo: "raccogli", blocco: "legna", quantita: 1 }, "piano");
mem.compito.stato.esplora = { x: 100, y: 64, z: 0 };
for (let i = 0; i < 40 && Math.abs(bot.location.x - 0.5) < 1; i++) { system.currentTick += 20; eseguiCompito(bot); }
assert.ok(bot.location.x > 12 && bot.location.x < 20, "da fermo doveva saltare ~16 blocchi verso la meta: " + JSON.stringify(bot.location));
assert.ok(mem.compito?.stato?.esplora, "la meta lontana non va scartata dopo il salto");
console.log("test v2.8.108 ok");
