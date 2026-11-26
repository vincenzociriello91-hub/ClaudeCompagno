import assert from "node:assert/strict";
import { ripariNotte } from "./scripts/azioni.js";
// 2.8.138 — 26/11 17:00-18:51 UTC: in miniera a 149,17,229 la tana falliva ogni 30 s ("acqua o grotte tutto intorno",
// 104 volte) e il bozzolo non partiva mai: aveva 4 ciottoli e ne chiedeva 10. In galleria quasi tutte le celle del
// bozzolo sono già pietra (non costano blocchi): ne bastano 4 per le due aperture.
assert.equal(ripariNotte(true, true, 4), "bozzolo", "sottoterra, tana fallita, 4 blocchi: bozzolo");
assert.equal(ripariNotte(true, true, 3), "tana", "con meno di 4 blocchi si riprova la tana");
assert.equal(ripariNotte(true, false, 40), "rifugio", "in superficie con 34+ blocchi: rifugio");
assert.equal(ripariNotte(false, true, 40), "tana", "prima si prova sempre la tana");
console.log("test v2.8.138 ok");
