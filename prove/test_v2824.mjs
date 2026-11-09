import assert from "node:assert/strict";
import { spostaBaseSeAllagata } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => (p.y <= 63 ? { typeId: "minecraft:grass_block", isAir: false, isLiquid: false, location: p } : { typeId: "minecraft:air", isAir: true, isLiquid: false, location: p }),
  getTopmostBlock: (q) => ({ typeId: "minecraft:grass_block", isAir: false, location: { x: q.x, y: 63, z: q.z } }) };
const casa = { x: 142, y: 64, z: 359 };
mem.luoghi = { casa: { ...casa }, fattoria: { x: 150, y: 64, z: 360 }, deposito: { x: 142, y: 61, z: 351 } };
// zone d'acqua vecchie (senza t, come quelle già salvate) sparse intorno a casa
mem.pericoli = [[0, 12], [12, 0], [-12, 0], [0, -12], [9, 9]].map(([dx, dz]) => ({ x: casa.x + dx, y: 60, z: casa.z + dz, r: 8, motivo: "acqua (annegamento)" }));
const bot = { location: { ...casa }, dimension: dim };
assert.equal(spostaBaseSeAllagata(bot), true, "con 5 zone d'acqua intorno doveva spostare la casa");
assert.ok(mem.luoghi.fattoria, "la fattoria che funziona non va dimenticata");
assert.ok(!mem.luoghi.deposito, "il deposito si rifà accanto alla casa nuova");
const nuova = { ...mem.luoghi.casa };
bot.location = { ...nuova }; mem.ultimoControlloBase = 0;
assert.equal(spostaBaseSeAllagata(bot), false, "le stesse zone vecchie hanno fatto saltare di nuovo la casa");
assert.deepEqual(mem.luoghi.casa, nuova);
console.log("test v2.8.24 ok");
