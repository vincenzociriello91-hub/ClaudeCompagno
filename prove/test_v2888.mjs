import assert from "node:assert/strict";
import { world } from "@minecraft/server";
import { esciDalRiparo } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.88 — 11/11 10:48: uscito dalla tana "dalla parte opposta al creeper" e subito "creeper a pochi passi": c'era un secondo
// creeper da quella parte. Ora l'uscita è la più lontana da tutti i mostri.
const mostri = [
  { isValid: true, id: "c1", typeId: "minecraft:creeper", location: { x: 14.5, y: 64, z: 10.5 } }, // a est, vicino
  { isValid: true, id: "c2", typeId: "minecraft:creeper", location: { x: -2.5, y: 64, z: 10.5 } }, // a ovest, dove usciva prima
];
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => mostri,
  getBlock: (p) => ({ typeId: p.y <= 63 ? "minecraft:dirt" : "minecraft:air", isAir: p.y > 63, isLiquid: false, location: p }),
  getTopmostBlock: (q) => ({ location: { x: q.x, y: 63, z: q.z } }) };
const bot = { location: { x: 10.5, y: 60, z: 10.5 }, dimension: dim, teleport(p) { this.location = p; }, getComponent: (n) => (/health/.test(n) ? { currentValue: 20 } : null) };
world.getTimeOfDay = () => 6000; mem.pericoli = []; mem.rifugio = { x: 10, y: 60, z: 10, ok: true, attesa: Date.now() - 200000 };
assert.equal(esciDalRiparo(bot), true);
const lontano = Math.min(...mostri.map((e) => Math.hypot(e.location.x - bot.location.x, e.location.z - bot.location.z)));
assert.ok(lontano >= 10, `uscito a ${lontano.toFixed(1)} blocchi da un creeper: ${JSON.stringify(bot.location)}`);
delete world.getTimeOfDay;
console.log("test v2.8.88 ok");
