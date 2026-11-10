import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna, contaOggetti } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 10/11: "fondi raw_copper x2" assegnato a ogni alba e mai finito: il bot non arrivava alla fornace fissa (40 blocchi) e il
// compito restava in cammino fino a notte. Dopo 90 secondi senza arrivare ci si porta accanto e si fonde.
const F = { x: 40, y: 64, z: 0 };
const tipo = (p) => (p.x === F.x && p.y === F.y && p.z === F.z ? "minecraft:furnace" : p.y <= 63 ? "minecraft:dirt" : "minecraft:air");
const slots = Array(36).fill(null);
slots[0] = { typeId: "minecraft:raw_copper", amount: 2, maxAmount: 64 }; slots[1] = { typeId: "minecraft:coal", amount: 4, maxAmount: 64 };
const c = { size: 36, getItem: (i) => slots[i] ?? undefined, setItem: (i, v) => { slots[i] = v && v.amount > 0 ? v : null; },
  addItem: (st) => { const i = slots.findIndex((s) => s && s.typeId === st.typeId); if (i >= 0) slots[i].amount += st.amount; else slots[slots.indexOf(null)] = st; } };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => [],
  getBlock: (p) => { const q = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) }; const t = tipo(q); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: q }; },
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", location: { x: q.x, y: 63, z: q.z } }) };
// il bot "cammina" ma gira in tondo: non resta fermo (quindi niente "bloccato") e non arriva mai
let passo = 0;
const bot = { id: "bot", isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, dimension: dim, selectedSlotIndex: 0,
  getComponent: (n) => n === "minecraft:equippable" ? { getEquipment: () => undefined, setEquipment: () => true } : { container: c },
  stopMoving() {}, jump() {}, lookAtBlock() {}, attack() {}, moveToLocation() {},
  navigateToLocation() { passo++; this.location = { x: 0.5 + (passo % 2) * 3, y: 64, z: 0.5 }; return { isFullPath: true }; },
  teleport(p) { this.location = { ...p }; } };
mem.modalita = "autonomo"; mem.esperienza = {}; mem.coda = []; mem.compito = null; mem.luoghi = { fornace: { ...F } };
system.currentTick = 50000;
assegna({ tipo: "fondi", oggetto: "raw_copper", quantita: 2 }, "piano");
for (let i = 0; i < 400 && mem.compito; i++) { system.currentTick += 20; eseguiCompito(bot); }
assert.equal(mem.compito, null, "dopo 2 minuti e mezzo sta ancora camminando verso la fornace");
assert.equal(contaOggetti(bot, "minecraft:copper_ingot"), 2, "non ha fuso il rame");
console.log("test v2.8.77 ok");
