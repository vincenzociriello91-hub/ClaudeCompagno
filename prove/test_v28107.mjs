import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.107 — 12/11: niente legna intorno a casa (palude): attrezzi_pietra 0/12, piccone di ferro fermo per 1 bastone. La ricerca
// della legna andava a caso a 32 blocchi per 4 volte. Ora va sempre più lontano (32, 56, 80...) e dalla parte opposta a casa.
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => [],
  getBlock: (p) => { const t = p.y <= 63 ? "minecraft:dirt" : "minecraft:air"; return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p,
    above() { return dim.getBlock({ ...p, y: p.y + 1 }); }, below() { return dim.getBlock({ ...p, y: p.y - 1 }); }, north() { return null; }, south() { return null; }, east() { return null; }, west() { return null; } }; },
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", location: { x: q.x, y: 63, z: q.z } }) };
const base = { id: "bot", isValid: true, location: { x: 50.5, y: 64, z: 0.5 }, dimension: dim, selectedSlotIndex: 0,
  getComponent: () => ({ container: { size: 36, getItem: () => undefined }, getEquipment: () => undefined }), moveToLocation() {}, teleport(p) { this.location = p; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
mem.compito = null; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = { casa: { x: 0, y: 64, z: 0 } }; mem.risorse = {};
system.currentTick = 1000;
assegna({ tipo: "raccogli", blocco: "legna", quantita: 1 }, "piano");
const s = mem.compito.stato;
const giro = () => { s.esplora = null; s.lista = []; system.currentTick += 20; eseguiCompito(bot); return s.esplora; };
const e1 = giro();
assert.ok(e1, "nessuna esplorazione senza legna intorno");
const d1 = Math.hypot(e1.x - 50, e1.z); assert.ok(d1 >= 30 && d1 <= 34, "primo giro a ~32 blocchi: " + d1);
assert.ok(e1.x > 50 + 20, "doveva andare dalla parte opposta a casa (est): " + JSON.stringify(e1));
giro(); const e3 = giro();
const d3 = Math.hypot(e3.x - 50, e3.z); assert.ok(d3 >= 78 && d3 <= 82, "terzo giro a ~80 blocchi: " + d3);
giro(); giro(); assert.ok(giro(), "per la legna fa 6 giri prima di arrendersi");
giro(); assert.equal(mem.compito, null, "dopo 6 giri deve arrendersi");
console.log("test v2.8.107 ok");
