import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.113 — 13/11: armatura_ferro chiedeva 24 minerali per 4 pezzi e falliva sempre (0 su 23). Ora prima la sola corazza:
// con 2 lingotti in tasca → miniera a rami per il ferro, fonde 6, crafta la corazza.
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:iron_ingot", amount: 2 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const bot = { isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, dimension: { id: "minecraft:overworld" },
  getComponent: (c) => c === "minecraft:inventory" ? { container } : c === "minecraft:equippable" ? { getEquipment: () => undefined } : undefined };
system.currentTick = 10; mem.coda = []; mem.esperienza = {}; mem.luoghi = {}; mem.compito = null;
assegna({ tipo: "routine", nome: "armatura_ferro" }, "piano");
eseguiCompito(bot);
assert.deepEqual(mem.coda.map((p) => p.tipo + ":" + (p.oggetto ?? p.minerale)), ["miniera_rami:ferro", "fondi:raw_iron", "crafta:iron_chestplate"], JSON.stringify(mem.coda));
assert.equal(mem.coda[1].quantita, 6);
// con 8 lingotti: solo il crafta
slot[0].amount = 8; mem.coda = []; mem.compito = null;
assegna({ tipo: "routine", nome: "armatura_ferro" }, "piano"); eseguiCompito(bot);
assert.deepEqual(mem.coda.map((p) => p.tipo), ["crafta"]);
console.log("test v2.8.113 ok");
