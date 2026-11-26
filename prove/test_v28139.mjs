import assert from "node:assert/strict";
import { mem } from "./scripts/memoria.js";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
// 2.8.139 — 26/11 19:19:05 UTC: bozzolo "chiuso a 148,17,228" col bot fuori centro (x ~148.9): la parete a x 149 è finita
// dentro il suo corpo (largo 0,6) e ha soffocato 3 volte in 0,14 s, vita 20 -> 15. Prima di murarsi si mette al centro.
const mondo = new Map();
const k = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
const blocco = (p) => { const t = mondo.get(k(p)) ?? "minecraft:air";
  return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, setType: (id) => mondo.set(k(p), id) }; };
const slots = Array(36).fill(null); slots[0] = { typeId: "minecraft:cobblestone", amount: 10 };
const c = { size: 36, getItem: (i) => slots[i] ?? undefined, setItem: (i, v) => { slots[i] = v ?? null; }, swapItems() {} };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getBlock: blocco, getEntities: () => [] };
const bot = { id: "bot", location: { x: 148.9, y: 17, z: 228.5 }, dimension: dim, getComponent: (n) => n === "minecraft:inventory" ? { container: c } : undefined,
  stopMoving() {}, teleport(p) { this.location = { ...p }; } };
assegna({ tipo: "bozzolo", routine: "notte_sicura" }, "test");
for (let i = 0; i < 5 && mem.compito; i++) eseguiCompito(bot);
assert.equal(mem.compito, null, "bozzolo non finito");
assert.equal(mondo.get("149,17,228"), "minecraft:cobblestone", "parete est piazzata");
assert.ok(Math.abs(bot.location.x - 148.5) < 0.01 && Math.abs(bot.location.z - 228.5) < 0.01, `bot al centro della cella, non a ${bot.location.x}`);
console.log("test v2.8.139 ok");
