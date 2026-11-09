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
const metti = (i, id, n) => { slots[i] = { typeId: id, amount: n, maxAmount: 64, getComponent: () => undefined }; };
metti(0, "minecraft:stone_pickaxe", 1); metti(1, "minecraft:crafting_table", 1); metti(2, "minecraft:oak_planks", 3); metti(3, "minecraft:stick", 2);
const c = { size: 36, getItem: (i) => slots[i] ?? undefined, setItem: (i, v) => { slots[i] = v ?? null; }, swapItems() {},
  addItem: (st) => { const i = slots.findIndex((s) => s && s.typeId === st.typeId); if (i >= 0) slots[i].amount += st.amount; else slots[slots.indexOf(null)] = st; } };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getBlock: blocco, getEntities: () => [], getPlayers: () => [],
  setBlockType: (p, id) => mondo.set(k(p), id),
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) (\S+)/); if (m) mondo.set(`${m[1]},${m[2]},${m[3]}`, m[4].includes(":") ? m[4] : "minecraft:" + m[4]); } };
const bot = { location: { x: 0.5, y: 50, z: 0.5 }, dimension: dim, selectedSlotIndex: 0, getComponent: (n) => n === "minecraft:inventory" ? { container: c } : undefined,
  lookAtBlock() {}, attack() {}, stopMoving() {}, jump() {}, teleport(p) { this.location = { ...p }; },
  navigateToLocation(p) { this.location = { ...p }; return { isFullPath: true }; }, moveToLocation(p) { this.location = { ...p }; } };
// 1) banco in tasca, in galleria: deve scavare una nicchia, piazzarlo e craftare
assegna({ tipo: "crafta", oggetto: "wooden_pickaxe" }, "test");
for (let i = 0; i < 200 && mem.compito; i++) eseguiCompito(bot);
console.log(mem.eventi.slice(-4).map((e) => e.testo).join("\n"));
assert.equal(contaOggetti(bot, "minecraft:wooden_pickaxe"), 1, "non ha craftato in galleria");
// 2) routine con primo passo impossibile: i passi successivi vanno scartati e la routine messa in pausa
mem.coda = [];
assegna({ tipo: "routine", nome: "attrezzi_ferro" }, "piano");
eseguiCompito(bot);
assert.equal(mem.coda.length, 5);
assegna(mem.coda.shift(), "piano");
for (let i = 0; i < 3000 && mem.compito; i++) eseguiCompito(bot);
assert.equal(mem.compito, null);
assert.equal(mem.coda.length, 0, "passi rimasti: " + JSON.stringify(mem.coda));
assert.ok(routineKo.has("attrezzi_ferro"));
console.log("test v2.3.0 ok");
