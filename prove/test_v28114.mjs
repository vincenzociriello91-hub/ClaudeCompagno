import assert from "node:assert/strict";
import { riprovaDopoCaduta } from "./scripts/azioni.js";
// 2.8.114 — 13/11: andando alla fornace fissa è caduto in una grotta (86,74,261) e "fondi" è stato interrotto: armatura_ferro
// saltata con 7 lingotti + 4 grezzo in tasca. Ora fondi continua e si porta accanto alla fornace; dopo 3 cadute si interrompe.
const c = { tipo: "fondi", oggetto: "raw_iron", stato: { fornace: { x: 86, y: 74, z: 259 } } };
assert.equal(riprovaDopoCaduta(c), true);
assert.equal(c.stato.partenza < 0, true, "deve portarsi subito accanto alla fornace");
assert.equal(riprovaDopoCaduta(c), true);
assert.equal(riprovaDopoCaduta(c), false, "alla terza caduta si interrompe");
// come prima: raccogli riprova, gli altri compiti si interrompono
assert.equal(riprovaDopoCaduta({ tipo: "raccogli", stato: { lista: [1] } }), true);
assert.equal(riprovaDopoCaduta({ tipo: "costruisci", stato: {} }), false);
assert.equal(riprovaDopoCaduta({ tipo: "fondi", stato: {} }), false, "senza fornace scelta non c'è dove andare");
console.log("test v2.8.114 ok");
