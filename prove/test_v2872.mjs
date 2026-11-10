import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { rientraNelRiparo, difendi } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 10/11 12:50: aggiornamento arrivato di notte con il bot chiuso nella tana (73,53,380). Appena rinato ha attaccato un
// creeper, è scappato ed è morto in una grotta 20 secondi dopo. Rinato nel riparo: al suo posto, protetto, niente lotte.
let effetto = null;
const creeper = { isValid: true, id: "c1", typeId: "minecraft:creeper", location: { x: 75, y: 57, z: 380 }, applyDamage() {} };
const base = { id: "bot", isValid: true, location: { x: 74.2, y: 54.1, z: 381.3 }, isSneaking: false,
  dimension: { id: "minecraft:overworld", getEntities: () => [creeper] },
  getComponent: (n) => (/health/.test(n) ? { currentValue: 20 } : { container: { size: 0, getItem() {} }, getEquipment() {} }),
  teleport(p) { this.location = p; }, addEffect(n, t, o) { effetto = { n, t, ...o }; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
mem.protettoFino = 0; mem.compito = null; mem.coda = [];
mem.rifugio = { x: 73, y: 53, z: 380, ok: true };
assert.equal(rientraNelRiparo(bot, { x: 73.5, y: 53, z: 380.5 }), true);
assert.deepEqual(bot.location, { x: 73.5, y: 53, z: 380.5 }, "non è tornato al suo posto nella tana");
assert.equal(effetto?.n, "resistance"); assert.ok(mem.protettoFino > Date.now() + 20000, "non è protetto");
system.currentTick = 5000;
assert.equal(difendi(bot), false, "appena rinato nel riparo ha attaccato un creeper");
// rinato lontano dal riparo (o senza riparo): niente protezione regalata
mem.protettoFino = 0; effetto = null;
assert.equal(rientraNelRiparo(bot, { x: 120.5, y: 64, z: 300.5 }), false); assert.equal(effetto, null); assert.equal(mem.protettoFino, 0);
mem.rifugio = null; assert.equal(rientraNelRiparo(bot, { x: 73.5, y: 53, z: 380.5 }), false);
console.log("test v2.8.72 ok");
