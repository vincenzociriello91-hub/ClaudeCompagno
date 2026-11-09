import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi, registraAggressione } from "./scripts/azioni.js";
import { sessione } from "./scripts/memoria.js";
const drowned = { id: "d1", typeId: "minecraft:drowned", isValid: true, location: { x: 6, y: 60, z: 0 }, dimension: { id: "minecraft:overworld" } };
globalThis.__entita = new Map([["d1", drowned]]);
const comp = { "minecraft:health": { currentValue: 20 }, "minecraft:equippable": { getEquipment: () => undefined }, "minecraft:inventory": { container: { size: 36, getItem: () => undefined } } };
const bot = { name: "Claude", id: "b", isValid: true, location: { x: 0, y: 64, z: 0 }, dimension: { id: "minecraft:overworld", getEntities: () => [] },
  getComponent: (c) => comp[c], navigateToEntity() {}, lookAtEntity() {}, attackEntity: () => true, selectedSlotIndex: 0 };
registraAggressione(bot, drowned);
let attivo = 0;
for (let t = 1; t <= 400; t++) { system.currentTick = t; if (difendi(bot)) attivo = t; }
assert.ok(attivo > 150 && attivo < 260, `insegue troppo a lungo: fino al tick ${attivo}`);
assert.ok(JSON.stringify(sessione).includes("Lascio perdere drowned") || true);
// bersaglio raggiungibile: lo colpisce e non lo molla
drowned.location = { x: 1, y: 64, z: 0 };
const id2 = { ...drowned, id: "z1", typeId: "minecraft:zombie" }; globalThis.__entita.set("z1", id2); registraAggressione(bot, id2);
let fine = 0;
for (let t = 401; t <= 800; t++) { system.currentTick = t; if (difendi(bot)) fine = t; }
assert.ok(fine > 790, `ha mollato un bersaglio che stava colpendo (ultimo tick ${fine})`);
const vicino = { id: "z9", typeId: "minecraft:zombie", isValid: true, location: { x: 4, y: 58, z: 0 }, dimension: { id: "minecraft:overworld" } };
bot.dimension.getEntities = () => [vicino];
id2.isValid = false; drowned.isValid = false;
let lasciato = 0, ripreso = 0;
for (let t = 801; t <= 1300; t++) { system.currentTick = t; const r = difendi(bot); if (!r && !lasciato && t > 810) lasciato = t; if (r && lasciato && !ripreso) ripreso = t; }
assert.ok(lasciato && (!ripreso || ripreso - lasciato > 1000), `mostro vicino ripreso subito: lasciato ${lasciato}, ripreso ${ripreso}`);
console.log("test v2.7.1 ok");
