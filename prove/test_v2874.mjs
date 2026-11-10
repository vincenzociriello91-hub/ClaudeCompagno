import assert from "node:assert/strict";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 10/11: con corazza e gambali di rame addosso l'armatura non veniva più completata (elmo e stivali mai fatti).
// La routine fa solo i pezzi che mancano e fonde solo il rame che serve per quelli.
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:copper_ingot", amount: 3 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
let addosso = { Chest: { typeId: "minecraft:copper_chestplate" }, Legs: { typeId: "minecraft:copper_leggings" } };
const bot = { id: "bot", isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, dimension: { id: "minecraft:overworld", getBlock: () => undefined, getEntities: () => [] },
  getComponent: (n) => n === "minecraft:equippable" ? { getEquipment: (p) => addosso[p], setEquipment: () => true } : { container }, stopMoving() {} };
const avvia = () => { mem.compito = null; mem.coda = []; assegna({ tipo: "routine", nome: "armatura_rame" }, "piano"); eseguiCompito(bot); return mem.coda.map((p) => `${p.tipo}:${p.oggetto}${p.quantita ? "x" + p.quantita : ""}`); };
mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
assert.deepEqual(avvia(), ["fondi:raw_copperx6", "crafta:copper_helmet", "crafta:copper_boots"]); // 5 + 4 lingotti, 3 già in tasca
slot[0] = { typeId: "minecraft:copper_ingot", amount: 9 };
assert.deepEqual(avvia(), ["crafta:copper_helmet", "crafta:copper_boots"], "con i lingotti che bastano non deve fondere");
addosso = {}; slot[0] = undefined;
assert.deepEqual(avvia(), ["fondi:raw_copperx24", "crafta:copper_chestplate", "crafta:copper_leggings", "crafta:copper_helmet", "crafta:copper_boots"], "da nudo la routine resta intera");
console.log("test v2.8.74 ok");
