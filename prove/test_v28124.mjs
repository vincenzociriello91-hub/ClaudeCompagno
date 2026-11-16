import assert from "node:assert/strict";
import { torceOk } from "./scripts/azioni.js";
// 2.8.124 — 16/11 07:30 UTC: senza piccone ha fatto 16 bastoni e li ha spesi tutti in 64 torce (ne aveva già 27), così il
// piccone non si poteva rifare. Torce solo con un piccone in tasca e finché ne ha meno di 32.
const bot = (oggetti) => ({ getComponent: () => ({ container: { size: oggetti.length, getItem: (i) => oggetti[i] } }) });
const it = (id, n = 1) => ({ typeId: `minecraft:${id}`, amount: n });
assert.equal(torceOk(bot([it("stick", 16), it("torch", 27)])), false, "senza piccone i bastoni servono per il piccone");
assert.equal(torceOk(bot([it("stone_pickaxe"), it("torch", 40)])), false, "con 40 torce bastano");
assert.equal(torceOk(bot([it("stone_pickaxe"), it("torch", 5)])), true);
console.log("test v2.8.124 ok");
