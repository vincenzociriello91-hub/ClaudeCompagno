import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:coal", amount: 16 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it; }, addItem() {} };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getBlock: (p) => ({ typeId: "minecraft:air", isAir: true, location: p }), getTopmostBlock: (q) => ({ typeId: "minecraft:grass_block", location: { x: q.x, y: 63, z: q.z } }), getEntities: () => [] };
const bot = { isValid: true, location: { x: 60, y: 88, z: 131 }, dimension: dim, getComponent: (c) => c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined, setEquipment: () => true }, stopMoving() {} };
system.currentTick = 10; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
assegna({ tipo: "fondi", oggetto: "tronco", quantita: 2, routine: "notte_sicura" }, "piano");
eseguiCompito(bot);
assert.ok(!mem.coda.some((p) => p.tipo === "raccogli"), "di notte esce a cercare legna: " + JSON.stringify(mem.coda));
// fuori dalla notte_sicura il rinvio resta
mem.coda = []; assegna({ tipo: "fondi", oggetto: "tronco", quantita: 2 }, "piano"); eseguiCompito(bot);
assert.ok(mem.coda.some((p) => p.tipo === "raccogli"), "rinvio normale rotto");
console.log("test v2.8.9 ok");
