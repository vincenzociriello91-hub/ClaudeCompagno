import assert from "node:assert/strict";
import { risorsaVicina, tentatiDiRecente, segnaTentato } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.125 — 16/11 09:11-09:51 UTC: kit_legno tornava 3 volte a -47,66,169 e 2 a 68,78,247, interrotto ogni volta dai mostri:
// gli esclusi stavano nel compito e si perdevano. Un posto scelto negli ultimi 20 minuti non si riprova.
const bot = { location: { x: 0, y: 70, z: 200 } };
mem.risorse = { legna: [{ x: -47, y: 66, z: 169 }, { x: 68, y: 78, z: 247 }] };
mem.tentatiMappa = [];
const primo = risorsaVicina(bot, "legna", tentatiDiRecente("legna"));
assert.deepEqual(primo, { x: -47, y: 66, z: 169 });
segnaTentato("legna", primo);
// compito nuovo (interrotto dal creeper): s.escluse è vuoto, ma il posto appena provato resta escluso
assert.deepEqual(risorsaVicina(bot, "legna", tentatiDiRecente("legna")), { x: 68, y: 78, z: 247 }, "deve passare al posto successivo");
mem.tentatiMappa[0].t = Date.now() - 21 * 60000;
assert.deepEqual(risorsaVicina(bot, "legna", tentatiDiRecente("legna")), { x: -47, y: 66, z: 169 }, "dopo 20 minuti si può riprovare");
assert.equal(tentatiDiRecente("pietra").length, 0, "i tentativi valgono solo per la loro categoria");
console.log("test v2.8.125 ok");
