import assert from "node:assert/strict";
import { gestisciFame } from "./scripts/azioni.js";
// 2.8.99 — 11/11 22:17: wheat x6 in tasca, fame 18 e poi giù, nessun cibo. Il pane si faceva solo a fine visita alla fattoria
// (fallita in acqua). Ora, con fame e niente da mangiare, il grano diventa pane e lo mangia.
const slots = Array(36).fill(undefined); slots[0] = { typeId: "minecraft:wheat", amount: 6 };
const c = { size: 36, getItem: (i) => slots[i], setItem: (i, v) => { slots[i] = v && v.amount > 0 ? v : undefined; },
  addItem(it) { const i = slots.findIndex((x) => !x); slots[i] = it; }, swapItems: (a, b) => { const t = slots[a]; slots[a] = slots[b]; slots[b] = t; } };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => [],
  getBlock: (p) => { const t = p.x === 11 && p.y === 64 && p.z === 10 ? "minecraft:crafting_table" : p.y <= 63 ? "minecraft:dirt" : "minecraft:air";
    return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, setType() {} }; } };
let usati = 0;
const bot = { id: "bot", location: { x: 10.5, y: 64, z: 10.5 }, dimension: dim, selectedSlotIndex: 0, lookAtBlock() {},
  getComponent: (n) => n === "minecraft:player.hunger" ? { currentValue: 14 } : n === "minecraft:health" ? { currentValue: 16 } : n === "minecraft:inventory" ? { container: c } : /equippable/.test(n) ? { getEquipment: () => undefined, setEquipment: () => true } : null,
  useItemInSlot: () => usati++, stopUsingItem() {}, addEffect() {} };
assert.equal(gestisciFame(bot, false), true, "con 6 di grano e fame 14 non ha fatto il pane per mangiare");
assert.equal(usati, 1);
const pane = slots.filter((x) => x?.typeId === "minecraft:bread").reduce((n, x) => n + x.amount, 0);
assert.equal(pane, 2, "6 di grano devono diventare 2 pani: " + JSON.stringify(slots.filter(Boolean)));
console.log("test v2.8.99 ok");
