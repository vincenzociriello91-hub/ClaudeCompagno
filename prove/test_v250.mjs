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
import { riordinaInventario, lezioneAuto } from "./scripts/azioni.js";
const svuota = () => { for (let i = 0; i < 36; i++) slots[i] = null; };
const giro = (n = 400) => { for (let i = 0; i < n && mem.compito; i++) eseguiCompito(bot); };
bot.getComponent = (n) => n === "minecraft:inventory" ? { container: c } : n === "minecraft:equippable" ? { getEquipment: () => undefined, setEquipment: () => true } : undefined;
// 1) modalità zero: offline, 3 fallimenti uguali nella stessa zona -> una lezione automatica, nessun avviso all'IA
mem.coda = []; mem.pos = { x: 10, y: 64, z: 10 }; svuota(); mondo.clear();
const { notifiche } = await import("./scripts/azioni.js");
for (let i = 0; i < 3; i++) { assegna({ tipo: "caccia", oggetto: "cow", quantita: 1 }, "test"); giro(5); }
assert.equal(notifiche.length, 0, "offline non deve avvisare l'IA");
assert.equal(mem.lezioniAuto?.length, 1, JSON.stringify(mem.lezioniAuto)); assert.ok(mem.lezioniAuto[0].startsWith("caccia cow fallisce"));
// 2) alberi: tagliato il tronco basso su erba -> ripianta l'alberello
svuota(); metti(0, "minecraft:stone_axe", 1); metti(1, "minecraft:birch_sapling", 2);
mondo.clear(); for (let y = 64; y < 80; y++) for (let x = -20; x <= 20; x++) for (let z = -20; z <= 20; z++) {} // aria sopra y64
mondo.set("2,63,0", "minecraft:grass_block"); mondo.set("2,64,0", "minecraft:oak_log"); bot.location = { x: 0.5, y: 64, z: 0.5 };
assegna({ tipo: "raccogli", blocco: "legna", quantita: 1 }, "test"); giro(200);
assert.equal(tipo({ x: 2, y: 64, z: 0 }), "minecraft:birch_sapling", "non ha ripiantato");
// 3) inventario: robaccia via, doppioni ridotti, attrezzi: migliore + scorta
svuota(); metti(0, "minecraft:leaf_litter", 64); metti(1, "minecraft:crafting_table", 5); metti(2, "minecraft:dirt", 64); metti(3, "minecraft:dirt", 30);
metti(4, "minecraft:iron_pickaxe", 1); metti(5, "minecraft:stone_pickaxe", 1); metti(6, "minecraft:stone_pickaxe", 1); metti(7, "minecraft:wooden_pickaxe", 1); metti(8, "minecraft:bread", 10);
riordinaInventario(bot);
assert.equal(contaOggetti(bot, "minecraft:leaf_litter"), 0); assert.equal(contaOggetti(bot, "minecraft:crafting_table"), 1); assert.equal(contaOggetti(bot, "minecraft:dirt"), 64);
assert.equal(contaOggetti(bot, (id) => id.endsWith("_pickaxe")), 2); assert.equal(contaOggetti(bot, "minecraft:iron_pickaxe"), 1); assert.equal(contaOggetti(bot, "minecraft:bread"), 10);
// 4) recupero: oggetti a terra vicino al punto di morte vengono raccolti
let raccolti = 0;
const oggetto = { getComponent: () => ({ itemStack: { amount: 5 } }), teleport() { raccolti++; } };
dim.getEntities = (q) => q.type === "minecraft:item" ? [oggetto] : [];
bot.location = { x: 0.5, y: 64, z: 0.5 };
assegna({ tipo: "recupera", x: 1, y: 64, z: 1, scadenza: 1e9 }, "test"); giro(20);
assert.equal(raccolti, 1); assert.equal(mem.compito, null);
// 5) fattoria: campo 5x5 con acqua, terra arata, semi piantati; il maturo si raccoglie
dim.getEntities = () => [];
dim.getTopmostBlock = (q) => blocco({ x: q.x, y: 63, z: q.z });
mondo.clear(); for (let x = -10; x <= 0; x++) for (let z = 0; z <= 8; z++) mondo.set(`${x},63,${z}`, "minecraft:grass_block");
mem.luoghi = { casa: { x: 0, y: 64, z: 0 } };
svuota(); metti(0, "minecraft:wheat_seeds", 30);
blocco.permutazioni = true;
assegna({ tipo: "fattoria" }, "test"); giro(600);
assert.ok(mem.luoghi.fattoria, "fattoria non creata");
assert.equal(tipo({ x: -5, y: 63, z: 3 }), "minecraft:water");
assert.equal(tipo({ x: -7, y: 63, z: 1 }), "minecraft:farmland"); assert.equal(tipo({ x: -7, y: 64, z: 1 }), "minecraft:wheat");
assert.equal(contaOggetti(bot, "minecraft:wheat_seeds"), 6);
// 6) fattoria senza semi: prima raccoglie l'erba alta
mem.luoghi = { casa: { x: 0, y: 64, z: 0 } }; mondo.clear(); svuota(); mem.coda = [];
assegna({ tipo: "fattoria" }, "test"); giro(5);
assert.equal(mem.coda[0]?.blocco, "short_grass", JSON.stringify(mem.coda)); assert.equal(mem.coda[1]?.tipo, "fattoria");
// 7) base sicura: mette in coda torce, pietra e muro intorno a casa
mem.coda = []; mem.luoghi = { casa: { x: 0, y: 64, z: 0 } }; svuota();
assegna({ tipo: "base_sicura" }, "test"); giro(3);
assert.deepEqual(mem.coda.map((x) => x.tipo), ["illumina", "raccogli", "costruisci"]); assert.equal(mem.coda[2].x, -9); assert.equal(mem.coda[2].schema, "recinto");
// 8) illumina senza torce: prima la routine torce
mem.coda = []; svuota(); assegna({ tipo: "illumina" }, "test"); giro(3);
assert.equal(mem.coda[0]?.tipo, "routine"); assert.equal(mem.coda[0]?.nome, "torce");
// 9) alleva: dà grano a due mucche adulte
mem.coda = []; svuota(); metti(0, "minecraft:wheat", 4);
const mucche = [1, 2].map((i) => ({ id: "m" + i, typeId: "minecraft:cow", isValid: true, location: { x: 1, y: 64, z: i }, getComponent: () => undefined }));
globalThis.__entita = new Map(mucche.map((m) => [m.id, m]));
dim.getEntities = (q) => q.type === "minecraft:cow" ? mucche : [];
let nutrite = 0; bot.interactWithEntity = () => { nutrite++; return true; }; bot.navigateToEntity = () => {};
bot.location = { x: 1.5, y: 64, z: 1.5 }; assegna({ tipo: "alleva" }, "test"); giro(20);
assert.equal(nutrite, 2); assert.ok(mem.ultimaRiproduzione);
console.log("test v2.5.0 ok");
