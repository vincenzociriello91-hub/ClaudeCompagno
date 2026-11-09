import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi, registraAggressione } from "./scripts/azioni.js";
const creeper = { id: "c7", typeId: "minecraft:creeper", isValid: true, location: { x: 2, y: 64, z: 0 }, dimension: { id: "minecraft:overworld" } };
globalThis.__entita = new Map([["c7", creeper]]);
const comp = { "minecraft:health": { currentValue: 8 }, "minecraft:equippable": { getEquipment: () => undefined }, "minecraft:inventory": { container: { size: 36, getItem: () => undefined } } };
let meta = null, colpi = 0;
const bot = { name: "Claude", id: "b", isValid: true, location: { x: 0, y: 64, z: 0 }, dimension: { id: "minecraft:overworld", getEntities: () => [] },
  getComponent: (c) => comp[c], navigateToEntity() {}, lookAtEntity() {}, attackEntity: () => (colpi++, true), moveToLocation: (p) => (meta = p), selectedSlotIndex: 0 };
system.currentTick = 9000; registraAggressione(bot, creeper);
assert.equal(difendi(bot), true);
assert.equal(colpi, 0, "con vita 8 non deve colpire il creeper da vicino");
assert.ok(meta && meta.x < -10, "deve scappare lontano dal creeper: " + JSON.stringify(meta));
console.log("test v2.8.28 ok");
