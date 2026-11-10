import assert from "node:assert/strict";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 10/11 17:00: 6 visite di fila alla fattoria con "raccolti 0, piantati 0" (campo vuoto, niente semi): mezza giornata persa.
// Una visita a vuoto fa slittare la prossima di 10 minuti; una visita utile no.
const container = { size: 36, getItem: () => undefined, setItem() {}, addItem() {} };
const bot = { id: "bot", isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, stopMoving() {},
  dimension: { id: "minecraft:overworld", getBlock: () => undefined, getEntities: () => [] }, getComponent: () => ({ container, getEquipment: () => undefined }) };
mem.modalita = "autonomo"; mem.esperienza = {}; mem.coda = []; mem.luoghi = { fattoria: { x: 10, y: 63, z: 10 } };
const visita = (raccolti, piantati) => { mem.compito = null; assegna({ tipo: "fattoria", routine: "compito:fattoria" }, "piano");
  mem.compito.stato = { celle: [], i: 0, raccolti, piantati, acqua: true }; eseguiCompito(bot); return (mem.ultimaFattoria - Date.now()) / 60000; };
assert.ok(visita(0, 0) > 9, "visita a vuoto: la prossima doveva slittare di 10 minuti");
assert.ok(Math.abs(visita(2, 3)) < 0.1, "visita utile: niente rinvio");
console.log("test v2.8.76 ok");
