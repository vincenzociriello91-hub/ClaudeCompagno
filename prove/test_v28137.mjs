import assert from "node:assert/strict";
import { attrezziInTasca } from "./scripts/azioni.js";
// 2.8.137 — 25/11 01:01 UTC: sistema_deposito ha messo in cassa lo stone_pickaxe (teneva solo il migliore per tipo).
// Senza piccone di pietra lo scavo della pietra ha usato l'iron_pickaxe, rotto alle 04:42. I picconi restano tutti in
// tasca (riordinaInventario ne tiene già al massimo 2): quello di pietra consuma la pietra, quello di ferro il ferro.
const oggetti = ["iron_pickaxe", "stone_pickaxe", "iron_sword", "stone_sword", "dirt"];
const bot = { getComponent: () => ({ container: { size: oggetti.length, getItem: (i) => ({ typeId: `minecraft:${oggetti[i]}`, amount: 1 }) } }) };
const s = attrezziInTasca(bot);
assert.ok(s.has(0) && s.has(1), "entrambi i picconi restano in tasca");
assert.ok(s.has(2) && !s.has(3), "delle spade solo la migliore");
assert.ok(!s.has(4));
console.log("test v2.8.137 ok");
