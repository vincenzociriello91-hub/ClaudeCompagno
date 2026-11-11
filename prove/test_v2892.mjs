import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi } from "./scripts/azioni.js";
import { mem, sessione } from "./scripts/memoria.js";
// 2.8.92 — 11/11 14:25-16:00: lo stesso creeper vicino alla fattoria ha mandato il bot in tana 9 volte in un'ora e mezza.
// Dopo 2 tane nella stessa zona, con vita alta e spada di ferro, il bot lo affronta invece di rintanarsi ancora.
// 2.8.93: creeper diversi nella stessa zona contano insieme (lì ce n'erano diversi e la 2.8.92 non ne ha mai affrontato uno).
let vita = 20, attacchi = 0;
const creeper = { isValid: true, id: "c9", typeId: "minecraft:creeper", location: { x: 13.5, y: 64, z: 10.5 }, applyDamage() {} };
const slots = Array(36).fill(undefined); slots[0] = { typeId: "minecraft:iron_sword", amount: 1, getComponent: () => undefined };
const base = { id: "bot", name: "Claude", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, isSneaking: false, selectedSlotIndex: 0,
  dimension: { id: "minecraft:overworld", getEntities: () => [creeper] },
  getComponent: (n) => (/health/.test(n) ? { currentValue: vita } : /inventory/.test(n) ? { container: { size: 36, getItem: (i) => slots[i], setItem: (i, v) => { slots[i] = v; }, swapItems() {} } } : { getEquipment: () => undefined }),
  moveToLocation() {}, navigateToEntity() {}, lookAtEntity() {}, attackEntity: () => { attacchi++; return true; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
const prova = () => { mem.protettoFino = 0; mem.rifugio = null; mem.compito = { tipo: "fattoria", stato: {} }; mem.coda = []; mem.modalita = "autonomo"; mem.emergenzaT = 0; mem.tanaKo = 0;
  system.currentTick += 1000; return difendi(bot); };
system.currentTick = 50000;
prova(); assert.equal(mem.compito.tipo, "tana", "prima volta: tana");
creeper.id = "c9b"; // un altro creeper nella stessa zona
prova(); assert.equal(mem.compito.tipo, "tana", "seconda volta: tana");
creeper.id = "c9c";
creeper.location = { x: 12.5, y: 64, z: 10.5 }; // a 2 blocchi: a portata di spada
assert.equal(prova(), true, "terza volta: doveva combattere");
assert.equal(mem.compito.tipo, "fattoria", "terza volta: di nuovo in tana per lo stesso creeper");
assert.ok(attacchi > 0, "non ha colpito il creeper");
assert.ok(sessione.operazioni.some((o) => /lo affronto con la spada/.test(o)));
creeper.location = { x: 13.5, y: 64, z: 10.5 };
// con poca vita no: tana come prima
vita = 12; creeper.id = "c10";
prova(); prova(); prova(); assert.equal(mem.compito.tipo, "tana", "con vita 12 non deve affrontarlo");
console.log("test v2.8.92 ok");
