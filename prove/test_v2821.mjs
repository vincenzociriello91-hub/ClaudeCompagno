import assert from "node:assert/strict";
import { gestisciFame } from "./scripts/azioni.js";
function bot(fame, items) {
  const slots = Array(36).fill(null); items.forEach((it, i) => (slots[i] = it));
  const c = { size: 36, getItem: (i) => slots[i], setItem: (i, v) => (slots[i] = v), swapItems: (a, b) => { const t = slots[a]; slots[a] = slots[b]; slots[b] = t; } };
  const b = { usati: 0, selectedSlotIndex: 0, getComponent: (n) => n === "minecraft:player.hunger" ? { currentValue: fame } : n === "minecraft:health" ? { currentValue: 18 } : n === "minecraft:inventory" ? { container: c } : null,
    useItemInSlot: () => b.usati++, stopUsingItem() {}, addEffect() {} };
  return b;
}
const quasiPieno = bot(12, [{ typeId: "minecraft:chicken", amount: 2 }]);
assert.equal(gestisciFame(quasiPieno, false), false, "con fame 12 il pollo crudo si tiene da cuocere");
const affamato = bot(3, [{ typeId: "minecraft:chicken", amount: 2 }]);
assert.equal(gestisciFame(affamato, false), true, "con fame 3 deve mangiare il pollo crudo");
console.log("test v2.8.21 ok");
