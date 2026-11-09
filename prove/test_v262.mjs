import assert from "node:assert/strict";
import { fabbrica, contaOggetti } from "./scripts/azioni.js";
import { ROUTINE } from "./scripts/schemi.js";
const slots = Array(36).fill(null); slots[0] = { typeId: "minecraft:copper_ingot", amount: 8, maxAmount: 64 };
const c = { size: 36, getItem: (i) => slots[i] ?? undefined, setItem: (i, v) => { slots[i] = v ?? null; },
  addItem: (st) => { const i = slots.findIndex((s) => s && s.typeId === st.typeId); if (i >= 0) slots[i].amount += st.amount; else slots[slots.indexOf(null)] = st; } };
const banco = { typeId: "minecraft:crafting_table", isAir: false, isLiquid: false, location: { x: 1, y: 64, z: 0 } };
let indossata = null;
const bot = { getComponent: (n) => n === "minecraft:equippable" ? { getEquipment: () => undefined, setEquipment: (sl, it) => { indossata = it?.typeId; return true; } } : { container: c }, location: { x: 0.5, y: 64, z: 0.5 },
  dimension: { heightRange: { min: -64, max: 320 }, getBlock: (p) => (Math.floor(p.x) === 1 && Math.floor(p.y) === 64 && Math.floor(p.z) === 0 ? banco : { typeId: "minecraft:air", isAir: true, location: p }) } };
const [ok, msg] = fabbrica(bot, "copper_chestplate");
assert.ok(ok, msg); assert.equal(indossata ?? (contaOggetti(bot, "minecraft:copper_chestplate") ? "minecraft:copper_chestplate" : null), "minecraft:copper_chestplate", "corazza né in tasca né indossata"); assert.equal(contaOggetti(bot, "minecraft:copper_ingot"), 0);
assert.equal(ROUTINE.armatura_rame.passi.length, 5);
console.log("test v2.6.2 ok");
