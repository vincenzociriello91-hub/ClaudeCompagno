import assert from "node:assert/strict";
import { puoGuarire } from "./scripts/azioni.js";
// 2.8.126 — 16/11 dalle 11:34 UTC: quasi 2 ore fermo nella tana con vita 6, fame 17 e niente da mangiare, perché accanto c'era
// sempre un drowned. Con poca vita aspetta solo se può guarire (fame 18+ o cibo in tasca); altrimenti esce lontano dai mostri.
const bot = (fame, oggetti) => ({ getComponent: (n) => n === "minecraft:player.hunger" ? { currentValue: fame }
  : n === "minecraft:inventory" ? { container: { size: oggetti.length, getItem: (i) => oggetti[i] } } : undefined });
const it = (id, n = 1) => ({ typeId: `minecraft:${id}`, amount: n });
assert.equal(puoGuarire(bot(17, [it("wheat", 2), it("wheat_seeds", 10), it("cobblestone", 64)])), false, "il caso del 16/11: non guarisce");
assert.equal(puoGuarire(bot(17, [it("bread", 1)])), true, "con il pane guarisce");
assert.equal(puoGuarire(bot(17, [it("wheat", 3)])), true, "con 3 di grano fa il pane");
assert.equal(puoGuarire(bot(18, [])), true, "con fame 18 la vita risale da sola");
console.log("test v2.8.126 ok");
