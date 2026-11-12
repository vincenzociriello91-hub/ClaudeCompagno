import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.100 — 12/11: 6 tane di fila nella sabbia della palude (134-140,57-59,338): la sabbia cadeva nella buca, "stavo
// soffocando in un blocco" e il piccone di ferro si è rotto riscavando. La tana non si scava dove la colonna è di sabbia.
const blocchi = new Map();
const tipo = (p) => blocchi.get(`${p.x},${p.y},${p.z}`) ?? (p.y > 63 ? "minecraft:air" : p.x === 10 && p.z === 10 && p.y >= 60 ? "minecraft:sand" : "minecraft:dirt");
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:dirt", amount: 16 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => [],
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, isSolid: t !== "minecraft:air", location: p, setType: (id) => blocchi.set(`${p.x},${p.y},${p.z}`, id) }; },
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) blocchi.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); },
  getTopmostBlock: (q) => ({ typeId: tipo({ x: q.x, y: 63, z: q.z }), location: { x: q.x, y: 63, z: q.z } }) };
const base = { id: "bot", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, isSneaking: false, selectedSlotIndex: 0, dimension: dim,
  getComponent: (n) => /health/.test(n) ? { currentValue: 20 } : /equippable/.test(n) ? { getEquipment: () => undefined, setEquipment: () => true } : { container },
  teleport(p) { this.location = p; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
mem.protettoFino = 0; mem.rifugio = null; mem.compito = null; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
system.currentTick = 1000;
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
for (let i = 0; i < 8 && mem.compito; i++) { system.currentTick += 5; eseguiCompito(bot); }
assert.ok(mem.rifugio?.ok, "tana non fatta: " + JSON.stringify(mem.eventi.at(-1)));
assert.ok(!(mem.rifugio.x === 10 && mem.rifugio.z === 10), "tana scavata nella colonna di sabbia: " + JSON.stringify(mem.rifugio));
console.log("test v2.8.100 ok");
