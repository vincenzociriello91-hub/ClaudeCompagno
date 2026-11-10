import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 10/11 10:10: ucciso da uno zombie dentro la tana chiusa (testa a 0,2 blocchi dal suolo: in Bedrock colpiscono attraverso
// i blocchi). La tana scende di 4 e ha 2 blocchi pieni sopra la testa; su roccia senza piccone resta a 2 come prima.
const slot = Array(36).fill(undefined);
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const blocchi = new Map();
let roccia = -999; // da questa quota in giù è pietra
const tipo = (p) => blocchi.get(`${p.x},${p.y},${p.z}`) ?? (p.y <= roccia ? "minecraft:stone" : p.y <= 63 ? "minecraft:dirt" : "minecraft:air");
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, setType: (id) => blocchi.set(`${p.x},${p.y},${p.z}`, id) }; },
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) blocchi.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); },
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", location: { x: q.x, y: 63, z: q.z } }), getEntities: () => [] };
const bot = { isValid: true, location: { x: 5.5, y: 64, z: 5.5 }, selectedSlotIndex: 0, dimension: dim,
  getComponent: (c) => c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined, setEquipment: () => true },
  stopMoving() {}, lookAtBlock() {}, attack() {}, teleport(p) { this.location = p; } };
const scavaTana = (x) => {
  blocchi.clear(); slot.fill(undefined); slot[0] = { typeId: "minecraft:dirt", amount: 8 };
  bot.location = { x: x + 0.5, y: 64, z: 5.5 }; mem.compito = null; mem.rifugio = null; mem.coda = [];
  assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
  for (let i = 0; i < 6 && mem.compito; i++) { system.currentTick += 5; eseguiCompito(bot); }
};
system.currentTick = 10; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
scavaTana(5);
assert.equal(bot.location.y, 60, "tana poco profonda: uno zombie in superficie arriva alla testa");
assert.equal(tipo({ x: 5, y: 62, z: 5 }), "minecraft:dirt", "manca il primo blocco sopra la testa");
assert.equal(tipo({ x: 5, y: 63, z: 5 }), "minecraft:dirt", "manca il secondo blocco sopra la testa");
assert.equal(tipo({ x: 5, y: 61, z: 5 }), "minecraft:air", "la testa del bot è murata");
assert.deepEqual(mem.rifugio, { x: 5, y: 60, z: 5, ok: true });
// roccia da y 61 in giù e niente piccone (appena rinato): tana da 2 come prima, chiusa, non "terreno troppo duro"
roccia = 61; scavaTana(30);
assert.equal(bot.location.y, 62, "senza piccone doveva fermarsi sopra la roccia: " + JSON.stringify(bot.location));
assert.equal(tipo({ x: 30, y: 64, z: 5 }), "minecraft:dirt", "tana corta non chiusa");
assert.ok(mem.rifugio?.ok, "tana corta non registrata");
// grotta sotto a y 59 (il pavimento della tana da 4 sarebbe il vuoto): si ferma a 3, con 2 blocchi sopra la testa
roccia = -999; scavaTana(50); // prova a vuoto per pulire, poi la grotta
blocchi.clear(); blocchi.set("70,59,5", "minecraft:air"); slot[0] = { typeId: "minecraft:dirt", amount: 8 };
bot.location = { x: 70.5, y: 64, z: 5.5 }; mem.compito = null; mem.rifugio = null;
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
for (let i = 0; i < 6 && mem.compito; i++) { system.currentTick += 5; eseguiCompito(bot); }
assert.equal(bot.location.y, 61, "sopra una grotta doveva fermarsi a 3: " + JSON.stringify(bot.location));
assert.equal(tipo({ x: 70, y: 63, z: 5 }), "minecraft:dirt"); assert.equal(tipo({ x: 70, y: 64, z: 5 }), "minecraft:dirt");
console.log("test v2.8.66 ok");
