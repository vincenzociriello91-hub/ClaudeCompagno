import assert from "node:assert/strict";
import { mem, sessione, rapporto } from "./scripts/memoria.js";
mem.esperienza = { crafta: { ok: 10, ko: 2 } };
sessione.espInizio = { crafta: { ok: 4, ko: 2 } };
const r = rapporto("test", {});
assert.match(r, /crafta: prima di oggi 67% su 6 \| questa sessione 100% su 6 \| totale 83%/);
console.log("test apprendimento ok");
