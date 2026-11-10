import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi, registraAggressione } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
const drowned = { id: "d9", typeId: "minecraft:drowned", isValid: true, location: { x: 10, y: 60, z: 0 }, dimension: { id: "minecraft:overworld" } };
globalThis.__entita = new Map([["d9", drowned]]);
const comp = { "minecraft:health": { currentValue: 1 }, "minecraft:equippable": { getEquipment: () => undefined }, "minecraft:inventory": { container: { size: 36, getItem: () => undefined } } };
const bot = { name: "Claude", id: "b", isValid: true, location: { x: 0, y: 64, z: 0 }, dimension: { id: "minecraft:overworld", getEntities: () => [] },
  getComponent: (c) => comp[c], navigateToEntity() {}, lookAtEntity() {}, attackEntity: () => true, selectedSlotIndex: 0 };
system.currentTick = 5000;
registraAggressione(bot, drowned);
assert.equal(difendi(bot), false, "con vita 1 non deve andare a cercare un drowned a 10 blocchi");
comp["minecraft:health"].currentValue = 20; system.currentTick = 5020;
mem.compito = null; // 2.8.79: a vita 1 e sotto tiro ha chiesto la tana d'emergenza; con la tana in corso non combatte
assert.equal(difendi(bot), true, "con vita piena si difende");
console.log("test v2.8.22 ok");
