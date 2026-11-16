import assert from "node:assert/strict";
import { riprovaConPiccone } from "./scripts/azioni.js";
// 2.8.123 — 15/11 21:30 UTC: piccone di pietra rotto a metà della scala per il ferro → compito fallito, 17 passi saltati,
// e solo dopo "Mi sono rifatto: stone_pickaxe". Ora si rifà il piccone e si continua; si fallisce solo senza materiale.
const oggetti = [];
const bot = { getComponent: () => ({ container: { size: oggetti.length, getItem: (i) => oggetti[i] } }) };
const rifaiPietra = () => oggetti.push({ typeId: "minecraft:stone_pickaxe", amount: 1 });
assert.equal(riprovaConPiccone(bot, rifaiPietra), true, "rifatto il piccone: si continua");
assert.equal(riprovaConPiccone(bot, () => {}), false, "niente materiale: si fallisce come prima");
assert.equal(riprovaConPiccone(bot, rifaiPietra), false, "un altro piccone uguale non è un miglioramento: niente giri infiniti");
console.log("test v2.8.123 ok");
