import assert from "node:assert/strict";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.86 — l'11/11 la fattoria dava "raccolti 0" quasi a ogni visita: il grano piantato non era ancora maturo, e il bot
// teneva in tasca ossa di scheletro inutilizzate. Ora con la farina d'ossa fa crescere subito il grano e lo raccoglie.
const slots = Array(36).fill(undefined);
slots[0] = { typeId: "minecraft:bone_meal", amount: 3 };
const container = { size: 36, getItem: (i) => slots[i], setItem: (i, v) => { slots[i] = v; }, addItem(it) { const i = slots.findIndex((x) => !x); slots[i] = it; } };
const perm = (g) => ({ getState: (k) => (k === "growth" ? g : undefined), withState: (k, v) => perm(v), g });
const grano = { typeId: "minecraft:wheat", isAir: false, permutation: perm(2), setPermutation(p) { this.permutation = p; } };
const blocco = (p) => (p.x === 10 && p.y === 64 && p.z === 10 ? grano : p.y === 63 ? { typeId: "minecraft:farmland", isAir: false } : { typeId: "minecraft:air", isAir: true });
const bot = { id: "bot", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, stopMoving() {},
  dimension: { id: "minecraft:overworld", getBlock: blocco, getEntities: () => [] }, getComponent: () => ({ container, getEquipment: () => undefined }) };
mem.modalita = "autonomo"; mem.esperienza = {}; mem.coda = []; mem.luoghi = { fattoria: { x: 10, y: 63, z: 10 } }; mem.protetti = {};
assegna({ tipo: "fattoria", routine: "compito:fattoria" }, "piano");
mem.compito.stato = { celle: [{ x: 10, y: 63, z: 10 }], i: 0, raccolti: 0, piantati: 0, acqua: true };
eseguiCompito(bot);
assert.ok(grano.permutation.g >= 4, "il grano non è cresciuto con la farina d'ossa: crescita " + grano.permutation.g);
assert.equal(slots[0]?.amount, 2, "farina d'ossa non consumata");
assert.equal(mem.compito?.stato?.i, 0, "doveva restare sullo stesso posto per raccoglierlo");
console.log("test v2.8.86 ok");
