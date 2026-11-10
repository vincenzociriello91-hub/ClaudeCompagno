import assert from "node:assert/strict";
import { esciDalRiparo } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// tana a 10,62,10 chiusa da un blocco a y 64 (terreno a y 63): di giorno il bot deve uscire sopra il tappo
const tipo = (p) => (p.x === 10 && p.z === 10 && (p.y === 62 || p.y === 63) ? "minecraft:air" : p.y <= 63 || (p.x === 10 && p.z === 10 && p.y === 64) ? "minecraft:dirt" : "minecraft:air");
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p }; },
  getTopmostBlock: (q) => ({ location: { x: q.x, y: q.x === 10 && q.z === 10 ? 64 : 63, z: q.z } }) };
const bot = { location: { x: 10.5, y: 62, z: 10.5 }, dimension: dim, teleport(p) { this.location = p; } };
mem.rifugio = { x: 10, y: 62, z: 10, ok: true };
assert.equal(esciDalRiparo(bot), true);
assert.equal(bot.location.y, 65, "non è uscito in superficie: " + JSON.stringify(bot.location));
assert.equal(mem.rifugio, null);
// lontano dal riparo: non si sposta, ma il riparo vecchio si dimentica
bot.location = { x: 60.5, y: 64, z: 60.5 }; mem.rifugio = { x: 10, y: 62, z: 10, ok: true };
assert.equal(esciDalRiparo(bot), false); assert.equal(bot.location.x, 60.5); assert.equal(mem.rifugio, null);
assert.equal(esciDalRiparo(bot), false, "senza riparo non fa niente");
console.log("test v2.8.63 ok");
