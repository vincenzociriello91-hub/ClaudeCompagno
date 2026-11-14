import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.116 — 14/11: appena indossata la corazza di ferro il bot ha smesso di evitare i creeper e li colpiva corpo a corpo:
// "Sono morto: entityExplosion da creeper" a 79,87,231 e, scappando a vita 9, ucciso da uno zombie. Ora con un creeper a
// pochi passi si chiude in tana anche con la corazza di ferro (il corpo a corpo resta solo con affrontaCreeper).
let mosso = 0;
const creeper = { isValid: true, id: "k1", typeId: "minecraft:creeper", location: { x: 15.5, y: 64, z: 10.5 }, applyDamage() {} };
const base = { id: "bot", name: "Claude", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, isSneaking: false,
  dimension: { id: "minecraft:overworld", getEntities: () => [creeper] },
  getComponent: (n) => (/health/.test(n) ? { currentValue: 17 } : { container: { size: 0, getItem() {} }, getEquipment: (s) => (s === "Chest" ? { typeId: "minecraft:iron_chestplate" } : undefined) }),
  moveToLocation() { mosso++; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
mem.protettoFino = 0; mem.rifugio = null; mem.compito = { tipo: "vai", stato: {} }; mem.coda = []; mem.modalita = "autonomo"; mem.emergenzaT = 0; mem.tanaKo = 0;
system.currentTick = 90000;
difendi(bot);
assert.equal(mem.compito?.tipo, "tana", "con la corazza di ferro e un creeper a 5 blocchi doveva chiudersi in tana, non attaccarlo");
console.log("test v2.8.116 ok");
