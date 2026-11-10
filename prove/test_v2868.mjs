import assert from "node:assert/strict";
import { istantaneaInventario, ripristinaInventario } from "./scripts/azioni.js";
// 10/11: a ogni reload o riavvio il bot rinasceva senza l'armatura che indossava (si salvavano solo le 36 caselle):
// equipaggiamento 11/30 alle 10:16, 7/30 alle 10:46 dopo un reload, senza morti in mezzo. Armatura di rame rifatta 3 volte.
const nuovoBot = () => {
  const slot = Array(36).fill(undefined), addosso = {};
  const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it; }, addItem: (it) => { slot[slot.findIndex((x) => !x)] = it; } };
  return { slot, addosso, getComponent: (c) => c === "minecraft:inventory" ? { container }
    : { getEquipment: (p) => addosso[p], setEquipment: (p, it) => { addosso[p] = it; return true; } } };
};
const ogg = (typeId, amount = 1, damage = 0) => ({ typeId, amount, getComponent: () => ({ damage, maxDurability: 200 }) });
const a = nuovoBot();
a.slot[0] = ogg("minecraft:dirt", 64); a.addosso.Chest = ogg("minecraft:copper_chestplate", 1, 7); a.addosso.Offhand = ogg("minecraft:shield");
const salvato = istantaneaInventario(a, true);
assert.deepEqual(salvato, [["minecraft:dirt", 64, 0], ["minecraft:copper_chestplate", 1, 7, "Chest"], ["minecraft:shield", 1, 0, "Offhand"]]);
assert.equal(istantaneaInventario(a).length, 1, "l'elenco per il pannello resta solo l'inventario");
const b = nuovoBot();
ripristinaInventario(b, JSON.parse(JSON.stringify(salvato))); // come dopo un riavvio: passa dal salvataggio su disco
assert.equal(b.addosso.Chest?.typeId, "minecraft:copper_chestplate", "rinato senza corazza");
assert.equal(b.addosso.Offhand?.typeId, "minecraft:shield", "rinato senza scudo");
assert.deepEqual(b.slot.filter(Boolean).map((x) => x.typeId), ["minecraft:dirt"], "l'armatura è finita nello zaino invece che addosso");
// salvataggi vecchi (3 elementi): tutto nello zaino come prima
const c = nuovoBot(); ripristinaInventario(c, [["minecraft:stone", 3, 0]]);
assert.equal(c.slot[0]?.typeId, "minecraft:stone");
console.log("test v2.8.68 ok");
