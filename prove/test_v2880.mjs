import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi } from "./scripts/azioni.js";
import { mem, sessione } from "./scripts/memoria.js";
// 2.8.80 — 11/11 06:26: andando a legna "Attacco creeper", "Scappo dal creeper: vita 17/20" e pochi secondi dopo
// "Sono morto: entityExplosion da creeper". Con il creeper a pochi passi la fuga non fa in tempo: tana subito.
let mosso = 0, corazza;
const creeper = { isValid: true, id: "c1", typeId: "minecraft:creeper", location: { x: 15.5, y: 64, z: 10.5 }, applyDamage() {} };
const base = { id: "bot", name: "Claude", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, isSneaking: false,
  dimension: { id: "minecraft:overworld", getEntities: () => [creeper] },
  getComponent: (n) => (/health/.test(n) ? { currentValue: 17 } : { container: { size: 0, getItem() {} }, getEquipment: (s) => (s === "Chest" ? corazza : undefined) }),
  moveToLocation() { mosso++; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
const azzera = () => { mem.protettoFino = 0; mem.rifugio = null; mem.compito = { tipo: "raccogli", stato: {} }; mem.coda = [{ tipo: "crafta" }]; mem.modalita = "autonomo"; mem.emergenzaT = 0; mem.tanaKo = 0; mosso = 0; };
// 1) senza corazza di ferro, creeper a 5 blocchi: nessuna fuga, tana d'emergenza al primo giro
azzera(); system.currentTick = 30000;
assert.equal(difendi(bot), false);
assert.equal(mem.compito?.tipo, "tana", "creeper a 5 blocchi: doveva chiudersi subito in una tana");
assert.equal(mem.compito.emergenza, true); assert.equal(mem.coda.length, 0); assert.equal(mosso, 0);
assert.ok(sessione.operazioni.some((o) => /Creeper a pochi passi/.test(o)));
// 2) la tana qui è appena fallita (acqua, roccia): si scappa come prima
azzera(); mem.tanaKo = Date.now(); creeper.id = "c2"; system.currentTick += 1000;
assert.equal(difendi(bot), true, "tana impossibile: doveva scappare");
assert.equal(mem.compito.tipo, "raccogli"); assert.ok(mosso >= 1);
// 3) con la corazza di ferro e vita 17 combatte: niente tana
azzera(); corazza = { typeId: "minecraft:iron_chestplate" }; system.currentTick += 70;
assert.equal(difendi(bot), true);
assert.equal(mem.compito.tipo, "raccogli", "con la corazza di ferro non deve chiudersi in tana");
console.log("test v2.8.80 ok");
