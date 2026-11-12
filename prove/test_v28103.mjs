import assert from "node:assert/strict";
import { ordinePannello } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.103 — ordini dal pannello web (con PIN): casa, tana, pausa, riprendi, vieni. Valgono come ordini del proprietario.
let fermato = false;
const bot = { id: "bot", location: { x: 0, y: 64, z: 0 }, stopMoving() { fermato = true; } };
mem.compito = null; mem.coda = [{ tipo: "raccogli" }]; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = { casa: { x: 100, y: 64, z: 400 } };
assert.equal(ordinePannello(bot, "casa", "sparda991"), true);
assert.equal(mem.compito?.tipo, "vai"); assert.equal(mem.compito.x, 100); assert.equal(mem.coda.length, 0);
assert.equal(mem.ordine?.da, "sparda991");
assert.equal(ordinePannello(bot, "tana", "sparda991"), true); assert.equal(mem.compito?.tipo, "tana");
assert.equal(ordinePannello(bot, "pausa", "sparda991"), true); assert.equal(mem.modalita, "fermo"); assert.equal(mem.compito, null); assert.ok(fermato);
assert.equal(ordinePannello(bot, "riprendi", "sparda991"), true); assert.equal(mem.modalita, "autonomo");
assert.equal(ordinePannello(bot, "vieni", "sparda991"), false, "il proprietario non è online");
assert.equal(ordinePannello(bot, "boh", "sparda991"), false);
mem.luoghi = {}; assert.equal(ordinePannello(bot, "casa", "sparda991"), false);
console.log("test v2.8.103 ok");
