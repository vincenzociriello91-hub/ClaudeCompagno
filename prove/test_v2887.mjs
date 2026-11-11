import assert from "node:assert/strict";
import { world } from "@minecraft/server";
import { esciDalRiparo } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.87 — l'11/11 09:40-10:22 un creeper è rimasto accanto alla tana: il bot usciva, "creeper a pochi passi", rientrava,
// per mezz'ora (14 blocchi percorsi). Ora con un creeper fuori aspetta 3 minuti, poi esce a 12 blocchi dalla parte opposta.
let mostri = [{ isValid: true, id: "c", typeId: "minecraft:creeper", location: { x: 14.5, y: 64, z: 10.5 } }];
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => mostri,
  getBlock: (p) => ({ typeId: p.y <= 63 ? "minecraft:dirt" : "minecraft:air", isAir: p.y > 63, isLiquid: false, location: p }),
  getTopmostBlock: (q) => ({ location: { x: q.x, y: 63, z: q.z } }) };
const bot = { location: { x: 10.5, y: 60, z: 10.5 }, dimension: dim, teleport(p) { this.location = p; }, getComponent: (n) => (/health/.test(n) ? { currentValue: 20 } : null) };
world.getTimeOfDay = () => 6000; mem.pericoli = []; mem.rifugio = { x: 10, y: 60, z: 10, ok: true };
assert.equal(esciDalRiparo(bot), "aspetta", "a vita piena è uscito con il creeper accanto alla tana");
mem.rifugio.attesa = Date.now() - 200000;
assert.equal(esciDalRiparo(bot), true);
assert.ok(bot.location.x < 6, "doveva uscire lontano dal creeper: " + JSON.stringify(bot.location));
// senza creeper (solo uno zombie, a mezzogiorno, vita piena) esce sopra la tana come prima
mostri = [{ isValid: true, id: "z", typeId: "minecraft:zombie", location: { x: 13.5, y: 64, z: 10.5 } }];
bot.location = { x: 10.5, y: 60, z: 10.5 }; mem.rifugio = { x: 10, y: 60, z: 10, ok: true };
assert.equal(esciDalRiparo(bot), true); assert.equal(Math.floor(bot.location.x), 10);
delete world.getTimeOfDay;
console.log("test v2.8.87 ok");
