import assert from "node:assert/strict";
import { traslocoNelBosco } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.109 — trasloco nel bosco: base in palude (annegamenti intorno a casa e fattoria), il bot a 200 blocchi in un bosco
// asciutto: casa e fattoria si spostano lì (la fattoria nuova si rifà accanto alla casa nuova).
let alberi = true;
const tipo = (p) => (alberi && p.y === 64 && p.x % 4 === 0 && p.z % 4 === 0 && Math.abs(p.z) > 12 ? "minecraft:oak_log" : p.y <= 63 ? "minecraft:grass_block" : "minecraft:air");
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => [],
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p }; },
  getTopmostBlock: (q) => ({ typeId: "minecraft:grass_block", location: { x: q.x, y: 63, z: q.z } }) };
const bot = { id: "bot", location: { x: 200.5, y: 64, z: 0.5 }, dimension: dim };
const palude = () => {
  mem.luoghi = { casa: { x: 0, y: 64, z: 0 }, fattoria: { x: 10, y: 63, z: 10 }, deposito: { x: 2, y: 64, z: 2 } };
  mem.pericoli = [1, 2, 3].map((i) => ({ x: i * 5, y: 60, z: 5, r: 8, motivo: "acqua (annegamento)", t: 1 }));
  mem.traslocoT = 0; mem.ultimoControlloBosco = 0;
};
palude();
bot.location = { x: 40.5, y: 64, z: 0.5 };
assert.equal(traslocoNelBosco(bot), false, "a 40 blocchi dalla palude non deve traslocare");
mem.ultimoControlloBosco = 0; bot.location = { x: 200.5, y: 64, z: 0.5 }; alberi = false;
assert.equal(traslocoNelBosco(bot), false, "senza alberi non è un bosco");
mem.ultimoControlloBosco = 0; alberi = true;
assert.equal(traslocoNelBosco(bot), true, "lontano dalla palude, in un bosco asciutto, doveva traslocare");
assert.ok(Math.abs(mem.luoghi.casa.x - 200) < 60, "casa nuova non vicino al bosco: " + JSON.stringify(mem.luoghi.casa));
assert.equal(mem.luoghi.fattoria, undefined, "la fattoria vecchia va lasciata (se ne fa una nuova accanto alla casa)");
assert.equal(mem.luoghi.deposito, undefined);
assert.equal(mem.luoghi.casa_palude.x, 0); assert.equal(mem.luoghi.fattoria_palude.x, 10);
assert.match(mem.eventi.at(-1).testo, /Trasloco: lascio la palude/);
mem.ultimoControlloBosco = 0; bot.location = { x: 400.5, y: 64, z: 0.5 };
assert.equal(traslocoNelBosco(bot), false, "un secondo trasloco subito dopo non deve partire");
console.log("test v2.8.109 ok");
