import assert from "node:assert/strict";
import { world } from "@minecraft/server";
import { esciDalRiparo } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.97 — 11/11 20:27: uscito dalla tana all'alba con una strega e 3 scheletri appena oltre i 12 blocchi controllati.
// Gli scheletri tirano da 16: in 13 secondi era a vita 10, poi il veleno lo ha portato a 1. Ora si guarda fino a 20 blocchi.
let mostri = [];
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getEntities: (q) => mostri.filter((e) => Math.hypot(e.location.x - q.location.x, e.location.y - q.location.y, e.location.z - q.location.z) <= (q.maxDistance ?? 1e9)),
  getBlock: (p) => ({ typeId: p.y <= 63 ? "minecraft:dirt" : "minecraft:air", isAir: p.y > 63, isLiquid: false, location: p }),
  getTopmostBlock: (q) => ({ location: { x: q.x, y: 63, z: q.z } }) };
const bot = { location: { x: 10.5, y: 60, z: 10.5 }, dimension: dim, teleport(p) { this.location = p; }, getComponent: (n) => (/health/.test(n) ? { currentValue: 14 } : null) };
world.getTimeOfDay = () => 500; mem.pericoli = [];
const prova = (x) => { mostri = [{ isValid: true, id: "s", typeId: "minecraft:skeleton", location: { x, y: 64, z: 10.5 } }];
  bot.location = { x: 10.5, y: 60, z: 10.5 }; mem.rifugio = { x: 10, y: 60, z: 10, ok: true }; return esciDalRiparo(bot); };
assert.equal(prova(26.5), "aspetta", "all'alba è uscito con uno scheletro a 16 blocchi");
assert.equal(prova(32.5), true, "uno scheletro a 22 blocchi non deve tenerlo dentro");
console.log("test v2.8.97 ok");
