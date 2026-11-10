import assert from "node:assert/strict";
import { system, world } from "@minecraft/server";
import { inPericolo, eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 1) zone pericolose: la morte per un mostro scade dopo 30 minuti, l'annegamento resta
const fa = (min) => Date.now() - min * 60000;
mem.pericoli = [{ x: 0, y: 64, z: 0, r: 12, motivo: "entityAttack da zombie", t: fa(45) }, { x: 50, y: 64, z: 0, r: 12, motivo: "projectile da skeleton", t: fa(5) },
  { x: 100, y: 64, z: 0, r: 8, motivo: "acqua (annegamento)", t: fa(600) }, { x: 150, y: 64, z: 0, r: 12, motivo: "entityExplosion da creeper", t: fa(31) }];
assert.equal(inPericolo({ x: 0, y: 64, z: 0 }), false, "zombie di 45 minuti fa ancora pericoloso");
assert.equal(inPericolo({ x: 50, y: 64, z: 0 }), true, "scheletro di 5 minuti fa dimenticato");
assert.equal(inPericolo({ x: 100, y: 64, z: 0 }), true, "annegamento dimenticato");
assert.equal(inPericolo({ x: 150, y: 64, z: 0 }), false, "creeper di 31 minuti fa ancora pericoloso");
mem.pericoli = [];
// 2) di notte, da solo, un crafting senza materiale fallisce invece di mandare il bot fuori a far legna
const container = { size: 36, getItem() {}, setItem() {}, addItem() {} };
const bot = { isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, getComponent: (c) => (c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined }) };
system.currentTick = 100; mem.coda = []; mem.compito = null; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
world.getTimeOfDay = () => 18000;
assegna({ tipo: "crafta", oggetto: "stick", quantita: 4 }, "test");
eseguiCompito(bot);
assert.equal(mem.coda.length, 0, "di notte ha messo in coda una raccolta: " + JSON.stringify(mem.coda));
assert.equal(mem.compito, null, "il crafting doveva fallire subito");
// di giorno lo stesso crafting va a far legna
world.getTimeOfDay = () => 6000; mem.coda = []; mem.compito = null;
assegna({ tipo: "crafta", oggetto: "stick", quantita: 4 }, "test");
system.currentTick += 5; eseguiCompito(bot);
assert.equal(mem.coda[0]?.tipo, "raccogli", "di giorno doveva andare a far legna");
delete world.getTimeOfDay; mem.coda = []; mem.compito = null;
console.log("test v2.8.65 ok");
