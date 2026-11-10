import assert from "node:assert/strict";
import { mem } from "./scripts/memoria.js";
import { eseguiCompito, assegna, routineKo, routineInPausa } from "./scripts/azioni.js";
// "Perché fa sempre gli stessi errori?" (10/11): il pilota gratis ricordava una routine fallita solo per 10 minuti e in una
// Map che si svuota a ogni aggiornamento. Ora il ricordo sta nella memoria salvata e l'attesa raddoppia a ogni fallimento.
const slots = Array(36).fill(null); slots[0] = { typeId: "minecraft:oak_planks", amount: 8, maxAmount: 64 };
const c = { size: 36, getItem: (i) => slots[i] ?? undefined, setItem: (i, v) => { slots[i] = v && v.amount > 0 ? v : null; },
  addItem: (st) => { const i = slots.findIndex((s) => s && s.typeId === st.typeId); if (i >= 0) slots[i].amount += st.amount; else slots[slots.indexOf(null)] = st; } };
const bot = { id: "bot", isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, selectedSlotIndex: 0, stopMoving() {}, lookAtBlock() {}, attack() {},
  dimension: { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getBlock: () => undefined, getEntities: () => [] },
  getComponent: (n) => n === "minecraft:equippable" ? { getEquipment: () => undefined, setEquipment: () => true } : { container: c } };
let ora = 1_000_000_000_000; const vera = Date.now; Date.now = () => ora;
const prova = (oggetto, routine = "prova_x") => { mem.compito = null; mem.coda = []; assegna({ tipo: "crafta", oggetto, routine }, "piano"); for (let i = 0; i < 20 && mem.compito; i++) eseguiCompito(bot); };
const min = (m) => { ora += m * 60000; };
mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {}; mem.routineKo = {};
assert.equal(routineInPausa("prova_x"), false);
prova("oggetto_che_non_esiste");
assert.equal(routineInPausa("prova_x"), true, "fallita ma non in pausa");
// aggiornamento del bot: la Map si svuota, la memoria salvata resta (passa da JSON come su disco)
routineKo.clear(); mem.routineKo = JSON.parse(JSON.stringify(mem.routineKo));
assert.equal(routineInPausa("prova_x"), true, "dopo un aggiornamento ha dimenticato il fallimento");
min(11); assert.equal(routineInPausa("prova_x"), false, "primo fallimento: 10 minuti");
prova("oggetto_che_non_esiste");
min(11); assert.equal(routineInPausa("prova_x"), true, "secondo fallimento di fila: 20 minuti, non 10");
min(10); assert.equal(routineInPausa("prova_x"), false);
for (let i = 0; i < 8; i++) prova("oggetto_che_non_esiste");
min(119); assert.equal(routineInPausa("prova_x"), true);
min(2); assert.equal(routineInPausa("prova_x"), false, "tetto: 2 ore");
// un successo azzera il conto
prova("stick"); assert.equal(mem.routineKo.prova_x, undefined, "il successo non ha azzerato i fallimenti");
// il riparo della notte non va mai in pausa
prova("oggetto_che_non_esiste", "notte_sicura");
assert.equal(routineInPausa("notte_sicura"), false);
Date.now = vera;
console.log("test v2.8.70 ok");
