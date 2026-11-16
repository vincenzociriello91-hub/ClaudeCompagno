import assert from "node:assert/strict";
import { soloCibo, pianoPerVitaBassa } from "./scripts/azioni.js";
// 2.8.127 — 16/11 13:50 UTC: uscito dalla tana con vita 5-7, il piano ha scelto attrezzi_ferro e lo ha mandato lontano:
// ucciso da uno zombie villager. Con vita 10 o meno solo cibo e fattoria.
const bot = (v) => ({ getComponent: (n) => (n === "minecraft:health" ? { currentValue: v } : undefined) });
assert.equal(soloCibo(bot(6)), true);
assert.equal(soloCibo(bot(15)), false);
assert.equal(pianoPerVitaBassa("attrezzi_ferro"), false, "con vita bassa niente viaggi per il ferro");
assert.equal(pianoPerVitaBassa("cibo"), true);
assert.equal(pianoPerVitaBassa("compito:fattoria"), true);
console.log("test v2.8.127 ok");
