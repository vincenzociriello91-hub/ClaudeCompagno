import assert from "node:assert/strict";
import { piccone } from "./scripts/azioni.js";
// 2.8.122 — 15/11: senza piccone il piano sceglieva miniera:ferro e attrezzi_ferro ("serve un piccone migliore per
// short_grass / iron_ore"). Miniera e attrezzi di ferro solo con un piccone di pietra o meglio.
const bot = (oggetti) => ({ getComponent: () => ({ container: { size: oggetti.length, getItem: (i) => ({ typeId: oggetti[i], amount: 1 }) } }) });
assert.equal(piccone(bot(["minecraft:stone_axe", "minecraft:copper_axe", "minecraft:cobblestone"])), false, "le asce non contano");
assert.equal(piccone(bot(["minecraft:wooden_pickaxe"])), false, "quello di legno non scava il ferro");
assert.equal(piccone(bot(["minecraft:stone_pickaxe"])), true);
console.log("test v2.8.122 ok");
