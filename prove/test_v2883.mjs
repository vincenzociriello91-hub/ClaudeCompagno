import assert from "node:assert/strict";
import { http } from "@minecraft/server-net";
import { riflessione } from "./scripts/cervello.js";
import { mem, sessione } from "./scripts/memoria.js";
// 2.8.83 — 11/11: riflessione Fable pagata $0.20 e registrata come "fatta" con nota e priorità vuote. Ora una risposta vuota
// si segna come fallita con il motivo, e le lezioni di prima restano.
const lezioniPrima = ["a", "b", "c"];
mem.lezioni = [...lezioniPrima]; mem.prioritaGratis = ["cibo"];
mem.riflessione = { giorno: "2026-11-11", stato: "inviata", id: "msgbatch_x", t: Date.now(), modello: "claude-fable-5-2" };
const risultato = { custom_id: "riflessione", result: { type: "succeeded", message: { stop_reason: "max_tokens", usage: { input_tokens: 40000, output_tokens: 8000 },
  content: [{ type: "tool_use", name: "riflessione", input: {} }] } } };
let n = 0; // 1ª chiamata: stato del batch; 2ª: risultati
http.request = async () => ({ status: 200, body: n++ === 0 ? JSON.stringify({ processing_status: "ended", results_url: "https://r/x" }) : JSON.stringify(risultato) });
await riflessione();
assert.equal(mem.riflessione.stato, "errore", "risposta vuota registrata come riuscita");
assert.ok(/max_tokens/.test(mem.riflessione.nota), mem.riflessione.nota);
assert.deepEqual(mem.lezioni, lezioniPrima); assert.deepEqual(mem.prioritaGratis, ["cibo"]);
assert.ok(sessione.operazioni.some((o) => /Riflessione fallita/.test(o)));
console.log("test v2.8.83 ok");
