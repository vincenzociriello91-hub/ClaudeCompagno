import assert from "node:assert/strict";
import { routineInPausa, affamato } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.95 — 11/11 sera: niente cibo in tasca, fame 16 (la vita non risale), vita 7-12 per ore. La routine "cibo" era in pausa
// per i fallimenti di prima (0/46), così la caccia non partiva mai. Ora senza cibo e con fame < 18 cibo e fattoria non sono in pausa.
const bot = (fame, items) => ({ getComponent: (n) => (/hunger/.test(n) ? { currentValue: fame } : /inventory/.test(n) ? { container: { size: items.length, getItem: (i) => items[i] } } : null) });
mem.routineKo = { cibo: { t: Date.now(), n: 6 }, "compito:fattoria": { t: Date.now(), n: 3 }, torce: { t: Date.now(), n: 2 } };
const fame16 = bot(16, []);
assert.equal(affamato(fame16), true);
assert.equal(routineInPausa("cibo", fame16), false, "senza cibo e fame 16 la caccia restava in pausa");
assert.equal(routineInPausa("compito:fattoria", fame16), false);
assert.equal(routineInPausa("torce", fame16), true, "le altre routine restano in pausa");
const conPane = bot(16, [{ typeId: "minecraft:bread", amount: 2 }]);
assert.equal(routineInPausa("cibo", conPane), true, "con il pane in tasca la pausa vale");
assert.equal(routineInPausa("cibo", bot(19, [])), true, "con fame 19 la pausa vale");
assert.equal(routineInPausa("cibo"), true, "senza bot (chiamate vecchie) la pausa vale");
console.log("test v2.8.95 ok");
