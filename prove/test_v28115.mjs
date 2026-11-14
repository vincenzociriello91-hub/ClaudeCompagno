import assert from "node:assert/strict";
import { mem } from "./scripts/memoria.js";
import { eseguiCompito, assegna, contaOggetti, routineKo } from "./scripts/azioni.js";
// galleria 1x2 chiusa a y=50: tutto pietra tranne le due celle del bot
const mondo = new Map([["0,50,0", "minecraft:air"], ["0,51,0", "minecraft:air"]]);
const k = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
const tipo = (p) => mondo.get(k(p)) ?? (Math.floor(p.y) < 64 ? "minecraft:stone" : "minecraft:air");
const blocco = (p) => { const t = tipo(p); const loc = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
  const b = { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: loc, setType(id) { mondo.set(k(loc), typeof id === "string" ? id : id.id); } };
  for (const [n, d] of Object.entries({ above: [0,1,0], below: [0,-1,0], north: [0,0,-1], south: [0,0,1], east: [1,0,0], west: [-1,0,0] })) b[n] = () => blocco({ x: loc.x + d[0], y: loc.y + d[1], z: loc.z + d[2] });
  return b; };
const slots = Array(36).fill(null);
const metti = (i, id, n) => { slots[i] = { typeId: id, amount: n, maxAmount: 64, getComponent: () => undefined, clone() { return { ...this }; } }; };
metti(0, "minecraft:stone_pickaxe", 1); metti(1, "minecraft:crafting_table", 1); metti(2, "minecraft:oak_planks", 3); metti(3, "minecraft:stick", 2);
const c = { size: 36, getItem: (i) => slots[i] ?? undefined, setItem: (i, v) => { slots[i] = v ?? null; }, swapItems() {},
  addItem: (st) => { const i = slots.findIndex((s) => s && s.typeId === st.typeId); if (i >= 0) slots[i].amount += st.amount; else slots[slots.indexOf(null)] = st; } };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getBlock: blocco, getEntities: () => [], getPlayers: () => [],
  setBlockType: (p, id) => mondo.set(k(p), id),
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) (\S+)/); if (m) mondo.set(`${m[1]},${m[2]},${m[3]}`, m[4].includes(":") ? m[4] : "minecraft:" + m[4]); } };
const bot = { location: { x: 0.5, y: 50, z: 0.5 }, dimension: dim, selectedSlotIndex: 0, getComponent: (n) => n === "minecraft:inventory" ? { container: c } : undefined,
  lookAtBlock() {}, attack() {}, stopMoving() {}, jump() {}, teleport(p) { this.location = { ...p }; },
  navigateToLocation(p) { this.location = { ...p }; return { isFullPath: true }; }, moveToLocation(p) { this.location = { ...p }; } };
import { segnaPericolo, inPericolo, categoriaCassa } from "./scripts/azioni.js";
import { system } from "@minecraft/server";
const svuota = () => { for (let i = 0; i < 36; i++) slots[i] = null; };
const giro = (n = 400) => { for (let i = 0; i < n && mem.compito; i++) { system.currentTick++; eseguiCompito(bot); } };
// 1) zone pericolose
mem.pericoli = []; segnaPericolo({ x: 100, y: 30, z: 0 }, 12, "grotta");
// 2.8.115 — 14/11: nel bosco suolo() salta tronchi e foglie e dà la cella sopra la terra, dove però c'è il tronco:
// la cassa del deposito risultava sempre "occupato" (0 su 69). Ora toglie il blocco naturale e piazza la cassa.
mondo.clear(); for (let x = -5; x <= 40; x++) for (let z = -5; z <= 30; z++) mondo.set(`${x},63,${z}`, "minecraft:grass_block");
for (let x = -5; x <= 40; x++) for (let z = -5; z <= 30; z++) for (let y = 64; y < 70; y++) mondo.set(`${x},${y},${z}`, "minecraft:air");
for (let x = 2; x <= 6; x++) { mondo.set(`${x},64,2`, "minecraft:oak_log"); mondo.set(`${x},65,2`, "minecraft:oak_leaves"); }
const casse = new Map();
const cassaFinta = () => { const sl = Array(27).fill(null); return { size: 27, getItem: (i) => sl[i] ?? undefined, setItem: (i, v) => { sl[i] = v ?? null; }, addItem(it) { const i = sl.indexOf(null); sl[i] = it; return undefined; }, sl }; };
const vecchioBlocco = blocco;
dim.getBlock = (p) => { const b = vecchioBlocco(p); if (b.typeId === "minecraft:chest") { const k = `${b.location.x},${b.location.y},${b.location.z}`; if (!casse.has(k)) casse.set(k, cassaFinta()); b.getComponent = (n) => n === "minecraft:inventory" ? { container: casse.get(k) } : undefined; } return b; };
dim.getTopmostBlock = (q) => dim.getBlock({ x: q.x, y: 63, z: q.z });
c.transferItem = (i, dest) => { const it = slots[i]; dest.addItem(it); slots[i] = null; return undefined; };
mem.luoghi = { casa: { x: 0, y: 64, z: 0 }, deposito: { x: 0, y: 64, z: 0 } }; mem.casse = {}; mem.coda = [];
svuota(); metti(0, "minecraft:stone_pickaxe", 1); metti(1, "minecraft:chest", 5); metti(2, "minecraft:raw_iron", 7); metti(3, "minecraft:oak_log", 9); metti(4, "minecraft:cobblestone", 50); metti(5, "minecraft:string", 3);
bot.location = { x: 0.5, y: 64, z: 0.5 };
assegna({ tipo: "sistema_deposito" }, "test"); giro(400);
assert.equal(Object.keys(mem.casse).length, 5, JSON.stringify(mem.casse));
assert.equal(mem.compito, null);
console.log("test v2.8.115 ok");
