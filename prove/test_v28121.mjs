import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// 2.8.121 — 14/11: la missione nel cervello si contraddiceva ("non fermarsi" al 7° posto ma "sopra tutti gli altri
// punti"; due classifiche con "sopravvivere" prima al 1° e poi al 3° posto; di notte "lavora vicino a casa" contro la
// tana; creeper "colpendo e arretrando" contro la prudenza). Ora segue PRINCIPI_BOT.md.
const s = readFileSync(new URL("./scripts/cervello.js", import.meta.url), "utf8");
for (const vecchio of ["sopra tutti gli altri punti", "PRIORITÀ, in ordine", "3. Sopravvivere:", "Di notte non stare fermo", "non è più mortale", "I creeper li gestisci da solo colpendo e arretrando", "su questi sette punti"])
  assert.ok(!s.includes(vecchio), `contraddizione ancora presente: ${vecchio}`);
assert.ok(s.includes("NON FERMARSI non è un punto in classifica"));
assert.ok(s.indexOf("REGOLE FISSE, sopra la missione") < s.indexOf("1. SOPRAVVIVERE"), "le regole fisse devono stare sopra la missione");
console.log("test v2.8.121 ok");
