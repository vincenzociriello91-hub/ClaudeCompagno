import assert from "node:assert/strict";
import { fabbrica, contaOggetti } from "./scripts/azioni.js";
// 10/11 12:18-12:26: per una cassa (8 assi) il bot ha fatto e piazzato 3 banchi in 3 posti diversi (12 assi buttate),
// ogni volta con un solo tronco in tasca, e alla fine "servono assi per le casse". Con legna che non basta per
// banco + oggetto non deve consumare niente; con 3 tronchi fa banco e cassa.
const blocchi = new Map();
const mondo = (tronchi) => {
  blocchi.clear();
  const slots = Array(36).fill(null); slots[0] = { typeId: "minecraft:oak_log", amount: tronchi, maxAmount: 64 };
  const c = { size: 36, getItem: (i) => slots[i] ?? undefined, setItem: (i, v) => { slots[i] = v && v.amount > 0 ? v : null; },
    addItem: (st) => { const i = slots.findIndex((s) => s && s.typeId === st.typeId); if (i >= 0) slots[i].amount += st.amount; else slots[slots.indexOf(null)] = st; } };
  const tipo = (p) => blocchi.get(`${p.x},${p.y},${p.z}`) ?? (p.y <= 63 ? "minecraft:dirt" : "minecraft:air");
  const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => [], runCommand() {},
    getBlock: (p) => { const t = tipo(p); return { typeId: t, isAir: t === "minecraft:air", isLiquid: false, location: p, setType: (id) => blocchi.set(`${p.x},${p.y},${p.z}`, id) }; } };
  return { id: "bot", getComponent: (n) => n === "minecraft:equippable" ? { getEquipment: () => undefined, setEquipment: () => true } : { container: c },
    location: { x: 0.5, y: 64, z: 0.5 }, dimension: dim, lookAtBlock() {}, attack() {} };
};
const banchi = () => [...blocchi.values()].filter((t) => t === "minecraft:crafting_table").length;
let bot = mondo(1);
let [ok, msg] = fabbrica(bot, "chest");
assert.equal(ok, false);
assert.equal(msg, "serve un banco da lavoro");
assert.equal(banchi(), 0, "ha piazzato un banco senza avere la legna per la cassa");
assert.equal(contaOggetti(bot, "#tronco"), 1, "ha consumato il tronco per niente");
bot = mondo(3);
[ok, msg] = fabbrica(bot, "chest");
assert.ok(ok, msg);
assert.equal(banchi(), 1);
assert.equal(contaOggetti(bot, "minecraft:chest"), 1);
console.log("test v2.8.69 ok");
