import assert from "node:assert/strict";
import { genera, blocchiSchema, salvaSchema } from "./scripts/schemi.js";
import { mem } from "./scripts/memoria.js";
const k = (b) => `${b[0]},${b[1]},${b[2]}`;
// casa 5x5 alta 3: pavimento 25 + pareti 16*3 - porta 2 - 3 finestre + tetto 25
const casa = genera("casa", { lato_x: 5, lato_z: 5, altezza: 3, materiale: "cobblestone", materiale2: "oak_planks" });
assert.equal(casa.length, 25 + 48 - 2 - 3 + 25);
const pos = new Set(casa.map(k));
assert.ok(!pos.has("0,1,2") && !pos.has("0,2,2"), "porta a ovest libera");
assert.ok(!pos.has("4,2,2"), "finestra a est");
assert.equal(new Set(casa.map(k)).size, casa.length, "nessun blocco doppio");
assert.ok(casa.every((b) => b[3].startsWith("minecraft:")));
// rifugio 3x3: chiuso, centro libero per stare dentro
const rif = genera("rifugio", {});
assert.equal(rif.length, 9 + 16 + 9);
assert.ok(!rif.some((b) => b[0] === 1 && b[2] === 1 && (b[1] === 1 || b[1] === 2)), "centro libero");
assert.equal(genera("astronave", {}), null);
// salvataggio e riuso
assert.equal(salvaSchema("Casa di pietra!", casa), "casa_di_pietra");
assert.equal(blocchiSchema({ schema: "casa_di_pietra" }).length, casa.length);
assert.equal(salvaSchema("casa", casa), false, "non sovrascrive gli schemi base");
for (let i = 0; i < 12; i++) salvaSchema(`s${i}`, [[0, 0, 0, "minecraft:dirt"]]);
assert.equal(Object.keys(mem.schemi).length, 10, "massimo 10 schemi");
console.log("test schemi ok");
