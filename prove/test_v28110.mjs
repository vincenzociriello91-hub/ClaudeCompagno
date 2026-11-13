import assert from "node:assert/strict";
import { riordinaInventario } from "./scripts/azioni.js";
// 2.8.110 — 13/11: inventario 36/36 con lapis, redstone, polvere di luminite, uova, bottiglie, lana colorata: la carne
// delle prede restava a terra (cacciati 3 cow e 3 pig, "non ho carne da cuocere"). Ora fa almeno 4 posti liberi.
const it = (id, n = 1) => ({ typeId: `minecraft:${id}`, amount: n });
const slot = Array(36).fill(undefined);
[it("lapis_lazuli", 19), it("redstone", 50), it("glowstone_dust", 3), it("egg"), it("glass_bottle", 2), it("black_wool"), it("light_gray_wool")]
  .forEach((x, i) => { slot[i] = x; });
for (let i = 7; i < 36; i++) slot[i] = it(`utile_${i}`);
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, x) => { slot[i] = x && x.amount > 0 ? x : undefined; }, addItem() {} };
const bot = { isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, getComponent: (c) => (c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined }) };
riordinaInventario(bot);
assert.ok(slot.filter((x) => !x).length >= 4, `posti liberi: ${slot.filter((x) => !x).length}`);
assert.ok(slot.slice(7).every(Boolean), "ha buttato roba utile");
console.log("test v2.8.110 ok");
