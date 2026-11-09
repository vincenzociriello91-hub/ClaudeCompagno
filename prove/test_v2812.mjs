import assert from "node:assert/strict";
import { trovaSpiazzo } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
mem.pericoli = [];
// collina ripida ovunque entro 20 blocchi dalla casa, piano solo oltre: prima non trovava niente
const casa = { x: 142, y: 64, z: 359 };
const alt = (x, z) => (Math.hypot(x - casa.x, z - casa.z) < 22 ? 63 + ((x + z) % 4) : 63);
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => (p.y <= alt(p.x, p.z) ? { typeId: "minecraft:grass_block", isAir: false, isLiquid: false, location: p } : { typeId: "minecraft:air", isAir: true, isLiquid: false, location: p }),
  getTopmostBlock: (q) => ({ typeId: "minecraft:grass_block", isAir: false, location: { x: q.x, y: alt(q.x, q.z), z: q.z } }) };
const sp = trovaSpiazzo(dim, casa, 7, []);
assert.ok(sp, "nessuno spiazzo anche oltre la collina");
assert.ok(Math.hypot(sp.x - casa.x, sp.z - casa.z) <= 40, "troppo lontano: " + JSON.stringify(sp));
// terreno a gradini di un blocco con terra: prima "occupato" ovunque
const alt2 = (x, z) => 63 + (x % 2);
const dim2 = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => (p.y <= alt2(p.x, p.z) ? { typeId: "minecraft:dirt", isAir: false, isLiquid: false, location: p } : { typeId: "minecraft:air", isAir: true, isLiquid: false, location: p }),
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", isAir: false, location: { x: q.x, y: alt2(q.x, q.z), z: q.z } }) };
assert.ok(trovaSpiazzo(dim2, casa, 7, []), "terreno a gradini con terra: nessuno spiazzo");
// zone di morte per scheletri intorno a casa: non bloccano più; il motivo del rifiuto è contato
import("./scripts/azioni.js").then(({ motiviSpiazzo }) => {
  mem.pericoli = [{ x: 142, y: 64, z: 359, r: 40, motivo: "projectile da skeleton" }];
  assert.ok(trovaSpiazzo(dim2, casa, 7, []), "zone da mostri bloccano lo spiazzo");
  mem.pericoli = [{ x: 142, y: 64, z: 359, r: 90, motivo: "grotta (caduta)" }];
  assert.equal(trovaSpiazzo(dim2, casa, 7, []), null);
  assert.ok(motiviSpiazzo.pericolo > 0, "motivo non contato");
  // blocco naturale nuovo mai visto (leaf_litter) sul terreno: non occupa più
  mem.pericoli = [];
  const dim3 = { ...dim2, getBlock: (p) => (p.y === alt2(p.x, p.z) + 1 ? { typeId: "minecraft:leaf_litter", isAir: false, isLiquid: false, location: p } : dim2.getBlock(p)) };
  assert.ok(trovaSpiazzo(dim3, casa, 7, []), "leaf_litter rende occupato lo spiazzo");
  console.log("test v2.8.12/18 ok", JSON.stringify(sp));
});
