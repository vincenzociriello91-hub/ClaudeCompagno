import assert from "node:assert/strict";
import { riordinaInventario, contaOggetti } from "./scripts/azioni.js";
// 2.8.129 — 16/11: inventario pieno con ~550 ciottoli (9 pile): 15 mucche uccise e nessuna bistecca raccolta in tutto il giorno,
// cibo sempre sotto 5 (basi del maestro al 50%). Ora tiene al massimo 2 pile di ciottoli.
const it = (id, n = 1) => ({ typeId: `minecraft:${id}`, amount: n });
const slot = Array(36).fill(undefined);
for (let i = 0; i < 9; i++) slot[i] = it("cobblestone", 64);
for (let i = 9; i < 36; i++) slot[i] = it(`utile_${i}`);
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, x) => { slot[i] = x && x.amount > 0 ? x : undefined; }, addItem() {} };
const bot = { isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, getComponent: (c) => (c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined }) };
riordinaInventario(bot);
assert.equal(contaOggetti(bot, "minecraft:cobblestone"), 128, "tiene 2 pile di ciottoli");
assert.ok(slot.filter((x) => !x).length >= 7, `posti liberi: ${slot.filter((x) => !x).length}`);
assert.ok(slot.slice(9).every(Boolean), "non butta altro");
console.log("test v2.8.129 ok");
