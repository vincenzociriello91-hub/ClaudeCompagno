import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
mem.coda = []; mem.modalita = "autonomo";
const bot = { isValid: true, location: { x: 0, y: 64, z: 0 }, dimension: { id: "minecraft:overworld", getBlock: () => null, getEntities: () => [] }, getComponent: () => undefined, stopMoving() {} };
system.currentTick = 100;
assegna({ tipo: "vai", x: 500, y: 64, z: 500 }, "piano");
mem.compito.stato = {}; // il vai non arriverebbe mai: senza limite resterebbe per sempre
system.currentTick = 100 + 12001;
eseguiCompito(bot);
assert.equal(mem.compito, null, "compito oltre 10 minuti non abbandonato");
assert.match(mem.ultimoCompito, /troppo tempo/);
// compito ripreso dopo un riavvio (t più grande dei tick attuali): non va abbandonato subito
mem.compito = { tipo: "vai", x: 500, y: 64, z: 500, stato: {}, t: 999999 };
system.currentTick = 50;
try { eseguiCompito(bot); } catch {}
assert.notEqual(mem.compito, null, "compito ripreso abbandonato subito");
assert.equal(mem.compito.t, 50);
console.log("test v2.7.4 ok");
