import assert from "node:assert/strict";
import { world } from "@minecraft/server";
import { esciDalRiparo } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.98 — 11/11 21:05: a metà mattina, vita 20, senza corazza di ferro, è uscito sopra la tana con 2 scheletri e una strega
// intorno (all'ombra non bruciano): vita 9 e di nuovo in tana. Ora li aspetta 3 minuti e poi esce lontano da loro.
let mostri = [{ isValid: true, id: "s", typeId: "minecraft:skeleton", location: { x: 18.5, y: 64, z: 10.5 } }];
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => mostri,
  getBlock: (p) => ({ typeId: p.y <= 63 ? "minecraft:dirt" : "minecraft:air", isAir: p.y > 63, isLiquid: false, location: p }),
  getTopmostBlock: (q) => ({ location: { x: q.x, y: 63, z: q.z } }) };
let corazza;
const bot = { location: { x: 10.5, y: 60, z: 10.5 }, dimension: dim, teleport(p) { this.location = p; },
  getComponent: (n) => (/health/.test(n) ? { currentValue: 20 } : /equippable/.test(n) ? { getEquipment: () => corazza } : null) };
world.getTimeOfDay = () => 6000; mem.pericoli = []; mem.rifugio = { x: 10, y: 60, z: 10, ok: true };
assert.equal(esciDalRiparo(bot), "aspetta", "senza corazza è uscito con uno scheletro accanto alla tana");
mem.rifugio.attesa = Date.now() - 200000;
assert.equal(esciDalRiparo(bot), true);
assert.ok(bot.location.x < 6, "doveva uscire lontano dallo scheletro: " + JSON.stringify(bot.location));
assert.match(mem.eventi.at(-1).testo, /skeleton\) non se ne va/);
// con la corazza di ferro esce sopra la tana come prima
corazza = { typeId: "minecraft:iron_chestplate" };
bot.location = { x: 10.5, y: 60, z: 10.5 }; mem.rifugio = { x: 10, y: 60, z: 10, ok: true };
assert.equal(esciDalRiparo(bot), true); assert.equal(Math.floor(bot.location.x), 10);
console.log("test v2.8.98 ok");
