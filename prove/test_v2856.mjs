import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// chiuso nella tana: niente lotte (inseguendo mostri irraggiungibili usciva dalla tana e moriva: 09/11)
const zombie = { isValid: true, id: "z1", typeId: "minecraft:zombie", location: { x: 114, y: 62, z: 345 }, applyDamage() {} };
const base = { isValid: true, location: { x: 112.5, y: 60, z: 345.5 }, isSneaking: false,
  dimension: { getEntities: () => [zombie] }, getComponent: (n) => (/health/.test(n) ? { currentValue: 20 } : { container: { size: 0, getItem() {} }, getEquipment() {} }),
  lookAt() {}, moveToLocation() {}, attackEntity() {}, teleport() {} };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}) });  // metodi non usati qui: vuoti
mem.protettoFino = 0;
system.currentTick = 1000;
mem.rifugio = null;
assert.equal(difendi(bot), true, "fuori dalla tana combatte");
system.currentTick = 1020;
mem.rifugio = { x: 112, y: 60, z: 345, ok: true };
assert.equal(difendi(bot), false, "nella tana non combatte");
mem.rifugio = null;
console.log("test v2.8.56 ok");
