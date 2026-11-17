import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.132 — 17/11: dalle 08:33 UTC aveva 1 lingotto + 1 ferro grezzo (bastano per la spada), ma attrezzi_ferro ripartiva per
// 10 minerali lontani; durante il viaggio è morto per uno scheletro (09:51). Con 2 pezzi e senza spada di ferro: fonde e fa la spada.
const slot = Array(36).fill(undefined);
slot[0] = { typeId: "minecraft:iron_ingot", amount: 1 }; slot[1] = { typeId: "minecraft:raw_iron", amount: 1 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const bot = { isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, dimension: { id: "minecraft:overworld" },
  getComponent: (c) => c === "minecraft:inventory" ? { container } : undefined };
system.currentTick = 10; mem.coda = []; mem.esperienza = {}; mem.luoghi = {}; mem.compito = null;
assegna({ tipo: "routine", nome: "attrezzi_ferro" }, "piano");
eseguiCompito(bot);
assert.deepEqual(mem.coda.map((p) => `${p.tipo}:${p.oggetto}`), ["fondi:raw_iron", "crafta:iron_sword"], JSON.stringify(mem.coda));
assert.equal(mem.coda[0].quantita, 1);
console.log("test v2.8.132 ok");
