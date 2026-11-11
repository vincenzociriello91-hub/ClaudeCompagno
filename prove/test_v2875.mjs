import assert from "node:assert/strict";
import { system, world } from "@minecraft/server";
import { difendi, esciDalRiparo, registraAggressione } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 10/11 15:56-16:04: 4 morti in 8 minuti con corazza e gambali di RAME addosso. (1) il rame non basta: resta "debole";
// (2) sotto tiro da uno scheletro che non vede o non raggiunge: tana; (3) uscita all'alba tra i mostri: si aspetta.
let mostri = [], vita = 20;
const dim = { id: "minecraft:overworld", getEntities: () => mostri };
const base = { id: "bot", name: "Claude", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, isSneaking: false, dimension: dim,
  getComponent: (n) => /health/.test(n) ? { currentValue: vita } : /equippable/.test(n) ? { getEquipment: (p) => (p === "Chest" ? { typeId: "minecraft:copper_chestplate" } : undefined) } : { container: { size: 0, getItem() {} } },
  teleport(p) { this.location = p; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
mem.protettoFino = 0; mem.rifugio = null; mem.compito = null; mem.coda = []; mem.modalita = "autonomo"; mem.emergenzaT = 0;
// zombie a 6 blocchi con la corazza di rame: non lo insegue più
system.currentTick = 20000; mostri = [{ isValid: true, id: "z1", typeId: "minecraft:zombie", location: { x: 16.5, y: 64, z: 10.5 } }];
assert.equal(difendi(bot), false, "con la sola corazza di rame è andato a cercare uno zombie");
// colpito da uno scheletro lontano 20 blocchi (fuori vista), vita 9: tana d'emergenza anche senza bersaglio
mostri = []; vita = 9; system.currentTick += 100;
const scheletro = { id: "s1", typeId: "minecraft:skeleton", isValid: true, location: { x: 30.5, y: 64, z: 10.5 }, dimension: dim };
globalThis.__entita = new Map([["s1", scheletro]]); registraAggressione(bot, scheletro);
assert.equal(difendi(bot), false);
assert.equal(mem.compito?.tipo, "tana", "sotto tiro a metà vita non si è riparato");
assert.equal(mem.compito.emergenza, true);
// uscita all'alba: con un mostro sopra il riparo si aspetta, senza si esce; a mattina inoltrata si esce comunque
// 2.8.81: vita piena (con vita ≤ 10 aspetta tutto il giorno: test_v2881)
mem.compito = null; vita = 20; mem.rifugio = { x: 10, y: 60, z: 10, ok: true }; bot.location = { x: 10.5, y: 60, z: 10.5 };
dim.getBlock = (p) => ({ typeId: p.y <= 63 ? "minecraft:dirt" : "minecraft:air", isAir: p.y > 63, isLiquid: false, location: p });
dim.heightRange = { min: -64, max: 320 }; dim.getTopmostBlock = (q) => ({ location: { x: q.x, y: 63, z: q.z } });
world.getTimeOfDay = () => 600; mostri = [{ isValid: true, id: "z2", typeId: "minecraft:zombie", location: { x: 13.5, y: 64, z: 10.5 } }];
assert.equal(esciDalRiparo(bot), "aspetta", "è uscito all'alba con uno zombie sopra la tana");
assert.ok(mem.rifugio?.ok, "ha dimenticato il riparo mentre aspettava");
world.getTimeOfDay = () => 4500;
assert.equal(esciDalRiparo(bot), true, "a metà mattina deve uscire comunque"); assert.equal(mem.rifugio, null);
mem.rifugio = { x: 10, y: 60, z: 10, ok: true }; bot.location = { x: 10.5, y: 60, z: 10.5 }; world.getTimeOfDay = () => 600; mostri = [];
assert.equal(esciDalRiparo(bot), true, "senza mostri deve uscire all'alba");
delete world.getTimeOfDay;
console.log("test v2.8.75 ok");
