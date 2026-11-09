import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// attrezzi_ferro con 4 lingotti in tasca: prima il piccone, niente miniera di 10 minerali senza piccone
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:iron_ingot", amount: 4 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const bot = { isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, dimension: { id: "minecraft:overworld" },
  getComponent: (c) => c === "minecraft:inventory" ? { container } : undefined };
system.currentTick = 10; mem.coda = []; mem.esperienza = {}; mem.luoghi = {}; mem.compito = null;
assegna({ tipo: "routine", nome: "attrezzi_ferro" }, "piano");
eseguiCompito(bot);
assert.deepEqual(mem.coda.map((p) => p.tipo), ["crafta", "crafta", "crafta"], JSON.stringify(mem.coda));
assert.equal(mem.coda[0].oggetto, "iron_pickaxe");
// senza lingotti resta la routine completa
slot[0] = undefined; mem.coda = []; mem.compito = null;
assegna({ tipo: "routine", nome: "attrezzi_ferro" }, "piano"); eseguiCompito(bot);
assert.equal(mem.coda[0].tipo, "raccogli");
console.log("test v2.8.42 ok");
