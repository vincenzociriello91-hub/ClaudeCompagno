import assert from "node:assert/strict";
import { SimulatedPlayer } from "@minecraft/server-gametest";
import { togliFantasmi } from "./scripts/azioni.js";
// 10/11: a ogni reload il vecchio bot restava nel mondo ("Claude", "Claude(2)" ... "Claude(6)") perché si toglieva solo chi si
// chiamava esattamente "Claude". Prima di far nascere il bot nuovo vanno tolti tutti, e mai un giocatore vero.
const usciti = [], comandi = [];
const simulato = (name) => Object.assign(new SimulatedPlayer(), { name, disconnect() { usciti.push(name); } });
const vero = { name: "sparda991", disconnect() { usciti.push("sparda991"); } };
const senzaMetodo = { name: "Claude(4)" }; // un vecchio bot che non risponde più come giocatore simulato: si usa il comando
globalThis.__giocatori = [simulato("Claude"), simulato("Claude(2)"), simulato("Claude(3)"), senzaMetodo, vero];
const dim = { runCommand: (c) => comandi.push(c) };
assert.equal(togliFantasmi("Claude", dim), 4);
assert.deepEqual(usciti, ["Claude", "Claude(2)", "Claude(3)"], "non ha tolto tutti i vecchi bot (o ha toccato un giocatore vero)");
assert.deepEqual(comandi, ['kick "Claude(4)"']);
globalThis.__giocatori = [vero, { name: "Claudette" }, { name: "Claude(x)" }];
assert.equal(togliFantasmi("Claude", dim), 0, "ha tolto qualcuno che non è il bot");
globalThis.__giocatori = [];
console.log("test v2.8.78 ok");
