import assert from "node:assert/strict";
import { richiedePiccone } from "./scripts/azioni.js";
// 2.8.135 — 23/11: l'iron_pickaxe si è rotto alle 02:33 UTC e senza nessun piccone il piano ha scelto armatura_ferro 3 volte
// (04:34, 06:35, 06:55): miniera_scala "serve un piccone migliore per stone". armatura_ferro chiede un piccone quando
// deve scavare il ferro, cioè quando grezzo + lingotti non bastano per la corazza (8).
const bot = (oggetti) => ({ getComponent: () => ({ container: { size: oggetti.length, getItem: (i) => ({ typeId: `minecraft:${oggetti[i][0]}`, amount: oggetti[i][1] }) } }) });
assert.equal(richiedePiccone(bot([["raw_iron", 1]]), "armatura_ferro"), true, "1 ferro grezzo: deve scavare, serve il piccone");
assert.equal(richiedePiccone(bot([["raw_iron", 5], ["iron_ingot", 3]]), "armatura_ferro"), false, "8 ferro in tasca: solo fondere e craftare");
assert.equal(richiedePiccone(bot([]), "miniera:ferro"), true);
assert.equal(richiedePiccone(bot([]), "attrezzi_ferro"), true);
assert.equal(richiedePiccone(bot([]), "compito:fattoria"), false);
console.log("test v2.8.135 ok");
