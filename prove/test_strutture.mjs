import assert from "node:assert/strict";
import { genera, SCHEMI_BASE, ROUTINE } from "./scripts/schemi.js";
import { RICETTE } from "./scripts/ricette.js";
import { mem } from "./scripts/memoria.js";
import { assegna, eseguiCompito } from "./scripts/azioni.js";
const k = (b) => `${b[0]},${b[1]},${b[2]}`;
for (const nome of Object.keys(SCHEMI_BASE)) {
  for (const m of [{}, { lato_x: 7, lato_z: 6, altezza: 5, tetto: "gradoni", materiale: "cobblestone" }]) {
    const b = genera(nome, m);
    assert.ok(b && b.length > 0, `${nome} vuoto`);
    assert.equal(new Set(b.map(k)).size, b.length, `${nome} ha blocchi doppi`);
    assert.ok(b.every((x) => x.length === 4 && x.slice(0, 3).every(Number.isInteger) && x[3].startsWith("minecraft:")), `${nome} formato`);
    assert.ok(b.length <= 1500, `${nome} troppo grande: ${b.length}`);
  }
}
// torre: dall'ultimo gradino si esce dalla botola sul tetto
const torre = genera("torre", { altezza: 8 }); const pos = new Set(torre.map(k));
const gradini = torre.filter((b) => b[1] >= 1 && b[1] <= 8 && b[0] > 0 && b[0] < 4 && b[2] > 0 && b[2] < 4);
const ultimo = gradini.find((b) => b[1] === 8);
assert.ok(ultimo, "manca l'ultimo gradino");
assert.ok(!pos.has(`${ultimo[0]},9,${ultimo[2]}`), "botola sopra l'ultimo gradino");
// ogni gradino ha testa libera (2 blocchi sopra)
for (const g of gradini) assert.ok(!pos.has(`${g[0]},${g[1] + 1},${g[2]}`) && !pos.has(`${g[0]},${g[1] + 2},${g[2]}`) || g[1] >= 7, `testa bloccata sul gradino ${k(g)}`);
// casa a due piani: buco nel solaio sopra l'ultimo gradino
const c2 = new Set(genera("casa_due_piani", { altezza: 3 }).map(k));
assert.ok(c2.has("1,3,3") && !c2.has("1,4,3") && !c2.has("1,4,2"), "salita al secondo piano");
// routine: tutti i crafting esistono, e la routine si espande in coda
for (const [n, r] of Object.entries(ROUTINE)) for (const p of r.passi) if (p.tipo === "crafta" && p.oggetto !== "planks") assert.ok(RICETTE[`minecraft:${p.oggetto}`], `${n}: ricetta ${p.oggetto} mancante`);
for (const [n, r] of Object.entries(ROUTINE)) for (const p of r.passi) if (p.tipo === "costruisci") assert.ok(SCHEMI_BASE[p.schema], `${n}: schema ${p.schema}`);
mem.coda = [{ tipo: "esplora" }];
assegna({ tipo: "routine", nome: "attrezzi_pietra" }, "test");
eseguiCompito({});
assert.equal(mem.coda.length, ROUTINE.attrezzi_pietra.passi.length + 1);
assert.equal(mem.coda[0].tipo, "raccogli"); assert.equal(mem.coda.at(-1).tipo, "esplora");
console.log(`test strutture ok: ${Object.keys(SCHEMI_BASE).length} schemi, ${Object.keys(ROUTINE).length} routine`);
