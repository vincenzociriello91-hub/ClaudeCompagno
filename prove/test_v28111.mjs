import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.111 — 13/11: 6 ferro grezzo + 1 lingotto in tasca da ieri, ma attrezzi_ferro andava a scavare 10 minerali (piccone
// rotto, creeper) e non fondeva mai: niente spada di ferro. Ora fonde il grezzo che ha e crafta subito.
const slot = Array(36).fill(undefined);
slot[0] = { typeId: "minecraft:iron_ingot", amount: 1 }; slot[1] = { typeId: "minecraft:raw_iron", amount: 6 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const bot = { isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, dimension: { id: "minecraft:overworld" },
  getComponent: (c) => c === "minecraft:inventory" ? { container } : undefined };
system.currentTick = 10; mem.coda = []; mem.esperienza = {}; mem.luoghi = {}; mem.compito = null;
assegna({ tipo: "routine", nome: "attrezzi_ferro" }, "piano");
eseguiCompito(bot);
assert.deepEqual(mem.coda.map((p) => p.tipo), ["fondi", "crafta", "crafta", "crafta"], JSON.stringify(mem.coda));
assert.equal(mem.coda[0].oggetto, "raw_iron"); assert.equal(mem.coda[0].quantita, 6);
// con solo 2 pezzi di ferro in tutto resta la routine completa (prima si scava)
slot[1] = { typeId: "minecraft:raw_iron", amount: 1 }; mem.coda = []; mem.compito = null;
assegna({ tipo: "routine", nome: "attrezzi_ferro" }, "piano"); eseguiCompito(bot);
assert.equal(mem.coda[0].tipo, "raccogli");
console.log("test v2.8.111 ok");
