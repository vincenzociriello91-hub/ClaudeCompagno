import assert from "node:assert/strict";
import { bozzoloOk } from "./scripts/azioni.js";
// 2.8.136 — 24/11 23:25-00:15 UTC: in miniera a 64,17,204 di notte la tana falliva ("acqua o grotte") e il bozzolo pure,
// 42 volte di fila, sempre "(scarico)": la cella oltre il confine di chunk (x 63) non è caricata. Un chunk non caricato
// non fa muovere mostri: quella cella si salta e il bozzolo si chiude con le altre.
for (const e of ["ok", "gia", "occupato", "scarico"]) assert.equal(bozzoloOk(e), true, e);
for (const e of ["protetto", "giocatore", "attrezzo"]) assert.equal(bozzoloOk(e), false, e);
console.log("test v2.8.136 ok");
