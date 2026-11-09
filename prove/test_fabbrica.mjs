import assert from "node:assert/strict";
import { fabbrica, contaOggetti } from "./scripts/azioni.js";
// inventario finto con 3 tronchi: deve fare assi e bastoni da solo e poi la spada di legno (senza banco nei paraggi: il banco serve)
const slots = Array(36).fill(null); slots[0] = { typeId: "minecraft:oak_log", amount: 3, maxAmount: 64 };
const c = { size: 36, getItem: (i) => slots[i] ?? undefined, setItem: (i, v) => { slots[i] = v ?? null; },
  addItem: (st) => { const i = slots.findIndex((s) => s && s.typeId === st.typeId) ; if (i >= 0) slots[i].amount += st.amount; else slots[slots.indexOf(null)] = st; } };
const bot = { getComponent: (n) => n === "minecraft:equippable" ? { getEquipment: () => undefined, setEquipment: () => true } : { container: c }, location: { x: 0, y: 64, z: 0 }, dimension: { getBlock: () => undefined, heightRange: { min: -64, max: 320 } } };
const [ok, msg] = fabbrica(bot, "stick", 4);
assert.ok(ok, msg);
assert.equal(contaOggetti(bot, "minecraft:stick"), 4);
assert.equal(contaOggetti(bot, "#assi"), 2); // 1 tronco -> 4 assi, 2 usate per 4 bastoni
assert.equal(contaOggetti(bot, "#tronco"), 2);
console.log("test fabbrica ok");
