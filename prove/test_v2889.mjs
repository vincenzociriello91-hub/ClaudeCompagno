import assert from "node:assert/strict";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem, sessione } from "./scripts/memoria.js";
// 2.8.89 — 11/11: la fattoria tornava con "raccolti 0, piantati 0" senza dire perché. Ora una visita a vuoto scrive cosa
// c'era nelle celle (acerbi, irraggiungibili, terreno non coltivabile), per poterla correggere.
const slots = Array(36).fill(undefined);
const container = { size: 36, getItem: (i) => slots[i], setItem: (i, v) => { slots[i] = v; }, addItem() {} };
const blocco = (p) => (p.y === 63 ? { typeId: "minecraft:water", isAir: false } : { typeId: "minecraft:air", isAir: true });
const bot = { id: "bot", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, stopMoving() {},
  dimension: { id: "minecraft:overworld", getBlock: blocco, getEntities: () => [] }, getComponent: () => ({ container, getEquipment: () => undefined }) };
mem.modalita = "autonomo"; mem.esperienza = {}; mem.coda = []; mem.luoghi = { fattoria: { x: 10, y: 63, z: 10 } }; mem.protetti = {};
assegna({ tipo: "fattoria", routine: "compito:fattoria" }, "piano");
mem.compito.stato = { celle: [{ x: 10, y: 63, z: 10 }], i: 0, raccolti: 0, piantati: 0, acqua: true };
for (let k = 0; k < 6 && mem.compito; k++) { if (mem.compito.stato) mem.compito.stato.pausa = 0; eseguiCompito(bot); }
const fine = sessione.operazioni.find((o) => /Compito fattoria completato/.test(o)) ?? "";
assert.ok(/celle: water\/air x1/.test(fine), "la visita a vuoto non dice cosa c'era nelle celle: " + fine);
console.log("test v2.8.89 ok");
