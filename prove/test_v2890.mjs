import assert from "node:assert/strict";
import { riordinaInventario } from "./scripts/azioni.js";
// 2.8.90 — 11/11 12:06: con l'inventario quasi pieno il bot ha buttato le 3 ossa, che dalla 2.8.86 servono per la farina
// d'ossa della fattoria. Ora le ossa restano; si butta prima la ghiaia.
const it = (id, n = 1) => ({ typeId: `minecraft:${id}`, amount: n });
const slot = Array(36).fill(undefined);
[it("bone", 3), it("gravel", 5), it("leather", 2), it("arrow", 2)].forEach((x, i) => { slot[i] = x; });
for (let i = 4; i < 35; i++) slot[i] = it(`utile_${i}`);
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, x) => { slot[i] = x && x.amount > 0 ? x : undefined; }, addItem() {} };
const bot = { isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, getComponent: (c) => (c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined }) };
riordinaInventario(bot);
assert.equal(slot.filter((x) => x?.typeId === "minecraft:bone").reduce((n, x) => n + x.amount, 0), 3, "ha buttato le ossa");
console.log("test v2.8.90 ok");
