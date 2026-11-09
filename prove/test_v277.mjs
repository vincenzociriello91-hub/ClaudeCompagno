import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// tre maiali vicini, nessuna mucca: la routine cibo deve cacciare il maiale invece di fallire
const maiali = [0, 1, 2].map((i) => ({ id: "p" + i, typeId: "minecraft:pig", isValid: true, location: { x: 3 + i, y: 64, z: 0 }, getComponent: () => undefined }));
const dim = { id: "minecraft:overworld", getEntities: (o) => (o.type === "minecraft:pig" ? maiali : []), getBlock: () => null, heightRange: { min: -64, max: 320 } };
const comp = { "minecraft:health": { currentValue: 20 }, "minecraft:equippable": { getEquipment: () => undefined }, "minecraft:inventory": { container: { size: 36, getItem: () => undefined } } };
const bot = { isValid: true, location: { x: 0, y: 64, z: 0 }, dimension: dim, getComponent: (c) => comp[c], stopMoving() {}, navigateToEntity() {}, lookAtEntity() {}, attackEntity: () => true, selectedSlotIndex: 0 };
mem.coda = []; mem.modalita = "autonomo"; system.currentTick = 10;
assegna({ tipo: "caccia", oggetto: "cow", quantita: 1, routine: "cibo" }, "piano");
eseguiCompito(bot);
assert.equal(mem.compito?.stato?.id?.startsWith("p"), true, "non ha scelto il maiale: " + JSON.stringify(mem.compito));
// fuori dalla routine cibo resta fedele al tipo chiesto
mem.compito = null; mem.risorse = {};
assegna({ tipo: "caccia", oggetto: "cow", quantita: 1 }, "piano");
eseguiCompito(bot);
assert.notEqual(mem.compito?.stato?.id, "p0", "ha cacciato un maiale anche se servivano mucche");
console.log("test v2.7.7 ok");
