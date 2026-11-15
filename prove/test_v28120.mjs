import assert from "node:assert/strict";
import { sottoterraOk } from "./scripts/azioni.js";
// 2.8.120 — 14/11 21:36 UTC: sceso in miniera con vita 13 e fame 16, ucciso da zombie nei cunicoli; poi di nuovo giù a
// recuperare, ucciso da un ragno. In miniera si scende solo con vita alta (16 o più).
const bot = (v) => ({ getComponent: (n) => (n === "minecraft:health" ? { currentValue: v } : undefined) });
assert.equal(sottoterraOk(bot(13)), false, "con vita 13 niente miniera");
assert.equal(sottoterraOk(bot(16)), true);
assert.equal(sottoterraOk(bot(20)), true);
console.log("test v2.8.120 ok");
