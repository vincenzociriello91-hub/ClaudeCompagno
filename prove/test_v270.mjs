import { mem, sessione, scriviBlocco, VERSIONE, adesso } from "./scripts/memoria.js";
import { world } from "@minecraft/server";
import { istantaneaInventario, descriviCompito, prestazioni, giocatoriVeri, inv } from "./scripts/azioni.js";
const CFG = { budget: 3 }; let pronto = true; const cb = [];
const ogniTick = (n, f) => cb.push(f);
world.getTimeOfDay = () => 14000;
const comp = { "minecraft:health": { currentValue: 18 }, "minecraft:player.hunger": { currentValue: 17 }, "minecraft:equippable": { getEquipment: (s) => s === "Chest" ? { typeId: "minecraft:copper_chestplate" } : undefined },
  "minecraft:inventory": { container: { size: 2, getItem: (i) => i === 0 ? { typeId: "minecraft:bread", amount: 5, getComponent: () => undefined } : undefined } } };
const bot = { isValid: true, name: "Claude", id: "b", location: { x: 1.5, y: 64, z: 2.5 }, dimension: { id: "minecraft:overworld" }, getComponent: (c) => comp[c] };
globalThis.__giocatori = [bot, { name: "sparda991", id: "p", location: { x: 5, y: 64, z: 5 }, getComponent: (c) => comp[c] }];
const vivo = () => bot?.isValid === true;
mem.coda = [{ tipo: "fondi", minerale: "iron" }]; mem.compito = { tipo: "raccogli", blocco: "legna", quantita: 2, stato: { fatti: 1 } };
mem.esperienza = { raccogli: { ok: 5, ko: 5 }, routine: { ok: 500, ko: 0 } }; mem.luoghi = { casa: {x:0,y:0,z:0} }; mem.casse = {};
const GRADO = (id) => /netherite/.test(id) ? 5 : /diamond/.test(id) ? 4 : /iron/.test(id) ? 3 : /copper|chainmail|golden/.test(id) ? 2 : /stone|leather/.test(id) ? 1.5 : /wooden/.test(id) ? 1 : 0;
function maturita() {
  if (!vivo()) return null;
  const eq = bot.getComponent("minecraft:equippable");
  const armatura = ["Head", "Chest", "Legs", "Feet"].reduce((t, s) => t + GRADO(eq?.getEquipment(s)?.typeId ?? ""), 0) / 20; // 4 pezzi di netherite = 1
  const attrezzi = ["_pickaxe", "_sword", "_axe"].reduce((t, k) => {
    let g = 0; const c = inv(bot);
    for (let i = 0; i < c.size; i++) { const it = c.getItem(i); if (it?.typeId.endsWith(k)) g = Math.max(g, GRADO(it.typeId)); }
    return t + g;
  }, 0) / 15;
  const equip = 15 * armatura + 15 * attrezzi;
  // sopravvivenza: minuti medi tra una morte e l'altra in questa sessione (60 minuti o più = pieno)
  const minSess = (Date.now() - sessione.inizio) / 60000;
  const sopr = 25 * Math.min(1, minSess / (sessione.morti.length + 1) / 60);
  // abilità: successo medio sui compiti provati almeno 5 volte (gli ingredienti mancanti non contano)
  const tassi = Object.entries(mem.esperienza).filter(([t, e]) => !/^(routine|fermo)$/.test(t) && e.ok + e.ko >= 5).map(([, e]) => e.ok / (e.ok + e.ko));
  const abil = 20 * (tassi.length ? tassi.reduce((a, b) => a + b, 0) / tassi.length : 0);
  const base = 2.5 * ["casa", "fornace", "bosco", "fattoria", "casetta"].filter((n) => mem.luoghi[n]).length + (Object.keys(mem.casse ?? {}).length >= 2 ? 2.5 : 0);
  const sapere = 5 * Math.min(1, mem.lezioni.length / 25) + 5 * Math.min(1, (mem.universali ?? []).length / 30);
  const r = (x) => Math.round(x);
  return { totale: r(equip + sopr + abil + base + sapere), equipaggiamento: r(equip), sopravvivenza: r(sopr), abilita: r(abil), base: r(base), sapere: r(sapere) };
}
// testo corto e leggibile di un compito per il pannello: "raccogli legna x2 (fatti 1)"
const breve = (c) => !c ? "nessuno" : [c.tipo, c.nome ?? c.blocco ?? c.oggetto ?? c.minerale ?? c.schema, c.quantita ? `x${c.quantita}` : "",
  c.x !== undefined && c.tipo !== "routine" ? `a ${c.x},${c.y},${c.z}` : "", c.stato?.fatti ? `(fatti ${c.stato.fatti})` : ""].filter(Boolean).join(" ");
// Pannello web: stato in diretta ogni 5 secondi e memoria ogni 2 minuti, scritti nel log (il pannello li legge da lì)
ogniTick(100, () => {
  if (!pronto) return;
  const g = giocatoriVeri().map((p) => ({ n: p.name, x: Math.round(p.location.x), y: Math.round(p.location.y), z: Math.round(p.location.z), v: Math.round(p.getComponent("minecraft:health")?.currentValue ?? 0) }));
  if (!vivo()) return scriviBlocco("STATO", { v: VERSIONE, presente: false, giocatori: g, modalita: mem.modalita, spesa: +mem.spesa.usd.toFixed(4), tps: +prestazioni.tps.toFixed(1) });
  const l = bot.location, eq = bot.getComponent("minecraft:equippable");
  const arm = ["Head", "Chest", "Legs", "Feet", "Offhand"].map((s) => eq?.getEquipment(s)?.typeId?.replace("minecraft:", "")).filter(Boolean);
  scriviBlocco("STATO", {
    v: VERSIONE, presente: true, x: Math.round(l.x), y: Math.round(l.y), z: Math.round(l.z), dim: bot.dimension.id.replace("minecraft:", ""),
    vita: Math.round(bot.getComponent("minecraft:health")?.currentValue ?? 0), fame: Math.round(bot.getComponent("minecraft:player.hunger")?.currentValue ?? 0),
    armatura: arm, inv: istantaneaInventario(bot).map((x) => `${String(x[0]).replace("minecraft:", "")}:${x[1]}`),
    compito: breve(mem.compito), coda: mem.coda.slice(0, 8).map(breve),
    modalita: mem.modalita, bersaglio: mem.bersaglio, giocatori: g, ora: world.getTimeOfDay(), tps: +prestazioni.tps.toFixed(1),
    spesa: +mem.spesa.usd.toFixed(4), chiamate: mem.spesa.chiamate, budget: CFG.budget, maturita: maturita(),
  });
});
ogniTick(2400, () => {
  if (!pronto) return;
  // andamento giornaliero della maturazione (un valore al giorno, l'ultimo del giorno)
  const m = maturita();
  if (m) { const g = adesso().slice(0, 10), st = (mem.maturita ??= []); if (st.at(-1)?.g === g) st.at(-1).v = m.totale; else st.push({ g, v: m.totale }); if (st.length > 365) st.shift(); }
  scriviBlocco("MEMORIA", { lezioni: mem.lezioni, lezioniAuto: mem.lezioniAuto ?? [], luoghi: mem.luoghi, risorse: mem.risorse ?? {}, pericoli: mem.pericoli ?? [],
    casse: mem.casse ?? {}, esperienza: mem.esperienza, statRoutine: mem.statRoutine ?? {}, priorita: mem.prioritaGratis ?? [], riflessione: mem.riflessione ?? null,
    schemi: Object.keys(mem.schemi ?? {}), obiettivi: mem.obiettivi, voti: mem.voti ?? null, diagnosi: sessione.diagnosi ?? [], universali: (mem.universali ?? []).map((u) => u.t), maturita: mem.maturita ?? [] });
});
for (const f of cb) f();
