import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { vuotoSotto, eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
const mondo = (tipo) => ({ id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: /water|lava/.test(t), location: p, setType() {},
    above: () => ({ isAir: true, typeId: "minecraft:air" }), below: () => ({ isAir: false, typeId: "minecraft:dirt" }), north: () => ({ isAir: true, typeId: "minecraft:air" }),
    south: () => ({ isAir: true, typeId: "minecraft:air" }), east: () => ({ isAir: true, typeId: "minecraft:air" }), west: () => ({ isAir: true, typeId: "minecraft:air" }) }; },
  runCommand() {}, getTopmostBlock: (q) => ({ location: { x: q.x, y: 63, z: q.z } }), getEntities: () => [], spawnItem() {} });
// 1) caduta: terreno a 2 blocchi = salto normale; pozzo = vuoto; lava = pericolo
const piano = mondo((p) => (p.y <= 63 ? "minecraft:dirt" : "minecraft:air"));
assert.equal(vuotoSotto(piano, { x: 0.5, y: 66.2, z: 0.5 }), false, "salto da un albero preso per una grotta");
assert.equal(vuotoSotto(piano, { x: 0.5, y: 80, z: 0.5 }), true, "caduta lunga non riconosciuta");
assert.equal(vuotoSotto(mondo((p) => (p.y <= 63 ? "minecraft:lava" : "minecraft:air")), { x: 0.5, y: 65, z: 0.5 }), true, "lava sotto ignorata");
// 2) tronco alto (y 68, bot a terra a y 64, accanto): si taglia da sotto invece di girare a vuoto 10 minuti
const tronchi = new Set(["10,68,10"]);
const bosco = mondo((p) => (tronchi.has(`${p.x},${p.y},${p.z}`) ? "minecraft:oak_log" : p.y <= 63 ? "minecraft:dirt" : "minecraft:air"));
const slot = Array(36).fill(undefined);
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, x) => { slot[i] = x; }, addItem: (x) => { slot[0] = x; } };
let mosso = 0;
const bot = { isValid: true, location: { x: 11.5, y: 64, z: 10.5 }, selectedSlotIndex: 0, dimension: bosco,
  getComponent: (c) => (c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined, setEquipment: () => true }),
  stopMoving() {}, lookAtBlock() {}, attack() {}, jump() {}, breakBlock: () => true, teleport(p) { this.location = p; },
  navigateToLocation: () => { mosso++; return { isFullPath: false }; }, moveToLocation() { mosso++; } };
system.currentTick = 1000; mem.coda = []; mem.compito = null; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {}; mem.pericoli = []; mem.risorse = {};
assegna({ tipo: "raccogli", blocco: "legna", quantita: 1 }, "test");
const prima = bosco.getBlock;
bosco.getBlock = (p) => { const b = prima(p); b.setType = () => tronchi.delete(`${p.x},${p.y},${p.z}`); return b; };
bosco.runCommand = (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) tronchi.delete(`${m[1]},${m[2]},${m[3]}`); };
for (let i = 0; i < 12 && mem.compito; i++) { system.currentTick += 5; eseguiCompito(bot); }
assert.equal(tronchi.size, 0, "tronco alto non tagliato da sotto");
assert.equal(mosso, 0, "ha provato a camminare verso un tronco già a portata");
console.log("test v2.8.61 ok");
