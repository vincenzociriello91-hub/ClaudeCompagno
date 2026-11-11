import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem, sessione } from "./scripts/memoria.js";
import { proteggi } from "./scripts/memoria.js";
// 2.8.94 — 11/11 18:13: "fattoria: raccolti 0, piantati 0 (... celle: cobblestone/leaf_litter x3, dirt/dirt x4, crafting_table/air
// ...)": le tane scavate nel campo lo avevano riempito di ciottoli (protetti, perché piazzati dal bot) e terra. Ora la cella
// si sgombra, sotto torna terra, poi si ara e si semina.
const mondo = new Map([["10,63,10", "minecraft:cobblestone"], ["10,64,10", "minecraft:leaf_litter"]]);
const blocco = (p) => { const k = `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`; const t = mondo.get(k) ?? (p.y <= 62 ? "minecraft:dirt" : "minecraft:air");
  return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) }, setType(n) { mondo.set(k, n); } }; };
const it = (id, n) => ({ typeId: id, amount: n, getComponent: () => undefined });
const slots = Array(36).fill(undefined); slots[0] = it("minecraft:dirt", 5); slots[1] = it("minecraft:wheat_seeds", 3); slots[2] = it("minecraft:iron_pickaxe", 1);
const container = { size: 36, getItem: (i) => slots[i], setItem: (i, v) => { slots[i] = v && v.amount > 0 ? v : undefined; }, addItem() {} };
const dim = { id: "minecraft:overworld", getBlock: blocco, getEntities: () => [],
  runCommand: (c) => { const m = c.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) mondo.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); } };
const bot = { id: "bot", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, stopMoving() {}, lookAtBlock() {}, attack() {}, selectedSlotIndex: 0,
  dimension: dim, getComponent: () => ({ container, getEquipment: () => undefined }) };
proteggi(dim, { x: 10, y: 63, z: 10 }); // tetto di una tana: piazzato e protetto dal bot
mem.modalita = "autonomo"; mem.esperienza = {}; mem.coda = []; mem.luoghi = { fattoria: { x: 10, y: 63, z: 10 } };
assegna({ tipo: "fattoria", routine: "compito:fattoria" }, "piano");
mem.compito.stato = { celle: [{ x: 10, y: 63, z: 10 }], i: 0, raccolti: 0, piantati: 0, acqua: true };
system.currentTick = 100;
for (let k = 0; k < 8 && mem.compito; k++) { if (mem.compito.stato) mem.compito.stato.pausa = 0; system.currentTick += 4; eseguiCompito(bot); }
assert.equal(mondo.get("10,63,10"), "minecraft:farmland", "il campo non è stato rimesso a posto: " + mondo.get("10,63,10"));
assert.equal(mondo.get("10,64,10"), "minecraft:wheat", "non ha seminato: " + mondo.get("10,64,10"));
assert.ok(sessione.operazioni.some((o) => /celle sistemate 2/.test(o)), sessione.operazioni.at(-1));
console.log("test v2.8.94 ok");
