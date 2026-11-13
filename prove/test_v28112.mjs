import assert from "node:assert/strict";
import { scortaCibo } from "./scripts/azioni.js";
// 2.8.112 — 13/11: 6 polli crudi + 2 montone + 1 braciola contavano 3 (il pollo crudo non è in CIBO): il piano sceglieva la
// routine cibo ogni giorno e attrezzi_ferro non partiva mai. Ora il pollo conta nella scorta (la routine cibo lo cuoce).
const it = (id, n = 1) => ({ typeId: `minecraft:${id}`, amount: n });
const slot = Array(36).fill(undefined);
[it("chicken", 6), it("mutton", 2), it("porkchop"), it("dirt", 64)].forEach((x, i) => { slot[i] = x; });
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, x) => { slot[i] = x; }, addItem() {} };
const bot = { isValid: true, getComponent: (c) => (c === "minecraft:inventory" ? { container } : undefined) };
assert.equal(scortaCibo(bot), 9);
console.log("test v2.8.112 ok");
