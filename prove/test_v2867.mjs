import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 10/11 10:46 (2.8.66): "non riesco a chiudere la tana (giocatore)". Nel gioco il teletrasporto in fondo alla buca si vede
// solo dal tick dopo: il bot risultava ancora in piedi dov'era e il blocco del tetto al posto dei suoi piedi veniva rifiutato.
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:dirt", amount: 8 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const blocchi = new Map();
const tipo = (p) => blocchi.get(`${p.x},${p.y},${p.z}`) ?? (p.y <= 63 ? "minecraft:dirt" : "minecraft:air");
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 },
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, setType: (id) => blocchi.set(`${p.x},${p.y},${p.z}`, id) }; },
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) blocchi.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); },
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", location: { x: q.x, y: 63, z: q.z } }), getEntities: () => [] };
// teletrasporto come nel gioco: la posizione letta nello stesso tick resta quella vecchia
const bot = { id: "bot", isValid: true, location: { x: 70.5, y: 64, z: 5.5 }, selectedSlotIndex: 0, dimension: dim, arrivo: null,
  getComponent: (c) => c === "minecraft:inventory" ? { container } : { getEquipment: () => undefined, setEquipment: () => true },
  stopMoving() {}, lookAtBlock() {}, attack() {}, teleport(p) { this.arrivo = p; } };
globalThis.__giocatori = [bot];
system.currentTick = 10; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {}; mem.compito = null; mem.rifugio = null;
blocchi.set("70,59,5", "minecraft:air"); // grotta sotto: tana da 3, il secondo blocco del tetto va dove il bot aveva i piedi
assegna({ tipo: "tana", routine: "notte_sicura" }, "piano");
eseguiCompito(bot);
assert.ok(mem.rifugio?.ok, "tana non riuscita: " + JSON.stringify(mem.esperienza?.tana ?? mem.compito));
assert.equal(bot.arrivo?.y, 61, "non è sceso di 3");
assert.equal(tipo({ x: 70, y: 63, z: 5 }), "minecraft:dirt", "manca il blocco sopra la testa");
assert.equal(tipo({ x: 70, y: 64, z: 5 }), "minecraft:dirt", "manca il secondo blocco (dove aveva i piedi)");
globalThis.__giocatori = [];
console.log("test v2.8.67 ok");
