import assert from "node:assert/strict";
import { mem } from "./scripts/memoria.js";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { system } from "@minecraft/server";
// terreno a y=63 (erba), oceano da x>=40; percorsi sempre "bloccati": deve avanzare a tappe col salto
const mondo = new Map();
const k = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
const tipo = (p) => mondo.get(k(p)) ?? (Math.floor(p.y) < 63 ? "minecraft:stone" : Math.floor(p.y) === 63 ? (Math.floor(p.x) >= 40 ? "minecraft:water" : "minecraft:grass_block") : "minecraft:air");
const blocco = (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: t === "minecraft:water", location: { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) } }; };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getBlock: blocco, getEntities: () => [], getTopmostBlock: (q) => blocco({ x: q.x, y: 63, z: q.z }) };
const c = { size: 36, getItem: () => undefined, setItem() {} };
let salti = 0;
const bot = { location: { x: 0.5, y: 64, z: 0.5 }, dimension: dim, getComponent: (n) => n === "minecraft:inventory" ? { container: c } : undefined,
  teleport(p) { this.location = { ...p }; salti++; }, navigateToLocation() { return { isFullPath: false }; }, moveToLocation() {}, stopMoving() {}, lookAtBlock() {}, jump() {} };
assegna({ tipo: "esplora", direzione: "est", lunghezza: 100 }, "test");
for (let i = 0; i < 5000 && mem.compito; i++) { system.currentTick++; eseguiCompito(bot); }
const ev = mem.eventi.map((e) => e.testo).join("\n");
assert.ok(salti >= 2, "non si è mosso: " + ev);
assert.ok(bot.location.x > 20 && bot.location.x < 40, "posizione " + JSON.stringify(bot.location));
assert.ok(/acqua dopo 32 blocchi/.test(ev), ev);
console.log("test v2.5.1 ok");
