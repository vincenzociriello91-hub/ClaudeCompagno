import assert from "node:assert/strict";
import { maestro, aggiornaNotti, registraKo } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 14/11: Vincenzo vuole vedere nel pannello la percentuale verso maestro con i 3 criteri
// (notti di fila senza morire, basi solide, errori che non si ripetono), calcolata dal bot e non a mano.
const oggetti = [];
const bot = { getComponent: (n) => n === "minecraft:inventory"
  ? { container: { size: oggetti.length, getItem: (i) => oggetti[i] } }
  : { getEquipment: (s) => (s === "Chest" ? { typeId: "minecraft:iron_chestplate" } : undefined) } };
Object.assign(mem, { nottiFila: 0, eraNotte: false, koLog: [], esperienza: { tana: { ok: 2, ko: 0 } } });

// notti: conta il passaggio notte -> giorno
aggiornaNotti(6000); aggiornaNotti(18000); aggiornaNotti(1000);
assert.equal(mem.nottiFila, 1, "una notte passata deve contare 1");
aggiornaNotti(2000);
assert.equal(mem.nottiFila, 1, "il giorno da solo non conta");

// basi: corazza indossata + tana riuscita; niente cibo né attrezzi di ferro
let m = maestro(bot);
assert.deepEqual(m.basi, { cibo: false, riparo: true, attrezzi: false, corazza: true });
assert.equal(m.pBasi, 50);
oggetti.push({ typeId: "minecraft:iron_pickaxe", amount: 1 }, { typeId: "minecraft:stone_sword", amount: 1 }, { typeId: "minecraft:bread", amount: 5 });
m = maestro(bot);
assert.equal(m.basi.attrezzi, false, "spada di pietra non basta");
assert.equal(m.basi.cibo, true);

// errori: lo stesso errore (con coordinate diverse) 2 volte in 2 ore = ripetuto
assert.equal(m.pErrori, 100);
registraKo("legna", "sotto c'era il vuoto (grotta) a 64,84,204");
registraKo("legna", "sotto c'era il vuoto (grotta) a 70,80,-210");
m = maestro(bot);
assert.deepEqual(m.ripetuti, ["legna: sotto c'era il vuoto (grotta) (2 volte)"], "coordinate diverse = stesso errore, senza numeri");
assert.equal(m.pErrori, 50);
mem.koLog[0].t = mem.koLog[1].t = Date.now() - 3 * 3600000;
assert.equal(maestro(bot).pErrori, 100, "errori di più di 2 ore fa non contano");

// totale = media dei 3 criteri
m = maestro(bot);
assert.equal(m.totale, Math.round((10 + 75 + 100) / 3));
console.log("test maestro ok");
