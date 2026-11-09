import assert from "node:assert/strict";
import { guarda, inquadra } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// "guarda": il proprietario diventa spettatore dietro al bot; "smetti": torna com'era, dov'era
const tp = [];
const dim = { id: "minecraft:overworld" };
const p = { name: "sparda991", modo: "Survival", location: { x: 10, y: 64, z: 10 }, dimension: dim,
  getGameMode() { return this.modo; }, setGameMode(m) { this.modo = m; }, teleport(l, o) { tp.push({ l, o }); this.location = l; } };
globalThis.__giocatori = [p];
mem.modalita = "segui"; mem.bersaglio = "sparda991"; mem.spettatore = null;
assert.ok(guarda(p, true));
assert.equal(p.modo, "Spectator");
assert.equal(mem.modalita, "autonomo", "continuerebbe a seguire chi lo filma");
const bot = { isValid: true, location: { x: 100, y: 70, z: 100 }, dimension: dim, getViewDirection: () => ({ x: 1, y: 0, z: 0 }) };
inquadra(bot);
const ult = tp.at(-1);
assert.deepEqual([ult.l.x, ult.l.y, ult.l.z], [96, 72.5, 100], "telecamera non dietro al bot");
assert.equal(ult.o.facingLocation.x, 100);
guarda(p, true); // doppio "guarda" non perde il posto di partenza
assert.equal(mem.spettatore.x, 10);
assert.ok(guarda(p, false));
assert.equal(p.modo, "Survival");
assert.deepEqual([p.location.x, p.location.z], [10, 10], "non è tornato dov'era");
assert.equal(mem.spettatore, null);
assert.equal(guarda(p, false), false);
const prima = tp.length; inquadra(bot); assert.equal(tp.length, prima, "teletrasporta anche dopo smetti");
console.log("test v2.8.40 ok");
