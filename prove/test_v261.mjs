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
import { autodiagnosi } from "./scripts/diagnosi.js";
import { rapporto, sessione } from "./scripts/memoria.js";
for (let i = 0; i < 36; i++) slots[i] = null;
metti(0, "minecraft:stone_pickaxe", 1); metti(1, "minecraft:oak_planks", 5);
mondo.clear(); for (let x = -5; x <= 5; x++) for (let z = -5; z <= 5; z++) { mondo.set(`${x},63,${z}`, "minecraft:grass_block"); mondo.set(`${x},64,${z}`, "minecraft:air"); }
bot.location = { x: 0.5, y: 64, z: 0.5 };
dim.getTopmostBlock = (q) => blocco({ x: q.x, y: 63, z: q.z }); dim.getLightLevel = () => 12;
bot.isSneaking = false; bot.interactWithEntity = () => true; bot.navigateToLocation = () => ({ isFullPath: true });
bot.getComponent = (n) => n === "minecraft:inventory" ? { container: c } : n === "minecraft:equippable" ? { getEquipment: () => undefined } : undefined;
globalThis.__giocatori = [bot];
const esiti = autodiagnosi(bot);
console.log(esiti.map((e) => `${e[1] ? "OK" : "KO"} ${e[0]} ${e[2]}`).join("\n"));
assert.ok(esiti.every((e) => e[1]), "qualche KO nel mondo finto");
assert.equal(contaOggetti(bot, "minecraft:oak_planks"), 5, "non deve consumare le assi del bot");
assert.equal(contaOggetti(bot, "minecraft:stick"), 0); assert.equal(contaOggetti(bot, "minecraft:dirt"), 0);
assert.ok(rapporto("test", {}).includes("== AUTODIAGNOSI"));
console.log("test v2.6.1 ok");
