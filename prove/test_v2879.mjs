import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi, nelRiparo, rientraNelRiparo } from "./scripts/azioni.js";
import { mem, sessione } from "./scripts/memoria.js";
// 2.8.79 — 10/11 18:35-19:03: 28 minuti di "Scappo dal creeper" a vita 20/20. Il bot non si allontanava, il creeper restava
// entro 16 blocchi, e finché difendi rispondeva "in lotta" nessun compito veniva eseguito: nemmeno la tana della notte.
const creeper = { isValid: true, id: "c1", typeId: "minecraft:creeper", location: { x: 16.5, y: 64, z: 10.5 }, applyDamage() {} };
const base = { id: "bot", name: "Claude", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, isSneaking: false,
  dimension: { id: "minecraft:overworld", getEntities: () => [creeper], getBlock: () => ({ isAir: true, typeId: "minecraft:air" }) },
  getComponent: (n) => (/health/.test(n) ? { currentValue: 20 } : { container: { size: 0, getItem() {} }, getEquipment() {} }),
  moveToLocation() {}, teleport(p) { Object.assign(this.location, p); } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
mem.protettoFino = 0; mem.rifugio = null; mem.compito = null; mem.coda = [{ tipo: "raccogli" }]; mem.modalita = "autonomo"; mem.emergenzaT = 0;
system.currentTick = 20000;
// 1) creeper fermo a 6 blocchi e bot che non riesce ad allontanarsi: entro 15 secondi smette di scappare e chiede la tana
let fine = -1;
for (let i = 0; i < 30 && fine < 0; i++) { system.currentTick += 10; if (difendi(bot) === false) fine = i; }
assert.ok(fine >= 0, "dopo 15 secondi sta ancora scappando");
assert.equal(mem.compito?.tipo, "tana", "debole con il creeper vicino: doveva chiudersi in una tana");
assert.equal(mem.compito.emergenza, true);
assert.equal(mem.coda.length, 0);
// 2) con la tana da scavare non combatte e non scappa: il compito deve poter andare avanti
for (let i = 0; i < 10; i++) { system.currentTick += 10; assert.equal(difendi(bot), false, "tana in corso: non deve restare in lotta"); }
// 3) uscito dalla tana, quel creeper a 6 blocchi non lo blocca più; a 3 blocchi sì
mem.compito = null;
for (let i = 0; i < 10; i++) { system.currentTick += 10; assert.equal(difendi(bot), false, "creeper fermo a 6 blocchi: deve lavorare"); }
assert.equal(sessione.operazioni.filter((o) => /Attacco creeper/.test(o)).length, 1, "non deve ricominciare ogni volta");
creeper.location = { x: 13.5, y: 64, z: 10.5 }; system.currentTick += 10;
assert.equal(difendi(bot), true, "creeper a 3 blocchi non visto");
// 4) "al riparo" vuol dire dentro: sul tetto (4 blocchi sopra) no
mem.compito = null; mem.rifugio = { x: 10, y: 60, z: 10, ok: true };
assert.equal(nelRiparo(bot), false, "sul tetto della tana non è al riparo");
assert.equal(rientraNelRiparo(bot, bot.location, "Ero fuori dal riparo: rientro"), true);
assert.equal(nelRiparo(bot), true);
assert.ok(/Ero fuori dal riparo: rientro: 30 secondi/.test(sessione.operazioni.at(-1)));
// buca riempita: non ci si teletrasporta dentro un blocco
bot.location.y = 64; base.dimension.getBlock = () => ({ isAir: false, typeId: "minecraft:gravel" });
assert.equal(rientraNelRiparo(bot, bot.location), false);
assert.equal(bot.location.y, 64);
console.log("test v2.8.79 ok");
