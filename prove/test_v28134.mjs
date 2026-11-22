import assert from "node:assert/strict";
import { attrezzoInutile } from "./scripts/azioni.js";
// 2.8.134 — 22/11: con 8 ferro grezzo (bastava per la corazza) attrezzi_ferro ha fatto una seconda spada di ferro e l'ascia
// di ferro; la corazza è rimasta senza ferro. Attrezzi di ferro già posseduti non si rifanno; l'ascia aspetta la corazza.
const bot = (oggetti, petto) => ({ getComponent: (n) => n === "minecraft:inventory"
  ? { container: { size: oggetti.length, getItem: (i) => ({ typeId: `minecraft:${oggetti[i]}`, amount: 1 }) } }
  : { getEquipment: (s) => (s === "Chest" && petto ? { typeId: `minecraft:${petto}` } : undefined) } });
const crafta = (o) => ({ tipo: "crafta", oggetto: o });
assert.equal(attrezzoInutile(bot(["iron_sword"], "copper_chestplate"), crafta("iron_sword")), true, "seconda spada di ferro: inutile");
assert.equal(attrezzoInutile(bot(["stone_sword"], "copper_chestplate"), crafta("iron_sword")), false, "prima spada di ferro: si fa");
assert.equal(attrezzoInutile(bot(["stone_axe"], "copper_chestplate"), crafta("iron_axe")), true, "l'ascia di ferro aspetta la corazza");
assert.equal(attrezzoInutile(bot(["stone_axe"], "iron_chestplate"), crafta("iron_axe")), false, "con la corazza di ferro l'ascia si fa");
assert.equal(attrezzoInutile(bot([], "copper_chestplate"), crafta("iron_chestplate")), false);
console.log("test v2.8.134 ok");
