import assert from "node:assert/strict";
import { picconeGiusto } from "./scripts/azioni.js";
// 2.8.131 — 17/11: piccone di ferro fatto alle 07:48 UTC e rotto alle 08:33 scavando pietra. Per ogni blocco si usa il
// piccone più modesto che basta: pietra col piccone di pietra, ferro col piccone di pietra, diamante con quello di ferro.
const slot = [{ typeId: "minecraft:iron_pickaxe", amount: 1 }, { typeId: "minecraft:stone_pickaxe", amount: 1 }, { typeId: "minecraft:bread", amount: 4 }];
const bot = { getComponent: () => ({ container: { size: slot.length, getItem: (i) => slot[i] } }) };
assert.equal(picconeGiusto(bot, 1).slot, 1, "la pietra si scava col piccone di pietra");
assert.equal(picconeGiusto(bot, 2).slot, 1, "il ferro basta il piccone di pietra");
assert.equal(picconeGiusto(bot, 3).slot, 0, "il diamante vuole quello di ferro");
slot[1] = undefined;
assert.equal(picconeGiusto(bot, 1).slot, 0, "senza piccone di pietra usa quello di ferro");
console.log("test v2.8.131 ok");
