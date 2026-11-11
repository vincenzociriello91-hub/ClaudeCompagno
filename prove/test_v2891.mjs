import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem, sessione } from "./scripts/memoria.js";
// 2.8.91 — 11/11 13:10: "fattoria: raccolti 0, piantati 0 (irraggiungibili 24)": da lontano la strada per il campo in palude
// si bloccava su tutte le celle. Ora al primo blocco il bot si porta accanto al campo e continua da lì.
const slots = Array(36).fill(undefined);
const container = { size: 36, getItem: (i) => slots[i], setItem: (i, v) => { slots[i] = v; }, addItem() {} };
const blocco = (p) => (p.y <= 63 ? { typeId: "minecraft:dirt", isAir: false, isLiquid: false } : { typeId: "minecraft:air", isAir: true, isLiquid: false });
const bot = { id: "bot", isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, stopMoving() {}, jump() {}, moveToLocation() {},
  navigateToLocation: () => ({ isFullPath: false }), teleport(p) { this.location = p; },
  dimension: { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getBlock: blocco, getEntities: () => [], getTopmostBlock: (q) => ({ location: { x: q.x, y: 63, z: q.z } }) },
  getComponent: () => ({ container, getEquipment: () => undefined }) };
mem.modalita = "autonomo"; mem.esperienza = {}; mem.coda = []; mem.luoghi = { fattoria: { x: 100, y: 63, z: 100 } }; mem.protetti = {}; mem.pericoli = [];
assegna({ tipo: "fattoria", routine: "compito:fattoria" }, "piano");
mem.compito.stato = { celle: [{ x: 100, y: 63, z: 100 }, { x: 101, y: 63, z: 100 }], i: 0, raccolti: 0, piantati: 0, acqua: true };
system.currentTick = 1000;
for (let k = 0; k < 400 && !sessione.operazioni.some((o) => /mi ci porto accanto/.test(o)); k++) { system.currentTick += 4; eseguiCompito(bot); }
assert.ok(sessione.operazioni.some((o) => /Non arrivavo alla fattoria/.test(o)), "non si è portato accanto al campo");
assert.ok(Math.hypot(bot.location.x - 102, bot.location.z - 102) < 4, "non è vicino al campo: " + JSON.stringify(bot.location));
console.log("test v2.8.91 ok");
