import assert from "node:assert/strict";
import { mem } from "./scripts/memoria.js";
import { eseguiCompito, assegna, contaOggetti, routineKo } from "./scripts/azioni.js";
// galleria 1x2 chiusa a y=50: tutto pietra tranne le due celle del bot
const mondo = new Map([["0,50,0", "minecraft:air"], ["0,51,0", "minecraft:air"]]);
const k = (p) => `${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
const tipo = (p) => mondo.get(k(p)) ?? (Math.floor(p.y) < 64 ? "minecraft:stone" : "minecraft:air");
const blocco = (p) => { const t = tipo(p); const loc = { x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) };
  const b = { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: loc, setType(id) { mondo.set(k(loc), typeof id === "string" ? id : id.id); } };
  for (const [n, d] of Object.entries({ above: [0,1,0], below: [0,-1,0], north: [0,0,-1], south: [0,0,1], east: [1,0,0], west: [-1,0,0] })) b[n] = () => blocco({ x: loc.x + d[0], y: loc.y + d[1], z: loc.z + d[2] });
  return b; };
const slots = Array(36).fill(null);
const metti = (i, id, n) => { slots[i] = { typeId: id, amount: n, maxAmount: 64, getComponent: () => undefined }; };
metti(0, "minecraft:stone_pickaxe", 1); metti(1, "minecraft:crafting_table", 1); metti(2, "minecraft:oak_planks", 3); metti(3, "minecraft:stick", 2);
const c = { size: 36, getItem: (i) => slots[i] ?? undefined, setItem: (i, v) => { slots[i] = v ?? null; }, swapItems() {},
  addItem: (st) => { const i = slots.findIndex((s) => s && s.typeId === st.typeId); if (i >= 0) slots[i].amount += st.amount; else slots[slots.indexOf(null)] = st; } };
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getBlock: blocco, getEntities: () => [], getPlayers: () => [],
  setBlockType: (p, id) => mondo.set(k(p), id),
  runCommand: (cmd) => { const m = cmd.match(/setblock (-?\d+) (-?\d+) (-?\d+) (\S+)/); if (m) mondo.set(`${m[1]},${m[2]},${m[3]}`, m[4].includes(":") ? m[4] : "minecraft:" + m[4]); } };
const bot = { location: { x: 0.5, y: 50, z: 0.5 }, dimension: dim, selectedSlotIndex: 0, getComponent: (n) => n === "minecraft:inventory" ? { container: c } : undefined,
  lookAtBlock() {}, attack() {}, stopMoving() {}, jump() {}, teleport(p) { this.location = { ...p }; },
  navigateToLocation(p) { this.location = { ...p }; return { isFullPath: true }; }, moveToLocation(p) { this.location = { ...p }; } };
import { rapporto } from "./scripts/memoria.js";
const svuota = () => { for (let i = 0; i < 36; i++) slots[i] = null; };
const giro = (n = 400) => { for (let i = 0; i < n && mem.compito; i++) eseguiCompito(bot); };
// 1) fondi senza minerale: prima raccogli, poi riprova il fondi
mem.coda = []; svuota(); metti(0, "minecraft:stone_pickaxe", 1);
assegna({ tipo: "fondi", oggetto: "raw_iron", quantita: 3 }, "test"); eseguiCompito(bot);
assert.deepEqual(mem.coda.map((x) => x.tipo), ["raccogli", "fondi"], JSON.stringify(mem.coda));
assert.equal(mem.coda[0].blocco, "iron_ore"); assert.equal(mem.coda[1].prereq, 1);
// 2) crafta senza lingotti: prima fondi
mem.coda = []; svuota(); metti(0, "minecraft:stone_pickaxe", 1); metti(1, "minecraft:stick", 2); metti(2, "minecraft:crafting_table", 1);
assegna({ tipo: "crafta", oggetto: "iron_pickaxe" }, "test"); giro(50);
assert.equal(mem.coda[0]?.tipo, "fondi", JSON.stringify(mem.coda)); assert.equal(mem.coda[0].quantita, 3); assert.equal(mem.coda[1].tipo, "crafta");
// 3) miniera a rami da y 64 per il ferro
mem.coda = []; svuota(); metti(0, "minecraft:iron_pickaxe", 1); bot.location = { x: 0.5, y: 64, z: 0.5 }; mem.luoghi.casa = { x: 5, y: 64, z: 5 };
assegna({ tipo: "miniera_rami", minerale: "ferro", direzione: "est" }, "test"); eseguiCompito(bot);
assert.equal(mem.coda.length, 18); assert.equal(mem.coda[0].tipo, "miniera_scala"); assert.equal(mem.coda[0].profondita, 48);
assert.equal(mem.coda[2].direzione, "nord"); assert.equal(mem.coda[17].tipo, "vai"); assert.ok(mem.coda.every((x) => x.routine === "miniera_ferro"));
// 4) mappa delle risorse: senza ferro vicino va dove l'aveva visto
mem.coda = []; mem.risorse = { iron_ore: [{ x: 60, y: 30, z: 0 }] }; bot.location = { x: 0.5, y: 64, z: 0.5 };
assegna({ tipo: "raccogli", blocco: "iron_ore", quantita: 1 }, "test"); for (let i = 0; i < 5; i++) eseguiCompito(bot);
assert.ok(mem.eventi.some((e) => e.testo.startsWith("Vado a iron_ore")), "non è andato verso la risorsa nota");
mem.compito = null;
// 5) tunnel sopra una grotta: fa il pavimento
mem.coda = []; svuota(); metti(0, "minecraft:stone_pickaxe", 1); metti(1, "minecraft:cobblestone", 10);
mondo.clear(); mondo.set("0,40,0", "minecraft:air"); mondo.set("0,41,0", "minecraft:air");
mondo.set("3,39,0", "minecraft:air"); mondo.set("3,38,0", "minecraft:air"); // vuoto sotto il terzo passo
bot.location = { x: 0.5, y: 40, z: 0.5 };
assegna({ tipo: "tunnel", direzione: "est", lunghezza: 5 }, "test"); giro(2000);
assert.equal(tipo({ x: 3, y: 39, z: 0 }), "minecraft:cobblestone", "nessun pavimento sulla grotta");
assert.equal(mem.esperienza.tunnel.ok >= 1, true);
// 6) rapporto con le nuove sezioni
mem.statRoutine = { cibo: { ok: 1, ko: 2, zone: {} } }; mem.voti = { bravo: 1, sbagliato: 0 };
const testo = rapporto("test", {});
assert.ok(testo.includes("cibo 1/2") && testo.includes("1 bravo") && testo.includes("Mappa delle risorse"));
console.log("test v2.4.0 ok");
