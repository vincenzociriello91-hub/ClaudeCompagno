import assert from "node:assert/strict";
import { piazza } from "./scripts/azioni.js";
const vuoto = { typeId: "minecraft:air", isAir: true, isLiquid: false, setType() { throw new Error("non doveva piazzare"); } };
const slots = [{ typeId: "minecraft:cobblestone", amount: 5 }];
const dim = { id: "minecraft:overworld", getBlock: () => vuoto };
const bot = { dimension: dim, location: { x: 3.4, y: 64, z: 7.8 }, getComponent: () => ({ container: { size: 1, getItem: (i) => slots[i], setItem() {} } }) };
globalThis.__giocatori = [bot, { dimension: dim, location: { x: 10.2, y: 70, z: 10.5 } }];
assert.equal(piazza(bot, { x: 3, y: 64, z: 7 }, "cobblestone"), "giocatore"); // piedi del bot
assert.equal(piazza(bot, { x: 3, y: 65, z: 7 }, "cobblestone"), "giocatore"); // testa del bot
assert.equal(piazza(bot, { x: 10, y: 71, z: 10 }, "cobblestone"), "giocatore"); // testa di un altro giocatore
console.log("test soffocamento ok");
