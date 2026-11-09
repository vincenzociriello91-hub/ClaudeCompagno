import assert from "node:assert/strict";
import { mem } from "./scripts/memoria.js";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
// mondo finto: tutto pietra sotto y=64, aria sopra; minerale di ferro chiuso a (5,60,0)
const mondo = new Map();
const k = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
const tipo = (p) => mondo.get(k(p)) ?? (Math.floor(p.y) < 64 ? "minecraft:stone" : "minecraft:air");
mondo.set("5,60,0", "minecraft:iron_ore");
const blocco = (p) => { const t = tipo(p); const loc = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
  const b = { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: loc };
  for (const [n, d] of Object.entries({ above: [0,1,0], below: [0,-1,0], north: [0,0,-1], south: [0,0,1], east: [1,0,0], west: [-1,0,0] })) b[n] = () => blocco({ x: loc.x + d[0], y: loc.y + d[1], z: loc.z + d[2] });
  return b; };
const slots = Array(36).fill(null); slots[0] = { typeId: "minecraft:stone_pickaxe", amount: 1, getComponent: () => undefined };
const c = { size: 36, getItem: (i) => slots[i] ?? undefined, setItem: (i, v) => { slots[i] = v ?? null; }, swapItems() {} };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getBlock: blocco, getEntities: () => [],
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); mondo.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); } };
const bot = { location: { x: 0.5, y: 64, z: 0.5 }, dimension: dim, selectedSlotIndex: 0, getComponent: (n) => n === "minecraft:inventory" ? { container: c } : undefined,
  lookAtBlock() {}, attack() {}, stopMoving() {}, jump() {}, teleport(p) { this.location = { ...p }; },
  navigateToLocation(p) { this.location = { ...p }; return { isFullPath: true }; }, moveToLocation(p) { this.location = { ...p }; } };
assegna({ tipo: "raccogli", blocco: "iron_ore", quantita: 1 }, "test");
for (let i = 0; i < 3000 && mem.compito; i++) eseguiCompito(bot);
console.log(mem.eventi.map(e=>e.testo).join("\n"));
assert.equal(mem.compito, null, "il compito non è finito: " + JSON.stringify(mem.compito?.stato));
assert.equal(tipo({ x: 5, y: 60, z: 0 }), "minecraft:air", "il ferro non è stato scavato");
assert.equal(mem.esperienza.raccogli.ok, 1);
console.log("test galleria ok, bot finito a", JSON.stringify(bot.location));
