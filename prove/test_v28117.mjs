import assert from "node:assert/strict";
import { riparoNotturno } from "./scripts/azioni.js";
// 2.8.117 — 14/11: con la corazza di ferro (e vicino alla casetta) di notte restava all'aperto al punto "casa": 3 morti per
// frecce di scheletro in un pomeriggio. Ora di notte, da solo, si ripara sempre; fuori solo con un giocatore vero online.
const bot = { getComponent: () => ({ getEquipment: (s) => (s === "Chest" ? { typeId: "minecraft:iron_chestplate" } : undefined) }) };
globalThis.__giocatori = [];
assert.equal(riparoNotturno(bot), true, "da solo con la corazza di ferro deve ripararsi");
globalThis.__giocatori = [{ name: "sparda991" }];
assert.equal(riparoNotturno(bot), false, "con sparda991 online resta fuori a difenderlo");
globalThis.__giocatori = [];
console.log("test v2.8.117 ok");
