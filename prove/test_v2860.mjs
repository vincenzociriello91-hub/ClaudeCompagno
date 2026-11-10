import assert from "node:assert/strict";
import { system } from "@minecraft/server";
import { riordinaInventario, eseguiCompito, assegna, vaiVerso } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
const it = (id, n = 1) => ({ typeId: `minecraft:${id}`, amount: n });
const zaino = (lista) => { const slot = Array(36).fill(undefined); lista.forEach((x, i) => { slot[i] = x; });
  return { slot, container: { size: 36, getItem: (i) => slot[i], setItem: (i, x) => { slot[i] = x && x.amount > 0 ? x : undefined; }, addItem() {} } }; };
const botCon = (z) => ({ isValid: true, location: { x: 0.5, y: 64, z: 0.5 }, getComponent: (c) => (c === "minecraft:inventory" ? { container: z.container } : { getEquipment: () => undefined }),
  stopMoving() {}, jump() {}, navigateToLocation: () => ({ isFullPath: true }), moveToLocation() {} });
const conta = (z, id) => z.slot.filter((x) => x?.typeId === `minecraft:${id}`).reduce((n, x) => n + x.amount, 0);
const liberi = (z) => z.slot.filter((x) => !x).length;

// 1) inventario pieno come il 10/11: 7 archi, ghiaia, ossa, frecce e cianfrusaglie
const pieno = [...Array(7).fill(0).map(() => it("bow")), it("gravel", 39), it("bone", 57), it("arrow", 64), it("dirt", 64), it("raw_copper", 64), it("raw_copper", 3),
  it("nautilus_shell", 3), it("lead", 2), it("sugar"), it("gunpowder", 3), it("feather", 3), it("iron_ingot", 4), it("coal", 55), it("sand", 31), it("trident"), it("copper_pickaxe")];
while (pieno.length < 36) pieno.push(it(`oggetto_utile_${pieno.length}`));
const z1 = zaino(pieno);
riordinaInventario(botCon(z1));
assert.equal(conta(z1, "bow"), 1, "archi doppi non buttati");
assert.equal(conta(z1, "gravel"), 16); assert.equal(conta(z1, "bone"), 16);
assert.ok(liberi(z1) >= 4, "meno di 4 posti liberi: " + liberi(z1));
assert.equal(conta(z1, "iron_ingot"), 4); assert.equal(conta(z1, "raw_copper"), 67); assert.equal(conta(z1, "dirt"), 64); assert.equal(conta(z1, "trident"), 1);
// con posto libero le cianfrusaglie restano
const z2 = zaino([it("nautilus_shell", 3), it("feather", 3)]);
riordinaInventario(botCon(z2));
assert.equal(conta(z2, "nautilus_shell"), 3, "buttate cose con l'inventario mezzo vuoto");

// 2) routine vetro con la sabbia già in tasca: niente "raccogli sand"
system.currentTick = 100; mem.coda = []; mem.compito = null; mem.modalita = "autonomo"; mem.esperienza = {}; mem.luoghi = {};
assegna({ tipo: "routine", nome: "vetro" }, "test");
eseguiCompito(botCon(zaino([it("sand", 31)])));
assert.deepEqual(mem.coda.map((p) => p.tipo), ["fondi"], "passo di raccolta non saltato");
mem.coda = []; mem.compito = null;
assegna({ tipo: "routine", nome: "vetro" }, "test");
eseguiCompito(botCon(zaino([it("sand", 5)])));
assert.deepEqual(mem.coda.map((p) => p.tipo), ["raccogli", "fondi"], "con poca sabbia la raccolta serve");
mem.coda = []; mem.compito = null;

// 3) vaiVerso: "bloccato" una volta sola, poi riparte da zero
const fermo = botCon(zaino([]));
let blocchi = 0;
for (let i = 0; i < 400; i++) { system.currentTick += 4; if (vaiVerso(fermo, { x: 50, y: 64, z: 50 }, 2) === "bloccato") blocchi++; }
assert.ok(blocchi >= 1 && blocchi <= 5, `avvisi di blocco in 80 secondi: ${blocchi} (prima erano uno ogni 4 tick)`);
console.log("test v2.8.60 ok");
