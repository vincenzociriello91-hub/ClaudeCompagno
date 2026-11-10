import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { difendi, inEmergenza, esciDalRiparo, eseguiCompito, assegna } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 10/11: morti di giorno senza armatura (zombie a vita 6 "in ritirata", creeper andando a legna). Da solo e senza corazza:
// niente inseguimenti, dai creeper scappa sempre, a metà vita si chiude in tana per 90 secondi. E la carne si cuoce tutta.
const blocchi = new Map();
const tipo = (p) => blocchi.get(`${p.x},${p.y},${p.z}`) ?? (p.y <= 63 ? "minecraft:dirt" : "minecraft:air");
let mostri = [], vita = 20, corazza, mosso = null;
const slot = Array(36).fill(undefined); slot[0] = { typeId: "minecraft:dirt", amount: 16 };
const container = { size: 36, getItem: (i) => slot[i], setItem: (i, it) => { slot[i] = it && it.amount > 0 ? it : undefined; }, addItem() {} };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: (q) => (q?.type ? [] : mostri),
  getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, setType: (id) => blocchi.set(`${p.x},${p.y},${p.z}`, id) }; },
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) air/); if (m) blocchi.set(`${m[1]},${m[2]},${m[3]}`, "minecraft:air"); },
  getTopmostBlock: (q) => ({ typeId: "minecraft:dirt", location: { x: q.x, y: 63, z: q.z } }) };
const base = { id: "bot", isValid: true, location: { x: 10.5, y: 64, z: 10.5 }, isSneaking: false, selectedSlotIndex: 0, dimension: dim,
  getComponent: (n) => /health/.test(n) ? { currentValue: vita } : /equippable/.test(n) ? { getEquipment: (p) => (p === "Chest" ? corazza : undefined), setEquipment: () => true } : { container },
  moveToLocation(p) { mosso = p; }, teleport(p) { this.location = p; } };
const bot = new Proxy(base, { get: (o, k) => (k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
const mostro = (id, t, x) => ({ isValid: true, id, typeId: `minecraft:${t}`, location: { x, y: 64, z: 10.5 }, dimension: dim, applyDamage() {} });
const giro = () => { system.currentTick += 20; return difendi(bot); };
mem.protettoFino = 0; mem.rifugio = null; mem.compito = null; mem.coda = []; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
system.currentTick = 1000;
// zombie a 6 blocchi: con la corazza lo affronta, senza lo lascia stare
mostri = [mostro("z1", "zombie", 16.5)]; corazza = { typeId: "minecraft:copper_chestplate" };
assert.equal(giro(), true, "con la corazza combatte");
const cambia = (nuovi) => { for (const m of mostri) m.isValid = false; mostri = nuovi; system.currentTick += 1000; };
cambia([mostro("z3", "zombie", 16.5)]); corazza = undefined;
assert.equal(giro(), false, "senza corazza è andato a cercare uno zombie lontano");
// creeper a 7 blocchi, vita piena, senza corazza: si allontana (non gli va addosso)
cambia([mostro("c1", "creeper", 17.5)]); mosso = null;
assert.equal(giro(), true); assert.ok(mosso && mosso.x < 10.5, "non si è allontanato dal creeper: " + JSON.stringify(mosso));
// zombie addosso con metà vita: tana d'emergenza invece di combattere
cambia([mostro("z4", "zombie", 12.5)]); vita = 9; mem.compito = { tipo: "raccogli", stato: {} }; mem.coda = [{ tipo: "crafta" }];
assert.equal(giro(), false);
assert.equal(mem.compito?.tipo, "tana", "a metà vita senza armatura non si è riparato");
assert.equal(mem.coda.length, 0, "i lavori in coda lo farebbero uscire subito");
for (let i = 0; i < 6 && mem.compito; i++) { system.currentTick += 5; eseguiCompito(bot); }
assert.ok(mem.rifugio?.ok && mem.rifugio.fino > Date.now(), "tana d'emergenza senza scadenza: " + JSON.stringify(mem.rifugio));
assert.equal(inEmergenza(bot), true);
assert.equal(esciDalRiparo(bot), false, "è uscito di giorno con i mostri ancora intorno"); assert.ok(mem.rifugio, "riparo dimenticato");
mem.rifugio.fino = Date.now() - 1;
assert.equal(inEmergenza(bot), false); assert.equal(esciDalRiparo(bot), true, "scaduta l'emergenza deve uscire");
// la routine cibo cuoce la carne che c'è: senza carne fallisce pulito, con il montone lo riconosce
mem.compito = null; mostri = []; vita = 20;
assegna({ tipo: "fondi", oggetto: "carne", quantita: 12 }, "piano"); eseguiCompito(bot);
assert.match(mem.eventi.at(-1).testo, /non ho carne da cuocere/);
slot[1] = { typeId: "minecraft:mutton", amount: 2 };
assegna({ tipo: "fondi", oggetto: "carne", quantita: 12 }, "piano"); eseguiCompito(bot);
assert.ok([mem.compito, ...mem.coda].some((x) => x?.tipo === "fondi" && x.oggetto === "mutton"), "non ha scelto il montone: " + JSON.stringify([mem.compito, mem.coda]));
console.log("test v2.8.71 ok");
