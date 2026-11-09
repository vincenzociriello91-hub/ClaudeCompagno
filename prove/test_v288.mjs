import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { fabbrica, eseguiCompito, assegna, verificaRicette } from "./scripts/azioni.js";
import { RICETTE } from "./scripts/ricette.js";
import { mem } from "./scripts/memoria.js";
// inventario finto
function nuovoBot(oggetti, loc = { x: 142, y: 64, z: 359 }) {
  const slot = Array(36).fill(undefined);
  oggetti.forEach(([t, n], i) => slot[i] = { typeId: t, amount: n });
  const container = { size: 36, emptySlotsCount: 0,
    getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; },
    addItem: (it) => { const j = slot.findIndex((s) => s && s.typeId === it.typeId); if (j >= 0) slot[j].amount += it.amount; else slot[slot.findIndex((s) => !s)] = { typeId: it.typeId, amount: it.amount }; } };
  const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
    getBlock: (p) => (p.y <= 63 ? { typeId: "minecraft:grass_block", isAir: false, isLiquid: false, location: p } : { typeId: "minecraft:air", isAir: true, isLiquid: false, location: p, setType() {} }),
    getTopmostBlock: (q) => ({ typeId: "minecraft:grass_block", isAir: false, location: { x: q.x, y: 63, z: q.z } }), getEntities: () => [] };
  return { slot, bot: { isValid: true, location: loc, dimension: dim, getComponent: (c) => (c === "minecraft:inventory" ? { container } : c === "minecraft:equippable" ? { getEquipment: () => undefined, setEquipment: () => true } : undefined), stopMoving() {}, teleport(p) { this.location = p; }, navigateToLocation() { return { isFullPath: true, getPath: () => [] }; }, lookAtBlock() {}, moveToLocation() {} } };
}
const conta = (slot, id) => slot.filter((s) => s?.typeId === id).reduce((a, s) => a + s.amount, 0);
system.currentTick = 10;
// 1) ricettario completo: famiglie presenti
assert.ok(Object.keys(RICETTE).length > 600, "ricettario troppo piccolo");
for (const id of ["spruce_stairs", "wooden_door", "cherry_boat", "stone_brick_wall", "red_dye", "blue_wool", "rail", "netherite_sword", "golden_apple", "iron_block"])
  assert.ok(RICETTE[`minecraft:${id}`], `manca ${id}`);
// 2) alternativa: tintura rossa dalla barbabietola
let { bot, slot } = nuovoBot([["minecraft:beetroot", 2]]);
assert.equal(fabbrica(bot, "minecraft:red_dye")[0], true, "tintura dalla barbabietola");
assert.equal(conta(slot, "minecraft:red_dye"), 1);
// 3) assi del legno giusto dai tronchi di abete (con banco in tasca piazzabile)
({ bot, slot } = nuovoBot([["minecraft:spruce_log", 2], ["minecraft:crafting_table", 1]]));
const r = fabbrica(bot, "minecraft:spruce_stairs"); assert.ok(r[0], "scale di abete non fatte: " + r[1]);
assert.equal(conta(slot, "minecraft:spruce_stairs"), r[0] ? 4 : 0, "scale di abete: " + r[1]);
// 4) fondi con 81 ciottoli e niente banco: va a prendere un tronco invece di fallire
mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
({ bot, slot } = nuovoBot([["minecraft:cobblestone", 81], ["minecraft:raw_copper", 16], ["minecraft:coal", 4]]));
assegna({ tipo: "fondi", oggetto: "raw_copper", quantita: 16 }, "piano");
eseguiCompito(bot);
assert.ok(mem.coda.some((p) => p.tipo === "raccogli" && p.blocco === "legna"), "non va a prendere legna: " + JSON.stringify(mem.coda));
// 5) lontano da casa: il bosco prima torna a casa invece di dire "nessuno spiazzo"
mem.coda = []; mem.esperienza = {}; mem.luoghi = { casa: { x: 142, y: 64, z: 359 } };
({ bot } = nuovoBot([["minecraft:oak_sapling", 3]], { x: 36, y: 100, z: 89 }));
assegna({ tipo: "bosco" }, "piano");
eseguiCompito(bot);
assert.ok(mem.compito?.tipo === "bosco", "il bosco è fallito subito lontano da casa: " + JSON.stringify(mem.esperienza));
// 6) crafta di un lingotto col grezzo in tasca -> fondi
mem.coda = [];
({ bot } = nuovoBot([["minecraft:raw_iron", 3]]));
assegna({ tipo: "crafta", oggetto: "iron_ingot", quantita: 3 }, "piano");
eseguiCompito(bot);
assert.ok(mem.coda.some((p) => p.tipo === "fondi" && p.oggetto === "raw_iron"), "crafta lingotto non passa a fondi: " + JSON.stringify(mem.coda));
// 7) verifica ricette non rompe nulla col finto ItemStack
const v = verificaRicette();
assert.ok(v.ricette > 600 && v.tolte === 0, JSON.stringify(v));
console.log("test v2.8.8 ok");
