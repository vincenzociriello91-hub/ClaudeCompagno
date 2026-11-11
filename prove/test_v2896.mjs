import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna, piazza } from "./scripts/azioni.js";
import { mem, protetti } from "./scripts/memoria.js";
// 2.8.96 — 11/11: 2401 blocchi protetti, quasi tutti tetti di tane del bot. La miniera si fermava su "blocchi protetti" e la
// fattoria non riparava le celle. Tetto e pareti della tana non si proteggono più; il resto (costruzioni) sì.
const blocchi = new Map();
const tipo = (p) => blocchi.get(`${p.x},${p.y},${p.z}`) ?? (p.y <= 63 ? "minecraft:dirt" : "minecraft:air");
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:dirt", amount: 16 }; slot[1] = { typeId: "minecraft:cobblestone", amount: 4 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => [],
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, isSolid: t !== "minecraft:air", location: p, setType: (id) => blocchi.set(`${p.x},${p.y},${p.z}`, id) }; },
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) blocchi.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); },
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", location: { x: q.x, y: 63, z: q.z } }) };
const base = { id: "bot", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, isSneaking: false, selectedSlotIndex: 0, dimension: dim,
  getComponent: (n) => /health/.test(n) ? { currentValue: 20 } : /equippable/.test(n) ? { getEquipment: () => undefined, setEquipment: () => true } : { container },
  teleport(p) { this.location = p; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
mem.protettoFino = 0; mem.rifugio = null; mem.compito = null; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
system.currentTick = 1000;
protetti.clear();
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
for (let i = 0; i < 8 && mem.compito; i++) { system.currentTick += 5; eseguiCompito(bot); }
assert.ok(mem.rifugio?.ok, "tana non fatta: " + JSON.stringify(mem.eventi.at(-1)));
const tetto = [62, 63].map((y) => tipo({ x: 10, y, z: 10 }));
assert.ok(tetto.every((t) => t !== "minecraft:air"), "tana senza tetto: " + tetto);
assert.equal(protetti.size, 0, "tetto della tana protetto: " + [...protetti].join(" "));
// una costruzione vera resta protetta
assert.equal(piazza(bot, { x: 30, y: 64, z: 30 }, "minecraft:cobblestone"), "ok");
assert.ok(protetti.has("o:30,64,30"), "il blocco di una costruzione non è più protetto");
console.log("test v2.8.96 ok");
