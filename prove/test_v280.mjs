import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { trovaSpiazzo, eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// mondo piatto: erba a y 63, aria sopra; una costruzione del giocatore a x 150..156
const blocchi = new Map();
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const k = `${p.x},${p.y},${p.z}`; if (blocchi.has(k)) return { typeId: blocchi.get(k), isAir: false, isLiquid: false, location: p };
    return p.y <= 63 ? { typeId: "minecraft:grass_block", isAir: false, isLiquid: false, location: p } : { typeId: "minecraft:air", isAir: true, isLiquid: false, location: p }; },
  getTopmostBlock: (q) => ({ typeId: "minecraft:grass_block", isAir: false, location: { x: q.x, y: 63, z: q.z } }),
  getEntities: () => [] };
for (let x = 150; x < 157; x++) for (let z = 358; z < 365; z++) blocchi.set(`${x},64,${z}`, "minecraft:oak_planks"); // casa del giocatore a est
const casa = { x: 142, y: 64, z: 359 };
const sp = trovaSpiazzo(dim, casa, 5, []);
assert.ok(sp, "nessuno spiazzo trovato");
assert.ok(!(sp.x <= 156 && sp.x + 4 >= 150 && sp.z <= 364 && sp.z + 4 >= 358), "spiazzo sopra la casa del giocatore: " + JSON.stringify(sp));
const sp2 = trovaSpiazzo(dim, casa, 9, [{ x: sp.x + 2, z: sp.z + 2 }]);
assert.ok(sp2 && Math.hypot(sp2.x - sp.x, sp2.z - sp.z) > 5, "il bosco si sovrappone alla casetta");
// ingrediente mancante: non conta come abilità fallita
mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; system.currentTick = 5;
const bot = { isValid: true, location: { x: 142, y: 64, z: 359 }, dimension: dim, getComponent: (c) => c === "minecraft:inventory" ? { container: { size: 36, getItem: () => undefined } } : undefined, stopMoving() {} };
mem.luoghi = { casa };
assegna({ tipo: "fornace" }, "piano");
eseguiCompito(bot); // arriva vicino a casa
for (let i = 0; i < 3 && mem.compito; i++) eseguiCompito(bot);
assert.equal(mem.esperienza.fornace?.ko ?? 0, 0, "mancanza contata come fallimento");
// dalla 2.8.8 senza pietre va a prenderle (prima registrava solo la mancanza)
assert.ok(mem.coda.some((p) => p.tipo === "raccogli" && p.blocco === "pietra") || mem.esperienza.fornace?.mancanze === 1, "né pietre cercate né mancanza: " + JSON.stringify(mem.coda));
console.log("test v2.8.0 ok");
