import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi, registraAggressione } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
const creeper = { id: "c7", typeId: "minecraft:creeper", isValid: true, location: { x: 2, y: 64, z: 0 }, dimension: { id: "minecraft:overworld" } };
globalThis.__entita = new Map([["c7", creeper]]);
const comp = { "minecraft:health": { currentValue: 8 }, "minecraft:equippable": { getEquipment: () => undefined }, "minecraft:inventory": { container: { size: 36, getItem: () => undefined } } };
let meta = null, colpi = 0;
const bot = { name: "Claude", id: "b", isValid: true, location: { x: 0, y: 64, z: 0 }, dimension: { id: "minecraft:overworld", getEntities: () => [] },
  getComponent: (c) => comp[c], navigateToEntity() {}, lookAtEntity() {}, attackEntity: () => (colpi++, true), moveToLocation: (p) => (meta = p), selectedSlotIndex: 0 };
system.currentTick = 9000; registraAggressione(bot, creeper);
// dalla 2.8.75, debole e con metà vita, prima prova a chiudersi in tana; se la tana non riesce (qui non c'è terreno) scappa
mem.compito = null; mem.coda = []; mem.rifugio = null; mem.protettoFino = 0; mem.emergenzaT = 0;
assert.equal(difendi(bot), false); assert.equal(mem.compito?.tipo, "tana"); mem.compito = null; system.currentTick += 20;
assert.equal(difendi(bot), true);
assert.equal(colpi, 0, "con vita 8 non deve colpire il creeper da vicino");
assert.ok(meta && meta.x < -10, "deve scappare lontano dal creeper: " + JSON.stringify(meta));
console.log("test v2.8.28 ok");
