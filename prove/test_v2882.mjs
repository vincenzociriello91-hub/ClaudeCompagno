import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.82 — la caccia saltava sempre gli animali isolati o in coppia ("lascia una coppia per la riproduzione"): riuscita 2%
// su 733, 0 pasti l'11/11 mattina e vita scesa a 1. Con fame o poca vita va bene anche una mucca da sola.
let mucche = [{ id: "c0", typeId: "minecraft:cow", isValid: true, location: { x: 4, y: 64, z: 0 }, getComponent: () => undefined }];
const dim = { id: "minecraft:overworld", getEntities: (o) => (o.type === "minecraft:cow" ? mucche : []), getBlock: () => null, heightRange: { min: -64, max: 320 } };
let fame = 16;
const comp = { "minecraft:health": { currentValue: 20 }, "minecraft:player.hunger": { get currentValue() { return fame; } },
  "minecraft:equippable": { getEquipment: () => undefined }, "minecraft:inventory": { container: { size: 36, getItem: () => undefined } } };
const bot = { isValid: true, location: { x: 0, y: 64, z: 0 }, dimension: dim, getComponent: (c) => comp[c], stopMoving() {}, navigateToEntity() {}, lookAtEntity() {}, attackEntity: () => true, selectedSlotIndex: 0 };
mem.coda = []; mem.modalita = "autonomo"; mem.risorse = {}; system.currentTick = 10;
assegna({ tipo: "caccia", oggetto: "cow", quantita: 1, routine: "cibo" }, "piano");
eseguiCompito(bot);
assert.equal(mem.compito?.stato?.id, "c0", "con fame 16 e niente cibo ha saltato la mucca isolata: " + JSON.stringify(mem.compito));
console.log("test v2.8.82 ok");
