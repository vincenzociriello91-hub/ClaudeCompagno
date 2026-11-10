import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.71: scappando da un creeper per 10 secondi senza "colpirlo" il bot lo "lasciava perdere" e lo ignorava per un minuto:
// il creeper poteva arrivargli addosso non visto. Finché è entro 8 blocchi continua a scappare.
let mosso = 0;
const creeper = { isValid: true, id: "c1", typeId: "minecraft:creeper", location: { x: 16.5, y: 64, z: 10.5 }, applyDamage() {} };
const base = { id: "bot", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, isSneaking: false,
  dimension: { id: "minecraft:overworld", getEntities: () => [creeper] },
  getComponent: (n) => (/health/.test(n) ? { currentValue: 20 } : { container: { size: 0, getItem() {} }, getEquipment() {} }),
  moveToLocation() { mosso++; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
mem.protettoFino = 0; mem.rifugio = null; mem.compito = null; mem.coda = []; mem.modalita = "autonomo";
system.currentTick = 10000;
// 2.8.79: la fuga dura al massimo 10 secondi. Se il creeper è ancora lì (il bot nel test non si sposta) scappare non serve:
// il 10/11 è rimasto 28 minuti a "scappare" senza muoversi né lavorare. Fino ad allora non smette.
for (let i = 0; i < 19; i++) { system.currentTick += 10; assert.equal(difendi(bot), true, `ha smesso di scappare dopo ${i / 2} secondi`); }
assert.ok(mosso >= 3, "si è allontanato solo " + mosso + " volte");
console.log("test v2.8.73 ok");
