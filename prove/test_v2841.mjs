import assert from "node:assert/strict";
import { vista, letteraBlocco } from "./scripts/azioni.js";
// vista dal vivo per il pannello: 25x25 lettere di terreno, creature vicine, direzione
assert.equal(letteraBlocco("minecraft:water"), "w");
assert.equal(letteraBlocco("minecraft:oak_leaves"), "f");
assert.equal(letteraBlocco("minecraft:grass_block"), "g");
assert.equal(letteraBlocco("minecraft:cobblestone"), "c");
assert.equal(letteraBlocco("minecraft:deepslate_iron_ore"), "s");
let letture = 0;
const ent = [
  { id: "b", typeId: "minecraft:player", location: { x: 0, z: 0 } },
  { id: "z", typeId: "minecraft:zombie", location: { x: 3.4, z: -2.6 }, matches: () => true },
  { id: "c", typeId: "minecraft:cow", location: { x: -5, z: 1 }, matches: () => false },
  { id: "i", typeId: "minecraft:item", location: { x: 1, z: 1 } },
];
const dim = { getTopmostBlock: (q) => { letture++; return { typeId: q.x === 0 && q.z === 0 ? "minecraft:water" : "minecraft:grass_block" }; }, getEntities: () => ent };
const bot = { id: "b", location: { x: 0.5, y: 64, z: 0.5 }, dimension: dim, getViewDirection: () => ({ x: 1, y: 0, z: 0 }) };
const v = vista(bot);
assert.equal(v.g.length, 625);
assert.equal(v.g[12 * 25 + 12], "w", "centro della griglia non è il bot");
assert.deepEqual(v.mob.map((m) => [m.t, m.o]), [["zombie", 1], ["cow", 0]]);
assert.equal(v.dir, 90);
// fermo sul posto: il terreno non si rilegge (costo per la Odin)
const prima = letture; vista(bot); assert.equal(letture, prima);
bot.location = { x: 4.5, y: 64, z: 0.5 }; vista(bot); assert.equal(letture, prima + 625, "spostato di 4 blocchi: doveva rileggere");
console.log("test v2.8.41 ok");
