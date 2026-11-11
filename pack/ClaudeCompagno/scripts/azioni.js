import { world, system, ItemStack, EquipmentSlot, GameMode } from "@minecraft/server";
import { SimulatedPlayer } from "@minecraft/server-gametest";
import { mem, sessione, protetti, chiaveBlocco, proteggi, evento, errore, conta, notifica } from "./memoria.js";
import { RICETTE, FUSIONI, COMBUSTIBILI, CIBO, GRUPPI, assiDaTronco } from "./ricette.js";
import { salvaSchema, ROUTINE } from "./schemi.js";

// "guarda" / "smetti": il proprietario vede il bot in diretta da spettatore, come un video di gioco.
// La telecamera la disegna il suo telefono; la Odin fa solo un teletrasporto ogni mezzo secondo (costo minimo).
export function guarda(p, on) {
  if (on) {
    if (!mem.spettatore) mem.spettatore = { nome: p.name, modo: String(p.getGameMode?.() ?? "Survival"), x: p.location.x, y: p.location.y, z: p.location.z, dim: p.dimension.id };
    p.setGameMode(GameMode.Spectator);
    if (mem.bersaglio === p.name) { mem.modalita = "autonomo"; mem.bersaglio = ""; } // seguire chi lo sta filmando lo farebbe girare su se stesso
    return true;
  }
  const s = mem.spettatore;
  if (!s || s.nome !== p.name) return false;
  mem.spettatore = null;
  p.setGameMode(GameMode[s.modo] ?? GameMode.Survival);
  p.teleport({ x: s.x, y: s.y, z: s.z }, { dimension: world.getDimension?.(s.dim) ?? p.dimension });
  return true;
}
// 4 blocchi dietro al bot e 2,5 più in alto, guardando lui
export function inquadra(bot) {
  const s = mem.spettatore;
  if (!s || !bot?.isValid) return;
  const p = world.getAllPlayers().find((g) => g.name === s.nome);
  if (!p) return;
  const v = bot.getViewDirection?.() ?? { x: 0, z: 1 };
  const n = Math.hypot(v.x, v.z) || 1, l = bot.location;
  p.teleport({ x: l.x - (v.x / n) * 4, y: l.y + 2.5, z: l.z - (v.z / n) * 4 }, { dimension: bot.dimension, facingLocation: { x: l.x, y: l.y + 1, z: l.z } });
}

// Notifiche per il cervello (compito finito, fallito, morte...): main.js le svuota.
export const notifiche = [];
export const avvisa = (t) => notifiche.push(t);

// ---------- utilità ----------
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const pav = (p) => ({ x: Math.floor(p.x), y: Math.floor(p.y), z: Math.floor(p.z) });
const somma = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const centro = (p) => ({ x: p.x + 0.5, y: p.y, z: p.z + 0.5 });
const tick = () => system.currentTick;
const ns = (id) => (String(id).includes(":") ? String(id) : `minecraft:${id}`).toLowerCase();
export const DIREZIONI = { nord: { x: 0, y: 0, z: -1 }, sud: { x: 0, y: 0, z: 1 }, est: { x: 1, y: 0, z: 0 }, ovest: { x: -1, y: 0, z: 0 } };

export const giocatoriVeri = () => world.getAllPlayers().filter((p) => !(p instanceof SimulatedPlayer));
// Dopo un reload il "vecchio" Claude resta nel mondo senza script e quello nuovo nasce come "Claude(2)", "Claude(3)"...
// Si toglieva solo chi si chiamava esattamente "Claude", quindi gli altri si accumulavano a ogni aggiornamento (10/11: fino a
// "Claude(6)"). Questi fantasmi attirano i mostri, bloccano i blocchi dove stanno ("non riesco a chiudere la tana
// (giocatore)" dopo ogni reload fatto in superficie) e morendo lasciano a terra copie dell'inventario ("buttati 43 doppi").
// Va chiamata prima di far nascere il bot nuovo: toglie tutti i giocatori simulati e chiunque porti il suo nome.
export function togliFantasmi(nome, dim) {
  const suo = new RegExp(`^${String(nome).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\(\\d+\\))?$`);
  let tolti = 0;
  for (const p of world.getAllPlayers()) {
    if (!(p instanceof SimulatedPlayer) && !suo.test(p.name ?? "")) continue;
    try { if (typeof p.disconnect === "function") p.disconnect(); else dim.runCommand(`kick "${p.name}"`); tolti++; }
    catch { try { dim.runCommand(`kick "${p.name}"`); tolti++; } catch {} }
  }
  if (tolti > 1) evento(`Tolti ${tolti} vecchi ${nome} rimasti nel mondo dopo gli aggiornamenti`);
  return tolti;
}
export const giocatore = (nome) => giocatoriVeri().find((p) => p.name.toLowerCase() === String(nome ?? "").toLowerCase());

// ---------- inventario ----------
export const inv = (bot) => bot.getComponent("minecraft:inventory").container;

function corrisponde(id, filtro) {
  if (typeof filtro === "function") return filtro(id);
  if (filtro.startsWith("#")) return GRUPPI[filtro]?.(id) ?? false;
  return id === ns(filtro);
}

export function contaOggetti(bot, filtro) {
  const c = inv(bot);
  let n = 0;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it && corrisponde(it.typeId, filtro)) n += it.amount;
  }
  return n;
}

// Toglie n oggetti; restituisce i typeId tolti (serve per i gruppi, es. quale tronco).
export function togli(bot, filtro, n) {
  const c = inv(bot);
  const tolti = [];
  for (let i = 0; i < c.size && n > 0; i++) {
    const it = c.getItem(i);
    if (!it || !corrisponde(it.typeId, filtro)) continue;
    const q = Math.min(n, it.amount);
    for (let k = 0; k < q; k++) tolti.push(it.typeId);
    n -= q;
    if (q === it.amount) c.setItem(i, undefined);
    else { it.amount -= q; c.setItem(i, it); }
  }
  return tolti;
}

export function aggiungi(bot, id, n) {
  const c = inv(bot);
  while (n > 0) {
    const stack = new ItemStack(ns(id), 1);
    const q = Math.min(n, stack.maxAmount);
    stack.amount = q;
    const resto = c.addItem(stack);
    if (resto) bot.dimension.spawnItem(resto, bot.location); // inventario pieno: lo lascia a terra
    n -= q;
  }
}

function trovaSlot(bot, filtro) {
  const c = inv(bot);
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it && corrisponde(it.typeId, filtro)) return i;
  }
  return -1;
}

function seleziona(bot, slot) {
  if (slot < 0) return;
  if (slot > 8) { inv(bot).swapItems(slot, 0, inv(bot)); slot = 0; }
  bot.selectedSlotIndex = slot;
}

export function riassuntoInventario(bot) {
  const c = inv(bot);
  const tot = {};
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it) conta(tot, it.typeId, it.amount);
  }
  return Object.entries(tot).map(([k, v]) => `${k} x${v}`).join(", ") || "vuoto";
}

// conIndossati: anche armatura e scudo, col nome del posto come quarto elemento. Senza, a ogni reload o riavvio il bot
// rinasceva nudo (10/11: armatura di rame rifatta 3 volte, equipaggiamento 11/30 -> 7/30 dopo un reload senza morti).
const INDOSSATI = ["Head", "Chest", "Legs", "Feet", "Offhand"];
export function istantaneaInventario(bot, conIndossati = false) {
  const c = inv(bot);
  const out = [];
  const voce = (it, posto) => out.push([it.typeId, it.amount, it.getComponent("minecraft:durability")?.damage ?? 0, ...(posto ? [posto] : [])]);
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it) voce(it);
  }
  const eq = conIndossati ? bot.getComponent("minecraft:equippable") : null;
  for (const posto of eq ? INDOSSATI : []) { const it = eq.getEquipment(posto); if (it) voce(it, posto); }
  return out;
}

export function ripristinaInventario(bot, lista) {
  for (const [id, n, danno, posto] of lista) {
    try {
      const st = new ItemStack(id, n);
      const dur = st.getComponent("minecraft:durability");
      if (dur && danno) dur.damage = Math.min(danno, dur.maxDurability - 1);
      if (posto && bot.getComponent("minecraft:equippable")?.setEquipment(posto, st)) continue;
      inv(bot).addItem(st);
    } catch (e) { errore(`ripristino ${id}`, e); }
  }
}

// ---------- attrezzi ----------
const LIVELLO = { wooden: 1, golden: 1, stone: 2, copper: 2, iron: 3, diamond: 4, netherite: 5 };
const livelloOggetto = (id) => LIVELLO[id.replace("minecraft:", "").split("_")[0]] ?? 0;

export function tipoAttrezzo(blocco) {
  if (/log|wood|planks|stem|hyphae|chest|crafting_table|fence|door|ladder|bookshelf|barrel|pumpkin|melon|bamboo/.test(blocco)) return "axe";
  if (/dirt|grass_block|sand|gravel|clay|snow|soul_s|mud|farmland|podzol|mycelium|path/.test(blocco)) return "shovel";
  if (/leaves|flower|tall_grass|fern|vine|wheat|carrot|potato|sapling|bush|torch/.test(blocco)) return "mano";
  return "pickaxe";
}

export function livelloRichiesto(blocco) {
  if (/obsidian|ancient_debris|netherite_block/.test(blocco)) return 4;
  if (/diamond_ore|gold_ore|emerald_ore|redstone_ore/.test(blocco) && !blocco.includes("nether_gold")) return 3;
  if (/iron_ore|copper_ore|lapis_ore|raw_iron_block/.test(blocco)) return 2;
  if (tipoAttrezzo(blocco) === "pickaxe") return 1;
  return 0;
}

function miglioreAttrezzo(bot, tipo) {
  const c = inv(bot);
  let best = -1, lv = 0;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (it && it.typeId.endsWith(`_${tipo}`) && livelloOggetto(it.typeId) > lv) { best = i; lv = livelloOggetto(it.typeId); }
  }
  return { slot: best, livello: lv };
}

function usura(bot, slot) {
  const c = inv(bot);
  const it = c.getItem(slot);
  const dur = it?.getComponent("minecraft:durability");
  if (!dur) return;
  if (dur.damage + 1 >= dur.maxDurability) { c.setItem(slot, undefined); evento(`${it.typeId.replace("minecraft:", "")} si è rotto`); return; }
  dur.damage += 1;
  c.setItem(slot, it);
}

// ---------- blocchi ----------
const INDISTRUTTIBILI = /bedrock|barrier|command_block|end_portal|structure_block|jigsaw|light_block|reinforced_deepslate|portal$/;
const COSTRUITI = /planks|stairs|slab|fence|door|glass|wool|carpet|_bed$|chest|barrel|furnace|crafting_table|smoker|anvil|bricks|polished|concrete|lantern|torch|sign|banner|bookshelf|ladder|trapdoor|_wall$|pressure_plate|button|lever|rail|hopper|dropper|dispenser|redstone_wire|repeater|comparator|piston|observer|bell|lectern|loom|stonecutter|grindstone|smithing|cartography|fletching|composter|cauldron|brewing|enchanting|beacon|shulker|glazed|scaffolding|campfire|flower_pot|frame|quartz_block|smooth_|chiseled|cut_|target|tnt|beehive|hay_block|(iron|gold|diamond|emerald|lapis|redstone|coal|copper|netherite)_block$/;
const ORE_NATURALI = /_ore$|ancient_debris|amethyst/;
const SOSTITUIBILI = /air|short_grass|tall_grass|fern|snow_layer|water|lava|dead_bush|vine|deadbush|flower$|poppy|dandelion|seagrass/;

export function protetto(bot, b) {
  if (INDISTRUTTIBILI.test(b.typeId)) return true;
  if (protetti.has(chiaveBlocco(bot.dimension, b.location))) return true;
  // I blocchi tipicamente costruiti si rispettano anche se piazzati prima dell'installazione.
  return COSTRUITI.test(b.typeId) && !ORE_NATURALI.test(b.typeId);
}

// Rompe un blocco come farebbe un giocatore: attrezzo giusto, usura, oggetti raccolti.
export function scava(bot, p, forza = false) {
  const dim = bot.dimension;
  const b = dim.getBlock(p);
  if (!b) return "scarico";
  if (b.isAir || b.isLiquid) return "aria";
  if (INDISTRUTTIBILI.test(b.typeId) || (!forza && protetto(bot, b))) return "protetto";
  const id = b.typeId;
  const tipo = tipoAttrezzo(id);
  const att = tipo === "mano" ? { slot: -1, livello: 0 } : miglioreAttrezzo(bot, tipo);
  if (att.livello < livelloRichiesto(id)) return "attrezzo";
  seleziona(bot, att.slot);
  bot.lookAtBlock(p);
  bot.attack(); // movimento del braccio
  dim.runCommand(`setblock ${p.x} ${p.y} ${p.z} air destroy`);
  if (att.slot >= 0) usura(bot, bot.selectedSlotIndex);
  for (const e of dim.getEntities({ type: "minecraft:item", location: centro(p), maxDistance: 2.5 })) e.teleport(bot.location);
  protetti.delete(chiaveBlocco(dim, p));
  conta(sessione.minati, id);
  return "ok";
}

// tick di attesa dopo uno scavo, per non essere istantaneo
function attesaScavo(id, bot) {
  const t = tipoAttrezzo(id);
  const lv = t === "mano" ? 0 : miglioreAttrezzo(bot, t).livello;
  const base = /obsidian|ancient_debris/.test(id) ? 40 : ORE_NATURALI.test(id) ? 12 : t === "pickaxe" ? 10 : 6;
  return Math.max(2, Math.round(base / Math.max(1, lv)));
}

// suDiMe: il bot può chiudersi il tetto sopra la testa (tana). Appena teletrasportato in fondo alla buca la sua posizione
// risulta ancora quella di prima fino al tick dopo, e il blocco al posto dei piedi veniva rifiutato ("giocatore").
export function piazza(bot, p, id, suDiMe = false) {
  id = ns(id);
  const b = bot.dimension.getBlock(p);
  if (!b) return "scarico";
  if (b.typeId === id) return "gia";
  if (!b.isAir && !b.isLiquid && !SOSTITUIBILI.test(b.typeId)) return "occupato";
  // mai murare un giocatore (o il bot stesso): un blocco sui piedi o sulla testa soffoca
  const q = pav(p);
  if (world.getAllPlayers().some((g) => { if (suDiMe && g.id === bot.id) return false; const f = pav(g.location); return g.dimension.id === bot.dimension.id && f.x === q.x && f.z === q.z && (q.y === f.y || q.y === f.y + 1); })) return "giocatore";
  if (contaOggetti(bot, id) < 1) return "manca";
  try { b.setType(id); } catch (e) { errore(`piazza ${id}`, e); return "invalido"; }
  togli(bot, id, 1);
  bot.lookAtBlock(p);
  proteggi(bot.dimension, p);
  conta(sessione.piazzati, id);
  return "ok";
}

export function cercaBlocchi(bot, filtro, raggio = 16, alto = 8, max = 48) {
  const dim = bot.dimension;
  const o = pav(bot.location);
  const trovati = [];
  const t0 = Date.now(); // tetto di tempo: sul server lento una scansione intera bloccava il tick (watchdog)
  const tetto = prestazioni.lento ? 20 : 40; // server in affanno: scansioni più corte
  for (let dy = -alto; dy <= alto && Date.now() - t0 < tetto; dy++) {
    const y = o.y + dy;
    if (y < dim.heightRange.min || y >= dim.heightRange.max) continue;
    for (let dx = -raggio; dx <= raggio; dx++) for (let dz = -raggio; dz <= raggio; dz++) {
      const p = { x: o.x + dx, y, z: o.z + dz };
      const b = dim.getBlock(p);
      if (b && !b.isAir && filtro(b)) trovati.push([dx * dx + dy * dy * 2 + dz * dz, p]);
    }
  }
  return trovati.sort((a, b) => a[0] - b[0]).slice(0, max).map((t) => t[1]);
}

// ---------- movimento ----------
const nav = { meta: null, t: 0, prima: null, tPos: 0, bloccato: 0 };

export function vaiVerso(bot, p, raggio = 2) {
  const d = dist(bot.location, p);
  if (d <= raggio) { bot.stopMoving(); nav.bloccato = 0; return true; }
  // mete vicine (passi di galleria e scala): ricalcolo preciso; mete lontane: ricalcolo più raro, costa CPU
  if (!nav.meta || dist(nav.meta, p) > Math.min(1.5, Math.max(0.3, d / 4)) || tick() - nav.t > 80) {
    try {
      const r = bot.navigateToLocation(p, 1);
      if (!r.isFullPath) bot.moveToLocation(p);
    } catch { try { bot.moveToLocation(p); } catch (e) { errore("movimento", e); } }
    nav.meta = p; nav.t = tick();
  }
  if (tick() - nav.tPos >= 20) {
    if (nav.prima) {
      const mosso = dist(nav.prima, bot.location);
      sessione.distanza += mosso;
      nav.bloccato = mosso < 0.4 ? nav.bloccato + 20 : 0;
      if (nav.bloccato >= 60) bot.jump();
      if (nav.bloccato >= 100) { nav.meta = null; try { bot.moveToLocation(p); } catch {} }
    }
    nav.prima = bot.location; nav.tPos = tick();
  }
  // un solo avviso per blocco, poi si riparte da zero: restando "bloccato" a ogni chiamata, la caccia scartava e
  // dimenticava un posto della mappa ogni 4 tick (10/11: 16 posti di animali cancellati in 2 secondi, caccia 1%)
  if (nav.bloccato >= 300) { nav.bloccato = 0; nav.meta = null; return "bloccato"; }
  return false;
}

export function seguiGiocatore(bot, p, distanza = 3) {
  const lontano = p.dimension.id !== bot.dimension.id || dist(bot.location, p.location) > 48;
  if (lontano || (vaiVerso(bot, p.location, distanza) === "bloccato" && dist(bot.location, p.location) > 10)) {
    bot.teleport(p.location, { dimension: p.dimension }); // come i cani addomesticati
    nav.meta = null; nav.bloccato = 0;
  }
}

// ---------- armatura e cibo ----------
const LIV_ARMATURA = { leather: 1, golden: 2, copper: 2.5, chainmail: 3, turtle: 3, iron: 4, diamond: 5, netherite: 6 };
const SLOT_ARMATURA = { helmet: EquipmentSlot.Head, chestplate: EquipmentSlot.Chest, leggings: EquipmentSlot.Legs, boots: EquipmentSlot.Feet };
const livArm = (id) => LIV_ARMATURA[id?.replace("minecraft:", "").split("_")[0]] ?? 0;

export function indossaArmatura(bot) {
  const eq = bot.getComponent("minecraft:equippable");
  const c = inv(bot);
  for (const [pezzo, slot] of Object.entries(SLOT_ARMATURA)) {
    const attuale = eq.getEquipment(slot);
    let best = -1, lv = livArm(attuale?.typeId);
    for (let i = 0; i < c.size; i++) {
      const it = c.getItem(i);
      if (it?.typeId.endsWith(`_${pezzo}`) && livArm(it.typeId) > lv) { best = i; lv = livArm(it.typeId); }
    }
    if (best < 0) continue;
    const nuovo = c.getItem(best);
    c.setItem(best, attuale);
    eq.setEquipment(slot, nuovo);
    evento(`Indossato ${nuovo.typeId.replace("minecraft:", "")}`);
  }
  // scudo nella mano sinistra
  if (!eq.getEquipment(EquipmentSlot.Offhand)) {
    const i = trovaSlot(bot, "minecraft:shield");
    if (i >= 0) { eq.setEquipment(EquipmentSlot.Offhand, c.getItem(i)); c.setItem(i); evento("Imbracciato lo scudo"); }
  }
}

const pasto = { attivo: null, tentativiFalliti: 0 };

// In combattimento mangia solo se la vita è bassa.
export function gestisciFame(bot, inLotta) {
  const fame = bot.getComponent("minecraft:player.hunger")?.currentValue ?? 20;
  const vita = bot.getComponent("minecraft:health")?.currentValue ?? 20;
  if (pasto.attivo) {
    if (tick() - pasto.attivo.t < 40) return true;
    try { bot.stopUsingItem(); } catch {}
    const { id, prima } = pasto.attivo;
    pasto.attivo = null;
    if (contaOggetti(bot, id) < prima) { sessione.mangiato++; return false; }
    // Ripiego: se il giocatore simulato non consuma il cibo, lo applico a mano.
    togli(bot, id, 1);
    bot.addEffect("saturation", 1, { amplifier: Math.max(0, (CIBO[id] ?? 4) - 1), showParticles: false });
    sessione.mangiato++;
    return false;
  }
  // 2.8.81: sotto 18 di fame la vita non si rigenera: l'11/11 con fame 16-17 per ore ogni colpo è rimasto (vita da 20 a 1).
  // Con la vita non piena mangia appena la fame scende sotto 18, non più solo a fame 14 o vita sotto 14.
  const bisogno = inLotta ? vita <= 8 && fame < 20 : fame <= 14 || (vita < 20 && fame < 18) || (vita < 14 && fame < 20);
  if (!bisogno) return false;
  let migliore = null;
  for (const id of Object.keys(CIBO)) if (contaOggetti(bot, id) > 0 && (!migliore || CIBO[id] > CIBO[migliore])) migliore = id;
  // emergenza: pollo crudo (30% di nausea) meglio che morire di fame (fame 3 con 2 polli in tasca, 0 pasti)
  if (!migliore && (fame <= 6 || vita <= 8) && contaOggetti(bot, "minecraft:chicken") > 0) migliore = "minecraft:chicken";
  if (!migliore) return false;
  const slot = trovaSlot(bot, migliore);
  if (slot !== 8) inv(bot).swapItems(slot, 8, inv(bot));
  bot.selectedSlotIndex = 8;
  pasto.attivo = { id: migliore, prima: contaOggetti(bot, migliore), t: tick() };
  try { bot.useItemInSlot(8); } catch (e) { errore("mangiare", e); }
  return true;
}

// ---------- inventario in ordine ----------
// Butta la roba inutile e i doppioni (aveva 106 leaf_litter, 12 banchi, 4 picconi di pietra insieme a quello di ferro).
const ROBACCIA = /leaf_litter|rotten_flesh|spider_eye|poisonous_potato|pufferfish|dead_bush|^minecraft:(short_grass|tall_grass|fern|large_fern)$/;
const LIMITI = [[/^minecraft:(dirt|diorite|granite|andesite|tuff|cobbled_deepslate|netherrack|calcite)$/, 64], [/^minecraft:(crafting_table|furnace)$/, 1], [/_seeds$/, 32], [/_sapling$/, 16],
  // cose che il bot non usa: 7 archi (uno per casella) e ghiaia, ossa, frecce riempivano l'inventario (10/11: 0 posti liberi)
  [/^minecraft:(bow|crossbow|fishing_rod)$/, 1], [/^minecraft:(gravel|bone|arrow)$/, 16]];
// con meno di 4 posti liberi butta anche questi, dal meno utile, finché non ne ha 4
// 2.8.90: niente più ossa: sono farina d'ossa per la fattoria (11/11 12:06 buttate le 3 ossa appena prima di servire)
const CIANFRUSAGLIE = ["nautilus_shell", "lead", "sugar", "brown_mushroom", "red_mushroom", "gunpowder", "feather", "flint", "arrow", "gravel", "leather"].map((n) => `minecraft:${n}`);
export function riordinaInventario(bot) {
  const c = inv(bot);
  const tenuti = {};
  let via = 0;
  for (let i = 0; i < c.size; i++) {
    const it = c.getItem(i);
    if (!it) continue;
    const lim = ROBACCIA.test(it.typeId) ? 0 : LIMITI.find(([re]) => re.test(it.typeId))?.[1];
    if (lim === undefined) continue;
    const tieni = Math.max(0, Math.min(it.amount, lim - (tenuti[it.typeId] ?? 0)));
    tenuti[it.typeId] = (tenuti[it.typeId] ?? 0) + tieni;
    if (tieni === it.amount) continue;
    via += it.amount - tieni;
    if (tieni === 0) c.setItem(i); else { it.amount = tieni; c.setItem(i, it); }
  }
  // attrezzi: per tipo tiene il migliore e uno di scorta
  for (const tipo of ["pickaxe", "axe", "sword", "shovel", "hoe"]) {
    const slot = [];
    for (let i = 0; i < c.size; i++) { const it = c.getItem(i); if (it?.typeId.endsWith(`_${tipo}`)) slot.push([livelloOggetto(it.typeId), i]); }
    slot.sort((a, b) => b[0] - a[0]);
    for (const [, i] of slot.slice(2)) { c.setItem(i); via++; }
  }
  const liberi = () => { let n = 0; for (let i = 0; i < c.size; i++) if (!c.getItem(i)) n++; return n; };
  for (const id of CIANFRUSAGLIE) {
    if (liberi() >= 4) break;
    for (let i = 0; i < c.size; i++) { const it = c.getItem(i); if (it?.typeId === id) { via += it.amount; c.setItem(i); } }
  }
  if (via) evento(`Inventario riordinato: buttati ${via} oggetti inutili o doppi`);
}

// ---------- vista dal vivo per il pannello ----------
// Blocchi visti dall'alto (una lettera per blocco) e creature intorno al bot, dentro lo STATO ogni 5 secondi.
// Il terreno si rilegge solo se il bot si è spostato di 3 blocchi o dopo 30 s: costa pochissimo alla Odin.
const R_VISTA = 12;
const cache = { x: null, z: null, t: 0, griglia: "" };
export function letteraBlocco(id) {
  const n = id.replace("minecraft:", "");
  if (/water|ice$/.test(n)) return "w";
  if (/lava|magma/.test(n)) return "v";
  if (/leaves/.test(n)) return "f";
  if (/_log$|_wood$|_stem$/.test(n)) return "t";
  if (COSTRUITI.test(n) || n === "cobblestone") return "c";
  if (/grass_block|moss|podzol|mycelium|short_grass|fern|flower|bush/.test(n)) return "g";
  if (/sand|gravel/.test(n)) return "y";
  if (/snow/.test(n)) return "n";
  if (/dirt|mud|farmland|clay/.test(n)) return "d";
  if (/stone|deepslate|andesite|diorite|granite|tuff|calcite|ore$/.test(n)) return "s";
  return "o";
}
const mostro = (e) => { try { return e.matches({ families: ["monster"] }) ? 1 : 0; } catch { return 0; } };
export function vista(bot) {
  const l = bot.location, dim = bot.dimension, x0 = Math.floor(l.x), z0 = Math.floor(l.z);
  if (cache.x === null || Math.abs(x0 - cache.x) >= 3 || Math.abs(z0 - cache.z) >= 3 || (Date.now() - cache.t > 30000 && !prestazioni.lento)) {
    let g = "";
    for (let dz = -R_VISTA; dz <= R_VISTA; dz++) for (let dx = -R_VISTA; dx <= R_VISTA; dx++) {
      // ai bordi dei chunk non caricati anche leggere il tipo del blocco dà errore: lì "?"
      let c = "?"; try { const b = dim.getTopmostBlock({ x: x0 + dx, z: z0 + dz }); if (b) c = letteraBlocco(b.typeId); } catch {}
      g += c;
    }
    Object.assign(cache, { x: x0, z: z0, t: Date.now(), griglia: g });
  }
  let ent = [];
  try { ent = dim.getEntities({ location: l, maxDistance: 20 }); } catch {}
  const mob = ent.filter((e) => e.id !== bot.id && e.typeId !== "minecraft:player" && !/item|xp_orb|arrow|projectile|painting|boat|minecart|fireball|potion|egg|snowball|trident|leash/.test(e.typeId))
    .slice(0, 40).map((e) => ({ t: e.typeId.replace("minecraft:", ""), x: Math.round(e.location.x), z: Math.round(e.location.z), o: mostro(e) }));
  const d = bot.getViewDirection?.() ?? { x: 0, z: 1 };
  return { cx: cache.x, cz: cache.z, r: R_VISTA, g: cache.griglia, mob, dir: Math.round(Math.atan2(d.x, d.z) * 57.3) };
}

// ---------- difesa ----------
const NEUTRALI = /enderman|zombie_pigman|zombified_piglin|piglin$|piglin_brute|wolf|bee$|llama|iron_golem|polar_bear|dolphin|goat|panda/;
const EVITA = /warden|ender_dragon|wither$|elder_guardian/;
export const aggressori = new Map(); // entityId -> { vittima, t }
const lotta = { bersaglio: null, colpo: 0, scelta: 0, ritirata: 0, progresso: 0 };
// mostri irraggiungibili (es. drowned in acqua): ignorati per 1 minuto, prima il bot li inseguiva per sempre e restava fermo
const ignorati = new Map();

export function registraAggressione(vittima, aggressore) {
  if (!aggressore || aggressore.typeId === "minecraft:player") return; // niente PvP
  aggressori.set(aggressore.id, { vittima: vittima.name ?? vittima.typeId, t: tick() });
}

// prima i mostri più pericolosi: creeper (esplodono sui giocatori), poi chi tira da lontano
const PERICOLO = { "minecraft:creeper": -1, "minecraft:skeleton": -0.5, "minecraft:stray": -0.5, "minecraft:bogged": -0.5, "minecraft:witch": -0.5, "minecraft:pillager": -0.4, "minecraft:phantom": -0.3 };
function scegliBersaglio(bot) {
  const proprietario = String(mem.proprietario ?? "").toLowerCase();
  const candidati = [];
  for (const [id, a] of aggressori) {
    const e = world.getEntity(id);
    if (!e?.isValid || tick() - a.t > 600 || e.dimension.id !== bot.dimension.id || EVITA.test(e.typeId)) { aggressori.delete(id); continue; }
    if ((ignorati.get(id) ?? 0) > tick()) continue;
    const pri = a.vittima.toLowerCase() === proprietario ? 0 : a.vittima === bot.name ? 2 : 1;
    if (dist(e.location, bot.location) < 32) candidati.push([pri, e]);
  }
  if (mem.modalita !== "fermo") {
    for (const p of giocatoriVeri()) {
      if (p.dimension.id !== bot.dimension.id || dist(p.location, bot.location) > 40) continue;
      for (const e of p.dimension.getEntities({ location: p.location, maxDistance: 12, families: ["monster"] })) {
        if (NEUTRALI.test(e.typeId) || EVITA.test(e.typeId) || (ignorati.get(e.id) ?? 0) > tick()) continue;
        candidati.push([(p.name.toLowerCase() === proprietario ? 3 : 4) + dist(e.location, p.location) / 20 + (PERICOLO[e.typeId] ?? 0), e]);
      }
    }
  }
  for (const e of bot.dimension.getEntities({ location: bot.location, maxDistance: 8, families: ["monster"] })) {
    if (!NEUTRALI.test(e.typeId) && !EVITA.test(e.typeId) && !((ignorati.get(e.id) ?? 0) > tick())) candidati.push([5 + dist(e.location, bot.location) / 20 + (PERICOLO[e.typeId] ?? 0), e]);
  }
  candidati.sort((a, b) => a[0] - b[0]);
  return candidati[0]?.[1] ?? null;
}

// 2.8.71: senza corazza e senza giocatori da proteggere il bot è "debole": non va a cercare lotte, dai creeper scappa sempre
// e con metà vita si chiude in una tana invece di combattere (10/11: morto di giorno a vita 6 "in ritirata" da uno zombie
// e per un creeper mentre andava a legna; di notte in tana 3 su 3 senza un graffio).
// 2.8.75: la corazza di rame non basta (10/11 15:56-16:04: 4 morti in 8 minuti con corazza e gambali di rame addosso):
// come per la notte, solo ferro o meglio fa uscire dallo stato "debole"
const debole = (bot) => !/(iron|diamond|netherite)_chestplate$/.test(bot.getComponent("minecraft:equippable")?.getEquipment?.("Chest")?.typeId ?? "") && !giocatoriVeri().length;
// dentro il riparo chiuso: stessa cella e stessa quota (a 16 blocchi, o sul tetto, non è "al riparo")
export const nelRiparo = (bot) => { const r = mem.rifugio; return !!r?.ok && Math.abs(bot.location.x - r.x - 0.5) < 1 && Math.abs(bot.location.z - r.z - 0.5) < 1 && Math.abs(bot.location.y - r.y) < 1.5; };
// creeper da cui la fuga non è servita: per 5 minuti lo si riguarda solo se arriva a 4 blocchi
const creeperFermi = new Map();
// 2.8.92: tane scavate per i creeper. L'11/11 14:25-17:15 vicino alla fattoria: cunicolo, fattoria, "creeper a pochi passi",
// tana, per quasi 3 ore (14 volte). Dopo 2 tane nella stessa zona (24 blocchi, ultimi 30 minuti), con vita alta e spada di
// ferro, il creeper lo si affronta: colpo e passo indietro (colpito, il creeper rincula e la miccia riparte).
// 2.8.93: contate per zona e non per creeper: la 2.8.92 contava il singolo creeper e lì ce n'erano diversi (5 tane, mai affrontati)
const taneCreeper = [];
const affrontaCreeper = (bot, e) => taneCreeper.filter((t) => Date.now() - t.t < 1800000 && Math.hypot(t.x - e.location.x, t.z - e.location.z) <= 24).length >= 2
  && (bot.getComponent("minecraft:health")?.currentValue ?? 20) >= 16 && contaOggetti(bot, (id) => /(iron|diamond|netherite)_sword$/.test(id)) > 0;
// chiuso nel riparo d'emergenza: fino alla scadenza non esce e non prende lavori
export const inEmergenza = (bot) => !!mem.rifugio?.fino && Date.now() < mem.rifugio.fino && dist(bot.location, mem.rifugio) < 6; // 6: appena sceso la posizione è ancora quella di sopra

// Rinato (aggiornamento o riavvio) mentre era chiuso nel riparo: torna esattamente al suo posto, 30 secondi protetto e senza
// lotte. Il 10/11 alle 12:50 un aggiornamento arrivato di notte lo ha fatto rinascere nella tana: ha attaccato un creeper,
// è scappato ed è morto in una grotta 20 secondi dopo. dove = punto in cui è stato fatto rinascere.
export function rientraNelRiparo(bot, dove, come = "Rinato dentro il riparo") {
  const r = mem.rifugio;
  if (!r?.ok || dist(dove, r) > 6) return false;
  // buca non più libera (franata, riempita): niente teletrasporto dentro un blocco
  const pieno = (dy) => { const k = bot.dimension?.getBlock?.({ x: r.x, y: r.y + dy, z: r.z }); return !!k && !k.isAir && !SOSTITUIBILI.test(k.typeId ?? ""); };
  if (pieno(0) || pieno(1)) return false;
  bot.teleport({ x: r.x + 0.5, y: r.y, z: r.z + 0.5 });
  try { bot.addEffect("resistance", 600, { amplifier: 4, showParticles: false }); } catch {}
  mem.protettoFino = Math.max(mem.protettoFino ?? 0, Date.now() + 30000);
  evento(`${come}: 30 secondi protetto, niente lotte`);
  return true;
}

export function difendi(bot) {
  // rinato protetto dopo una raffica di morti: niente lotte, solo la tana (combattendo usciva e moriva di nuovo)
  if (Date.now() < (mem.protettoFino ?? 0)) { lotta.bersaglio = null; return false; }
  // chiuso nella tana: niente lotte né ritirate (inseguendo mostri irraggiungibili usciva e moriva: 19:57 e 23:07 del 09/11)
  // mentre scava la tana niente lotte né fughe: finché questa funzione rispondeva "in lotta" il compito non veniva eseguito
  // (10/11 18:49: tana della notte assegnata e mai scavata, 14 minuti fuori al buio a scappare da un creeper)
  if (nelRiparo(bot) || mem.compito?.tipo === "tana") { lotta.bersaglio = null; return false; }
  if (tick() - lotta.scelta >= 10) {
    lotta.scelta = tick();
    const b = lotta.bersaglio;
    if (!b?.isValid || dist(b.location, bot.location) > 36) {
      let nuovo = scegliBersaglio(bot);
      // con vita ≤ 6 non va a cercare lotte: solo chi è già addosso (a vita 1 attaccava un drowned dopo l'altro e moriva)
      if (nuovo && (bot.getComponent("minecraft:health")?.currentValue ?? 20) <= 6 && dist(nuovo.location, bot.location) > 3) nuovo = null;
      // debole: solo chi è già a 4 blocchi o lo ha colpito; i creeper li "vede" da lontano per allontanarsi in tempo
      if (nuovo && debole(bot) && dist(nuovo.location, bot.location) > 4 && nuovo.typeId !== "minecraft:creeper" && !aggressori.has(nuovo.id)) nuovo = null;
      if (nuovo && (creeperFermi.get(nuovo.id) ?? 0) > tick() && dist(nuovo.location, bot.location) > 4 && !affrontaCreeper(bot, nuovo)) nuovo = null;
      if (nuovo && nuovo !== b) evento(`Attacco ${nuovo.typeId.replace("minecraft:", "")}`);
      lotta.bersaglio = nuovo;
      if (nuovo && nuovo !== b) lotta.progresso = tick();
    }
  }
  // riparo d'emergenza: debole, metà vita, e un mostro entro 16 blocchi oppure un colpo preso negli ultimi 5 secondi
  // (uno scheletro "irraggiungibile" veniva lasciato perdere e continuava a tirare: 2 morti il 10/11). Tana subito, 90 secondi;
  // se la tana non riesce restano fuga e ritirata qui sotto.
  const vita0 = bot.getComponent("minecraft:health")?.currentValue ?? 20;
  if (vita0 <= 10 && mem.compito?.tipo !== "tana" && Date.now() - (mem.emergenzaT ?? 0) > 20000 && debole(bot)) {
    const b0 = lotta.bersaglio;
    const vicino = b0?.isValid && dist(b0.location, bot.location) < 16 ? b0.typeId : null;
    const colpito = !vicino && [...aggressori.values()].some((a) => a.vittima === (bot.name ?? bot.typeId) && tick() - a.t < 100);
    if (vicino || colpito) {
      mem.emergenzaT = Date.now();
      evento(`Vita ${Math.round(vita0)}/20 senza armatura vera e ${vicino ? vicino.replace("minecraft:", "") + " vicino" : "sotto tiro"}: mi chiudo in una tana`);
      mem.coda = []; lotta.bersaglio = null;
      try { bot.isSneaking = false; } catch {}
      assegna({ tipo: "tana", routine: "notte_sicura", emergenza: true }, "autonomia");
      return false;
    }
  }
  const b = lotta.bersaglio;
  if (!b?.isValid) { lotta.bersaglio = null; try { if (bot.isSneaking) bot.isSneaking = false; } catch {} return false; }
  if (mem.modalita === "fermo" && dist(b.location, bot.location) > 3.5) return false;
  if (tick() < lotta.ritirata) return true;
  const vita = bot.getComponent("minecraft:health")?.currentValue ?? 20;
  const fragile = debole(bot);
  // creeper da cui si scappa (metà vita o meno, oppure debole): niente corpo a corpo
  const fuga = b.typeId === "minecraft:creeper" && (vita <= 10 || fragile) && !affrontaCreeper(bot, b);
  // 10 secondi senza riuscire a colpirlo: lo lascia perdere e torna al compito. Non un creeper da cui sta scappando e che è
  // ancora entro 8 blocchi: "lasciato perdere" restava ignorato per un minuto e poteva arrivargli addosso non visto;
  // più lontano lo perde di vista solo per 10 secondi
  if (tick() - lotta.progresso > 200 && !fuga) {
    ignorati.set(b.id, tick() + 1200);
    evento(`Lascio perdere ${b.typeId.replace("minecraft:", "")}: non riesco a raggiungerlo`);
    lotta.bersaglio = null;
    return false;
  }
  // creeper con metà vita o meno: scappa lontano (2 morti per esplosione a vita 5 il 09/11:
  // la ritirata di 6-8 blocchi per 2 secondi non basta, il creeper insegue e scoppia)
  if (fuga) {
    const l = bot.location, e = b.location, d = Math.max(0.1, Math.hypot(l.x - e.x, l.z - e.z));
    if (d > 16) { lotta.bersaglio = null; return false; }
    // 10 secondi di fuga e il creeper è ancora entro 16 blocchi: la fuga non serve (lui non si muoveva, o il creeper era
    // irraggiungibile sotto terra). Il 10/11 18:35-19:03: 28 minuti di "Scappo dal creeper" a vita 20/20, nessun lavoro,
    // notte passata fuori. Debole si chiude in una tana lì dov'è; quel creeper lo riguarda solo a 4 blocchi.
    // 2.8.80: debole con il creeper entro 8 blocchi non c'è tempo di scappare (11/11 06:26: "Scappo dal creeper: vita 17/20"
    // e pochi secondi dopo è esploso; la tana si scava in un attimo e sotto 2 blocchi pieni l'esplosione non arriva).
    // Se la tana qui è appena fallita (acqua, roccia) resta la fuga.
    const stanco = tick() - lotta.progresso > 200;
    const tana = fragile && (stanco || dist(e, l) < 8) && Date.now() - (mem.emergenzaT ?? 0) > 20000 && Date.now() - (mem.tanaKo ?? 0) > 60000;
    if (stanco || tana) {
      creeperFermi.set(b.id, tick() + 6000);
      lotta.bersaglio = null;
      if (tana) {
        taneCreeper.push({ x: b.location.x, z: b.location.z, t: Date.now() }); if (taneCreeper.length > 20) taneCreeper.shift();
        mem.emergenzaT = Date.now();
        evento(stanco ? "Il creeper resta vicino e scappare non serve: mi chiudo in una tana" : "Creeper a pochi passi: mi chiudo subito in una tana");
        mem.coda = [];
        assegna({ tipo: "tana", routine: "notte_sicura", emergenza: true }, "autonomia");
      }
      return false;
    }
    try { bot.isSneaking = false; bot.moveToLocation({ x: l.x + ((l.x - e.x) / d) * 14, y: l.y, z: l.z + ((l.z - e.z) / d) * 14 }); } catch {}
    lotta.ritirata = tick() + 60;
    if (tick() - (lotta.avvisoRitirata ?? -1e9) > 600) { lotta.avvisoRitirata = tick(); evento(`Scappo dal creeper: vita ${Math.round(vita)}/20`); }
    return true;
  }
  if (vita <= 6 && dist(b.location, bot.location) < 6) {
    const l = bot.location, e = b.location, d = Math.max(0.1, Math.hypot(l.x - e.x, l.z - e.z));
    try { bot.isSneaking = false; bot.moveToLocation({ x: l.x + ((l.x - e.x) / d) * 8, y: l.y, z: l.z + ((l.z - e.z) / d) * 8 }); } catch {}
    lotta.ritirata = tick() + 40;
    if (tick() - (lotta.avvisoRitirata ?? -1e9) > 600) { lotta.avvisoRitirata = tick(); evento(`Ritirata: vita ${Math.round(vita)}/20 contro ${b.typeId.replace("minecraft:", "")}`); }
    return true;
  }
  if (b.typeId === "minecraft:creeper" && lotta.affrontato !== b.id && affrontaCreeper(bot, b)) { lotta.affrontato = b.id; evento("I creeper di questa zona mi hanno già chiuso in tana 2 volte: lo affronto con la spada (colpo e passo indietro)"); }
  colpisci(bot, b);
  // creeper: colpisci e allontanati subito, prima che esploda
  if (b.typeId === "minecraft:creeper" && dist(b.location, bot.location) < 3.5) {
    const l = bot.location, e = b.location, d = Math.max(0.1, Math.hypot(l.x - e.x, l.z - e.z));
    try { bot.moveToLocation({ x: l.x + ((l.x - e.x) / d) * 6, y: l.y, z: l.z + ((l.z - e.z) / d) * 6 }); } catch {}
    lotta.ritirata = tick() + 30;
  }
  return true;
}

// Si avvicina e colpisce con l'arma migliore, rispettando la ricarica dell'arma.
function colpisci(bot, b) {
  if (dist(b.location, bot.location) > 2.8) {
    if (tick() - nav.t > 10) { try { bot.navigateToEntity(b, 1); } catch {} nav.t = tick(); nav.meta = null; }
    return;
  }
  bot.lookAtEntity(b);
  const spada = miglioreAttrezzo(bot, "sword");
  const arma = spada.slot >= 0 ? spada : miglioreAttrezzo(bot, "axe");
  const ricarica = arma.slot < 0 ? 6 : inv(bot).getItem(arma.slot)?.typeId.endsWith("_axe") ? 20 : 12;
  // con lo scudo in mano sinistra si accovaccia tra un colpo e l'altro (su Bedrock così lo scudo para)
  const scudo = bot.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Offhand)?.typeId === "minecraft:shield";
  if (tick() - lotta.colpo < ricarica) { if (scudo) try { bot.isSneaking = true; } catch {} return; }
  if (scudo) try { bot.isSneaking = false; } catch {}
  seleziona(bot, arma.slot);
  if (bot.attackEntity(b) && arma.slot >= 0) usura(bot, bot.selectedSlotIndex);
  lotta.colpo = lotta.progresso = tick();
}

// ---------- mappa delle risorse ----------
// Gratis: ogni 10 s annota alberi, minerali e animali che vede; quando raccogli o caccia non trovano niente
// vicino, va dove li aveva visti invece di fallire con "trovati 0" (prima causa di fallimento nei rapporti).
const CAT_RISORSA = [[/_log$|_stem$/, "legna"], [/coal_ore$/, "coal_ore"], [/iron_ore$/, "iron_ore"], [/copper_ore$/, "copper_ore"],
  [/gold_ore$/, "gold_ore"], [/diamond_ore$/, "diamond_ore"], [/redstone_ore$/, "redstone_ore"], [/lapis_ore$/, "lapis_ore"], [/^minecraft:sand$/, "sand"]];
const ANIMALI = ["cow", "pig", "sheep", "chicken"];
export function categoriaRisorsa(nome) {
  const n = String(nome ?? "").toLowerCase().replace("minecraft:", "");
  if (/^(legna|legno|tronco|tronchi|log)$|_log$/.test(n)) return "legna";
  return n.replace(/^deepslate_/, "");
}
function annotaRisorsa(cat, p) {
  mem.risorse ??= {};
  const l = (mem.risorse[cat] ??= []);
  if (l.some((q) => dist(q, p) < 16)) return;
  l.push({ x: p.x, y: p.y, z: p.z });
  if (l.length > 10) l.shift();
}
export function dimenticaRisorsa(cat, p) {
  if (mem.risorse?.[cat]) mem.risorse[cat] = mem.risorse[cat].filter((q) => dist(q, p) > 16);
}
export function risorsaVicina(bot, cat, escluse = []) {
  return (mem.risorse?.[cat] ?? []).filter((q) => !escluse.some((e) => dist(e, q) < 16) && !inPericolo(q))
    .sort((a, b) => dist(a, bot.location) - dist(b, bot.location))[0];
}
export function annotaRisorse(bot) {
  for (const p of cercaBlocchi(bot, (b) => CAT_RISORSA.some(([re]) => re.test(b.typeId)), 8, 4, 60)) {
    const id = bot.dimension.getBlock(p)?.typeId ?? "";
    const cat = CAT_RISORSA.find(([re]) => re.test(id))?.[1];
    if (cat) annotaRisorsa(cat, p);
  }
  for (const tipo of ANIMALI) {
    const e = bot.dimension.getEntities({ type: `minecraft:${tipo}`, location: bot.location, maxDistance: 32 }).find((x) => !x.nameTag);
    if (e) annotaRisorsa(tipo, pav(e.location));
  }
}

// Caduta nel vuoto vera? Solo se entro 3 blocchi sotto non c'è terreno. Scendendo da un albero o da un gradino di collina
// scattava il salvataggio "grotta": compito interrotto e zona segnata pericolosa (10/11: legna e fornace fermate 6 volte in mezz'ora).
export function vuotoSotto(dim, l) {
  for (let i = 1; i <= 3; i++) {
    const b = dim.getBlock({ x: Math.floor(l.x), y: Math.floor(l.y) - i, z: Math.floor(l.z) });
    if (!b) return true; // zona non caricata: prudenza
    if (/lava/.test(b.typeId)) return true;
    if (b.isLiquid) return false; // l'acqua attutisce; dell'annegamento si occupa l'altro salvataggio
    if (!b.isAir && !SOSTITUIBILI.test(b.typeId)) return false;
  }
  return true;
}

// Di giorno, se è ancora chiuso nel riparo della notte (tana o rifugio), esce in superficie. Restando dentro ogni meta
// risultava "bloccata" dopo 15 secondi: il 10/11 ha passato la mattina nel rifugio, caccia fallita su 19 posti senza muoversi.
export function esciDalRiparo(bot) {
  const r = mem.rifugio;
  if (!r || inEmergenza(bot)) return false;
  // mostri ancora intorno all'uscita (all'ombra degli alberi non bruciano): si aspetta dentro, al massimo fino a metà mattina.
  // Il 10/11 15:59 è uscito all'alba tra i mostri: 7 secondi dopo aveva 6/20 di vita, 24 secondi dopo era morto.
  // 2.8.81: con vita 10 o meno aspetta per tutto il giorno (11/11 08:43: uscito con vita 7 tra strega e zombie, poi vita 1)
  const fragile = (bot.getComponent?.("minecraft:health")?.currentValue ?? 20) <= 10;
  let uscita = null, creeper = null;
  if (r.ok && dist(bot.location, r) <= 4) {
    const fuori = (bot.dimension.getEntities?.({ location: { x: r.x + 0.5, y: r.y + 4, z: r.z + 0.5 }, maxDistance: 12, families: ["monster"] }) ?? [])
      .filter((e) => !NEUTRALI.test(e.typeId));
    if (fuori.length && (fragile || (world.getTimeOfDay?.() ?? 6000) < 4000)) return "aspetta";
    // 2.8.87: un creeper di giorno non brucia e resta accanto alla tana. L'11/11 09:40-10:22: esce, "creeper a pochi passi",
    // di nuovo in tana, e così per mezz'ora (14 blocchi percorsi). Si aspetta 3 minuti che se ne vada; poi si esce
    // dalla parte opposta, a 12 blocchi (un cunicolo sotto terra)
    creeper = fuori.find((e) => e.typeId === "minecraft:creeper");
    if (creeper) {
      r.attesa ??= Date.now();
      if (Date.now() - r.attesa < 180000) return "aspetta";
      // 2.8.88: l'uscita più lontana da TUTTI i mostri entro 28 blocchi, non solo opposta al primo creeper (11/11 10:48: uscito
      // a 12 blocchi e subito "creeper a pochi passi", di nuovo in tana). 8 direzioni a 12 e 16 blocchi.
      const vicini = (bot.dimension.getEntities?.({ location: { x: r.x + 0.5, y: r.y + 4, z: r.z + 0.5 }, maxDistance: 28, families: ["monster"] }) ?? [])
        .filter((e) => !NEUTRALI.test(e.typeId));
      let meglio = -1;
      for (const k of [12, 16]) for (let a = 0; a < 8; a++) {
        const q = suolo(bot.dimension, Math.floor(r.x + Math.cos(a * Math.PI / 4) * k), Math.floor(r.z + Math.sin(a * Math.PI / 4) * k));
        if (!q || q.liquido || inPericolo(q)) continue;
        const lontano = Math.min(99, ...vicini.map((e) => Math.hypot(e.location.x - q.x - 0.5, e.location.z - q.z - 0.5)));
        if (lontano > meglio) { meglio = lontano; uscita = q; }
      }
    }
  }
  mem.rifugio = null;
  if (!r.ok || dist(bot.location, r) > 4) return false;
  const g = uscita ?? suolo(bot.dimension, Math.floor(bot.location.x), Math.floor(bot.location.z));
  if (!g || g.liquido) return false;
  bot.teleport(centro(g)); nav.meta = null; nav.bloccato = 0;
  evento(uscita ? "Il creeper non se ne va: esco dalla tana con un cunicolo, 12 blocchi più in là" : "È giorno: esco dal riparo");
  return true;
}

// Punto libero a terra a 2 blocchi da p. suolo() sulla colonna del tronco scende dentro il legno: il bot ci veniva
// teletrasportato, soffocava, veniva salvato in cima all'albero, cadeva, e l'albero diventava "zona pericolosa" (legna 10%).
export function accanto(dim, p) {
  for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2], [2, -2], [-2, 2]]) {
    const g = suolo(dim, Math.floor(p.x) + dx, Math.floor(p.z) + dz);
    if (!g || g.liquido || inPericolo(g)) continue;
    const piedi = dim.getBlock(g), testa = dim.getBlock({ x: g.x, y: g.y + 1, z: g.z });
    if (piedi && testa && SOSTITUIBILI.test(piedi.typeId) && (testa.isAir || /leaves/.test(testa.typeId))) return g;
  }
  return null;
}

// ---------- prerequisiti ----------
// Se manca un ingrediente, prima lo procura e poi riprova (senza chiamare l'IA e senza contarlo come fallimento).
const PREREQ = {
  "minecraft:raw_iron": { tipo: "raccogli", blocco: "iron_ore" }, "minecraft:raw_copper": { tipo: "raccogli", blocco: "copper_ore" },
  "minecraft:raw_gold": { tipo: "raccogli", blocco: "gold_ore" }, "minecraft:sand": { tipo: "raccogli", blocco: "sand" },
  "#tronco": { tipo: "raccogli", blocco: "legna" }, "minecraft:cobblestone": { tipo: "raccogli", blocco: "pietra" },
  "#pietra": { tipo: "raccogli", blocco: "pietra" }, "minecraft:coal": { tipo: "raccogli", blocco: "coal_ore" },
  "minecraft:beef": { tipo: "caccia", oggetto: "cow" }, "minecraft:porkchop": { tipo: "caccia", oggetto: "pig" },
  "minecraft:mutton": { tipo: "caccia", oggetto: "sheep" }, "minecraft:chicken": { tipo: "caccia", oggetto: "chicken" },
  "minecraft:leather": { tipo: "caccia", oggetto: "cow" }, "#lana": { tipo: "caccia", oggetto: "sheep" },
  "minecraft:iron_ingot": { tipo: "fondi", oggetto: "raw_iron" }, "minecraft:copper_ingot": { tipo: "fondi", oggetto: "raw_copper" },
  "minecraft:gold_ingot": { tipo: "fondi", oggetto: "raw_gold" }, "minecraft:glass": { tipo: "fondi", oggetto: "sand" },
  "minecraft:wheat_seeds": { tipo: "raccogli", blocco: "short_grass" }, "minecraft:torch": { tipo: "routine", nome: "torce" },
  // assi e bastoni vengono dai tronchi: senza questa riga "crafta stick" falliva con "manca #assi" invece di andare a far legna
  "#assi": { tipo: "raccogli", blocco: "legna" }, "minecraft:stick": { tipo: "raccogli", blocco: "legna" },
};
function rinvia(c, ingrediente, quantita) {
  const pre = PREREQ[ingrediente];
  if (!pre || (c.prereq ?? 0) >= 3) return false;
  // di notte nel rifugio non si esce a cercare legna o animali (4 morti in 2 minuti andando a prendere tronchi per le torce)
  if (c.routine === "notte_sicura" && (pre.tipo === "raccogli" || pre.tipo === "caccia")) return false;
  // di notte, da solo, nessun lavoro "sicuro" manda fuori a prendere il materiale che manca (10/11: con l'armatura di rame
  // appena fatta, deposito e fattoria di notte lo hanno mandato a legna ed erba: ucciso da uno scheletro e da un creeper)
  const ora = world.getTimeOfDay?.() ?? 0;
  if (ora >= 12500 && ora < 23000 && !giocatoriVeri().length && (pre.tipo === "raccogli" || pre.tipo === "caccia")) return false;
  const { stato, t, ...orig } = c;
  orig.prereq = (orig.prereq ?? 0) + 1;
  const q = pre.tipo === "caccia" ? Math.max(1, Math.ceil(quantita / 2)) : Math.max(1, quantita);
  const passo = { ...pre, quantita: q, prereq: orig.prereq, ...(c.routine ? { routine: c.routine } : {}) };
  mem.coda.unshift(passo, orig);
  evento(`Prima mi procuro ${ingrediente.replace("minecraft:", "")}: ${pre.tipo} ${pre.blocco ?? pre.oggetto} x${q}`);
  mem.compito = null;
  return true;
}

// ---------- compiti ----------
// Interrompe il compito in corso come fallito (es. dopo un salvataggio da caduta o annegamento).
export const interrompi = (msg) => finito(false, msg);
// routine -> tick dell'ultimo fallimento: il piano gratis non la riprova per 10 minuti
export const routineKo = new Map();
// 2.8.70: i fallimenti si ricordano anche dopo reload e riavvii (la Map qui sopra si svuota a ogni aggiornamento: il 10/11,
// con 14 aggiornamenti, il pilota ha riprovato le stesse routine fallite tutto il giorno) e l'attesa raddoppia a ogni
// fallimento di fila: 10, 20, 40, 80 minuti, al massimo 2 ore. Un successo azzera. Il riparo della notte non si mette mai in pausa.
export const routineInPausa = (nome) => {
  const k = nome === "notte_sicura" ? null : mem.routineKo?.[nome];
  return !!k && Date.now() - k.t < Math.min(120, 10 * 2 ** (k.n - 1)) * 60000;
};
export const zonaDi = (p) => `${Math.floor(p.x / 64)},${Math.floor(p.z / 64)}`;

// Prestazioni del server: main.js misura i TPS; se il server rallenta il bot alleggerisce le scansioni.
export const prestazioni = { tps: 20, lento: false };

// Zone pericolose: dove è morto o è stato salvato. Esplorare, scavare e raccogliere le evitano (prima c'erano solo
// le lezioni scritte, e a volte le ignorava: è morto 3 volte nella stessa grotta).
export function segnaPericolo(p, raggio, motivo) {
  mem.pericoli = (mem.pericoli ?? []).filter((z) => dist(z, p) > 6);
  mem.pericoli.push({ x: Math.round(p.x), y: Math.round(p.y), z: Math.round(p.z), r: raggio, motivo: String(motivo).slice(0, 60), t: Date.now() });
  if (mem.pericoli.length > 20) mem.pericoli.shift();
}
// Le zone nate da un salvataggio (caduta, soffocamento) scadono dopo 3 ore: non sono morti, e restando per sempre
// nascondevano i boschi (10/11: 9 zone "grotta" su 20 erano alberi da cui il bot era caduto, legna "trovati 0").
const SCADE = /grotta|soffocamento/;
// Le morti per mostri scadono dopo 30 minuti: il mostro si sposta, il posto non è pericoloso in sé. Restando per sempre
// chiudevano la zona di casa (10/11: zona "zombie" r12 proprio sulla casa: lì intorno niente erba, legna né tana).
const MOSTRO = /entityAttack|projectile|[Ee]xplosion|magic/;
const scaduta = (z) => { const eta = Date.now() - (z.t ?? 0), m = z.motivo ?? ""; return (SCADE.test(m) && eta > 3 * 3600000) || (MOSTRO.test(m) && eta > 30 * 60000); };
export const inPericolo = (p) => (mem.pericoli ?? []).some((z) => Math.hypot(z.x - p.x, z.z - p.z) <= z.r && Math.abs(z.y - p.y) <= z.r && !scaduta(z));

// Lezioni scritte dal codice (gratis): alla soglia-esima volta che succede la stessa cosa diventa una regola.
// La riflessione giornaliera di Opus le fonde poi con le lezioni vere.
export function lezioneAuto(chiave, testo, soglia = 3) {
  const k = (mem.contaKo ??= {});
  if (Object.keys(k).length > 300) mem.contaKo = {};
  mem.contaKo[chiave] = (mem.contaKo[chiave] ?? 0) + 1;
  if (mem.contaKo[chiave] !== soglia) return;
  mem.lezioniAuto = [...(mem.lezioniAuto ?? []).filter((l) => l !== testo), testo].slice(-15);
  evento(`Lezione automatica: ${testo}`);
}

function finito(ok, msg) {
  const c = mem.compito;
  if (!c) return;
  const testo = `Compito ${c.tipo} ${ok ? "completato" : "fallito"}: ${msg}`;
  mem.ultimoCompito = `${c.tipo}${c.blocco ?? c.oggetto ?? c.nome ?? c.minerale ? " " + (c.blocco ?? c.oggetto ?? c.nome ?? c.minerale) : ""} (${ok ? "riuscito" : "fallito"}: ${String(msg).slice(0, 80)})`;
  if (ok) sessione.compitiOk++; else sessione.compitiKo.push(`${c.tipo}: ${msg}`);
  const esp = (mem.esperienza[c.tipo] ??= { ok: 0, ko: 0 });
  // "servono tronchi", "non ho...": non è un'abilità fallita ma un ingrediente mancante, si conta a parte
  const mancanza = !ok && /^(serv|manc|non ho|niente da)/i.test(String(msg));
  if (ok) esp.ok++; else if (mancanza) { esp.mancanze = (esp.mancanze ?? 0) + 1; esp.ultimaMancanza = msg; } else { esp.ko++; esp.ultimoErrore = msg; }
  if (ok && c.luogoFinale?.nome) { mem.luoghi[c.luogoFinale.nome] = c.luogoFinale.p; evento(`Nuovo luogo: ${c.luogoFinale.nome} a ${c.luogoFinale.p.x},${c.luogoFinale.p.y},${c.luogoFinale.p.z}`); }
  evento(testo);
  // il successo si segnala al cervello solo a piano finito: il prossimo passo è già in coda
  // ordine di un giocatore eseguito: torna libero di fare ciò che è utile (segui/fermo sono modalità, restano)
  if (ok && !["autonomia", "piano"].includes(c.da) && !["segui", "fermo"].includes(c.tipo) && !mem.coda?.length) mem.modalita = "autonomo";
  // passo di una routine fallito: i passi successivi dipendono da questo (fondi senza minerali, crafta senza lingotti),
  // quindi si scartano. Di notte ne fallivano 5-6 di fila ogni minuto, 1131 fallimenti in 3 ore.
  if (!ok && c.routine) {
    routineKo.set(c.routine, tick());
    (mem.routineKo ??= {})[c.routine] = { t: Date.now(), n: (mem.routineKo[c.routine]?.n ?? 0) + 1 };
  }
  if (ok && c.routine && mem.routineKo?.[c.routine] && !mem.coda?.some((x) => x.routine === c.routine)) delete mem.routineKo[c.routine];
  // statistiche gratis: una routine riesce se finisce tutti i passi, fallisce al primo passo fallito; per zona di 64x64 blocchi
  if (c.routine && (!ok || !mem.coda?.some((x) => x.routine === c.routine))) {
    const st = ((mem.statRoutine ??= {})[c.routine] ??= { ok: 0, ko: 0, zone: {} });
    const z = (st.zone[zonaDi(mem.pos ?? { x: 0, z: 0 })] ??= { ok: 0, ko: 0 });
    if (ok) { st.ok++; z.ok++; } else { st.ko++; z.ko++; }
    const chiavi = Object.keys(st.zone);
    if (chiavi.length > 20) delete st.zone[chiavi[0]];
  }
  if (!ok && c.routine && mem.coda?.length) {
    const prima = mem.coda.length;
    mem.coda = mem.coda.filter((x) => x.routine !== c.routine);
    if (mem.coda.length < prima) evento(`Routine ${c.routine} interrotta: saltati ${prima - mem.coda.length} passi`);
  }
  // con giocatori online l'errore lo analizza l'IA; offline la lezione la scrive il codice (modalità zero: niente chiamate)
  if (!ok && giocatoriVeri().length) avvisa(`${testo} (capisci perché e scrivi una lezione per non ripeterlo)`);
  else if (!ok) {
    const pos = mem.pos ?? { x: 0, z: 0 };
    const cosa = `${c.tipo}${c.blocco ?? c.oggetto ?? c.nome ?? c.minerale ? " " + (c.blocco ?? c.oggetto ?? c.nome ?? c.minerale) : ""}`;
    lezioneAuto(`${cosa}|${String(msg).replace(/-?\d+/g, "N").slice(0, 60)}|${zonaDi(pos)}`,
      `${cosa} fallisce spesso vicino a ${Math.round(pos.x)},${Math.round(pos.z)}: "${String(msg).slice(0, 90)}". Fallo altrove o in un altro modo.`, 3);
  }
  // successo a piano finito: niente chiamata API, il prossimo piano lo sceglie il ciclo del cervello (spesso gratis)
  mem.compito = null;
}

// prima posizione sopra l, con piedi e testa liberi (aria o erba), entro 24 blocchi
export function ariaSopra(dim, l) {
  const x = Math.floor(l.x), z = Math.floor(l.z), passa = (b) => !!b && (b.isAir || /short_grass|tall_grass|fern|flower|snow_layer/.test(b.typeId));
  for (let y = Math.floor(l.y + 0.5); y < Math.min(dim.heightRange.max - 2, l.y + 24); y++)
    if (passa(dim.getBlock({ x, y, z })) && passa(dim.getBlock({ x, y: y + 1, z }))) return { x, y, z };
  return null;
}

// Terreno su cui stare in piedi a x,z: scende sotto chiome e tronchi; dice se in superficie c'è acqua o lava.
export function suolo(dim, x, z) {
  let b;
  try { b = dim.getTopmostBlock({ x, z }); } catch { return null; }
  if (!b) return null;
  let y = b.location.y;
  for (let i = 0; i < 30; i++) {
    const t = dim.getBlock({ x, y, z });
    if (!t || !(t.isAir || /leaves|_log$|vine|snow_layer|short_grass|tall_grass|fern|flower|bush/.test(t.typeId))) break;
    y--;
  }
  if (y + 2 >= dim.heightRange.max || y < dim.heightRange.min) return null; // mai un punto al tetto o sotto il fondo del mondo
  const t = dim.getBlock({ x, y, z });
  // getTopmostBlock può saltare l'acqua e dare il fondale: si controllano anche le due celle sopra il terreno
  // (il bot veniva "salvato" sul fondo del lago e annegava: 3 morti in un'ora)
  const bagnato = (b) => !!b && (b.isLiquid || /water|lava/.test(b.typeId));
  return { x, y: y + 1, z, liquido: bagnato(t) || bagnato(dim.getBlock({ x, y: y + 1, z })) || bagnato(dim.getBlock({ x, y: y + 2, z })) };
}

// Categorie delle casse del deposito organizzato.
const CATEGORIE_CASSE = ["minerali", "cibo", "legna", "blocchi", "varie"];
export function categoriaCassa(id) {
  const n = id.replace("minecraft:", "");
  if (/_ore$|ingot|^raw_|diamond$|emerald$|^coal$|charcoal|redstone|lapis|quartz|nugget|amethyst_shard/.test(n)) return "minerali";
  if (CIBO[id] || /beef|porkchop|mutton|chicken|^cod$|salmon|rabbit$|wheat|carrot|potato|seeds|apple|bread|melon|pumpkin|beetroot|sugar|egg$/.test(n)) return "cibo";
  if (/_log$|_wood$|planks|^stick$|sapling|_stem$|hyphae/.test(n)) return "legna";
  if (/stone|cobble|dirt|deepslate|diorite|granite|andesite|sand|gravel|tuff|glass|brick|clay|calcite|mud/.test(n)) return "blocchi";
  return "varie";
}

// Alberi rinnovabili: tagliato il tronco più basso, ripianta un alberello dello stesso tipo (o uno qualsiasi che ha).
const ALBERELLI = ["oak", "birch", "spruce", "jungle", "acacia", "dark_oak", "cherry"].map((t) => `minecraft:${t}_sapling`);
function ripianta(bot, p, tronco) {
  const sotto = bot.dimension.getBlock({ x: p.x, y: p.y - 1, z: p.z });
  if (!sotto || !/dirt|grass_block|podzol|moss_block/.test(sotto.typeId)) return;
  const tipo = tronco.replace("minecraft:", "").replace(/^stripped_/, "").replace(/_log$/, "");
  const scelta = [`minecraft:${tipo}_sapling`, ...ALBERELLI].find((s) => contaOggetti(bot, s) > 0);
  // l'alberello non va protetto: il tronco che crescerà lì deve restare tagliabile
  if (scelta && piazza(bot, p, scelta) === "ok") protetti.delete(chiaveBlocco(bot.dimension, p));
}

function posDa(c, bot) {
  return Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.z) ? { x: Math.floor(c.x), y: Math.floor(c.y), z: Math.floor(c.z) } : pav(bot.location);
}

function filtroBlocco(nome) {
  const n = String(nome).toLowerCase().replace("minecraft:", "");
  if (n === "legna" || n === "legno" || n === "tronco") return (id) => /_log$|_stem$/.test(id);
  if (n === "pietra" || n === "cobblestone" || n === "stone") return (id) => id === "minecraft:stone" || id === "minecraft:deepslate" || id === "minecraft:cobblestone";
  return (id) => id.replace("minecraft:", "").includes(n);
}

// Cerca vicino a casa uno spiazzo piano e asciutto di lato x lato, lontano dagli altri luoghi del bot
// (casetta, bosco, fattoria, deposito) e dalle costruzioni dei giocatori. null se non c'è.
export function trovaSpiazzo(dim, casa, lato, giaUsati = []) {
  for (const k of Object.keys(motiviSpiazzo)) motiviSpiazzo[k] = 0;
  // anelli da 8 a 48 blocchi in 8 direzioni (casa sul lago: a est e a sud è tutta acqua); gli alberi si tagliano costruendo. con 12 posti fissi vicino alla casa (collina, acqua, base del giocatore)
  // deposito e bosco fallivano sempre con "nessuno spiazzo libero"
  const posti = [];
  for (let r = 8; r <= 48; r += 4) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) posti.push([a * r, b * r]);
  for (const [dx, dz] of posti) {
    const x0 = casa.x + dx, z0 = casa.z + dz;
    const angoli = [[0, 0], [lato - 1, 0], [0, lato - 1], [lato - 1, lato - 1], [Math.floor(lato / 2), Math.floor(lato / 2)]].map(([a, b]) => suolo(dim, x0 + a, z0 + b));
    // i pericoli da mostri (morti per scheletri vicino a casa) non rendono il terreno inadatto: solo grotte, acqua, soffocamento
    const pericoloso = (g) => (mem.pericoli ?? []).some((z) => !/entityAttack|projectile|Explosion/.test(z.motivo ?? "") && Math.hypot(z.x - g.x, z.z - g.z) <= z.r && Math.abs(z.y - g.y) <= z.r);
    if (angoli.some((g) => !g)) { motiviSpiazzo.scarico++; continue; }
    if (angoli.some((g) => g.liquido)) { motiviSpiazzo.acqua++; continue; }
    if (angoli.some(pericoloso)) { motiviSpiazzo.pericolo++; continue; }
    const ys = angoli.map((g) => g.y);
    if (Math.max(...ys) - Math.min(...ys) > 3) { motiviSpiazzo.pendenza++; continue; } // fino a 3 blocchi si spiana costruendo
    const centroSp = { x: x0 + lato / 2, z: z0 + lato / 2 };
    if (giaUsati.some((p) => p && Math.hypot(p.x - centroSp.x, p.z - centroSp.z) < lato + 4)) { motiviSpiazzo.usato++; continue; }
    // niente blocchi dei giocatori o del bot sopra il terreno nello spiazzo (non costruisce in casa tua)
    let occupato = false;
    for (let a = 0; a < lato && !occupato; a++) for (let b = 0; b < lato && !occupato; b++) {
      const blk = dim.getBlock({ x: x0 + a, y: Math.min(...ys), z: z0 + b });
      // occupato solo da costruzioni: blocchi registrati come piazzati (tuoi o del bot) o chiaramente fatti a mano.
      // Elencare i blocchi naturali non bastava: ne escono di nuovi (leaf_litter) e ogni posto risultava occupato
      const pos = { x: x0 + a, y: Math.min(...ys), z: z0 + b };
      if (blk && !blk.isAir && (protetti.has(chiaveBlocco(dim, pos)) || COSTRUITO.test(blk.typeId))) { occupato = true; esempioOccupato = blk.typeId.replace("minecraft:", ""); }
    }
    if (!occupato) return { x: x0, y: Math.min(...ys), z: z0 };
    motiviSpiazzo.occupato++;
  }
  return null;
}
// perché non ha trovato posto (per il rapporto: "nessuno spiazzo" da solo non diceva niente)
export const motiviSpiazzo = { scarico: 0, acqua: 0, pericolo: 0, pendenza: 0, usato: 0, occupato: 0 };
let esempioOccupato = "";
const COSTRUITO = /planks|cobblestone|brick|glass|chest|door|fence|slab|stairs|wool|_bed$|torch|furnace|crafting_table|farmland|_wall$|carpet|concrete|lantern|barrel|ladder|sign|smooth|polished|rail|hay_block|composter|campfire/;
const perche = () => (Object.entries(motiviSpiazzo).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(", ") || "nessun posto provato") + (esempioOccupato ? `; occupato per esempio da ${esempioOccupato}` : "");
// Lontano da casa i chunk non sono caricati e trovaSpiazzo dava sempre null ("nessuno spiazzo libero"): prima ci va.
function arrivaACasa(bot, casa) {
  if (dist(bot.location, casa) <= 40) return true;
  const r = vaiVerso(bot, { x: casa.x + 0.5, y: casa.y, z: casa.z + 0.5 }, 3);
  if (r === "bloccato") { bot.teleport({ x: casa.x + 0.5, y: casa.y + 1, z: casa.z + 0.5 }); nav.meta = null; nav.bloccato = 0; }
  return false;
}
// blocchi pieni intercambiabili per muri e tetti
const RIEMPITIVI = ["minecraft:cobblestone", "minecraft:cobbled_deepslate", "minecraft:stone", "minecraft:granite", "minecraft:diorite", "minecraft:andesite",
  "minecraft:tuff", "minecraft:sandstone", "minecraft:netherrack", "minecraft:dirt", "minecraft:oak_planks", "minecraft:spruce_planks", "minecraft:birch_planks"];
const luoghiBot = () => ["casetta", "bosco", "fattoria", "deposito", "fornace"].map((n) => mem.luoghi[n]);

// 2.8.23: base in palude (annegamenti e drowned ripetuti intorno a casa): di giorno sposta la casa in uno spiazzo
// asciutto ad almeno 13 blocchi da ogni punto dove è annegato. La vecchia resta come casa_palude.
const ACQUA_MORTALE = /annega|drowning|drowned|acqua/;
export function spostaBaseSeAllagata(bot) {
  const casa = mem.luoghi.casa;
  if (!casa || dist(bot.location, casa) > 40) return false; // lontano i chunk non sono caricati
  if (Date.now() - (mem.ultimoControlloBase ?? 0) < 30 * 60000) return false;
  mem.ultimoControlloBase = Date.now();
  // 2.8.24: contano solo le zone nate dopo l'ultimo spostamento, altrimenti le vecchie della palude (entro 48 blocchi)
  // facevano saltare la casa di nuovo ogni 30 minuti, cancellando ogni volta i luoghi ricostruiti
  const bagnati = (mem.pericoli ?? []).filter((z) => ACQUA_MORTALE.test(z.motivo ?? "") && Math.hypot(z.x - casa.x, z.z - casa.z) <= 40 && (z.t ?? 1) > (mem.casaSpostataT ?? 0));
  if (bagnati.length < 4) return false;
  const sp = trovaSpiazzo(bot.dimension, casa, 9, [...luoghiBot(), ...bagnati]);
  if (!sp) { evento(`Casa in palude (${bagnati.length} zone d'acqua mortali) ma nessuno spiazzo asciutto entro 48 blocchi (${perche()})`); return false; }
  mem.luoghi.casa_palude = { ...casa, nota: "vecchia casa in palude" };
  mem.luoghi.casa = { x: sp.x + 4, y: sp.y, z: sp.z + 4, nota: "casa spostata all'asciutto dal bot" };
  mem.casaSpostataT = Date.now();
  // casetta, deposito, bosco, fornace si rifanno accanto alla casa nuova; la fattoria no: funziona (92%) e di giorno
  // ci si lavora lo stesso, rifarla da zero buttava raccolti e semi
  for (const n of ["casetta", "deposito", "bosco", "fornace", "muro_base"]) delete mem.luoghi[n];
  evento(`Casa spostata fuori dalla palude: da ${casa.x},${casa.y},${casa.z} a ${mem.luoghi.casa.x},${mem.luoghi.casa.y},${mem.luoghi.casa.z}`);
  return true;
}

const ESECUTORI = {
  vai(bot, c) {
    const meta = posDa(c, bot);
    const r = vaiVerso(bot, meta, 2);
    if (r === true) finito(true, "arrivato");
    else if (r === "bloccato") {
      bot.teleport(centro(meta)); // come un animale addomesticato che raggiunge il padrone
      nav.meta = null; nav.bloccato = 0;
      finito(true, "arrivato (percorso bloccato, mi sono teletrasportato)");
    }
  },

  segui(bot, c) {
    const p = giocatore(c.giocatore || mem.bersaglio || mem.proprietario);
    if (!p) return finito(false, "giocatore non trovato");
    mem.modalita = "segui"; mem.bersaglio = p.name;
    finito(true, `seguo ${p.name}`);
  },

  fermo(bot) { bot.stopMoving(); mem.modalita = "fermo"; finito(true, "resto fermo"); },

  equipaggia(bot) { indossaArmatura(bot); finito(true, "equipaggiamento sistemato"); },

  raccogli(bot, c) {
    const s = c.stato;
    const filtro = filtroBlocco(c.blocco);
    s.fatti ??= 0;
    if (s.fatti >= (c.quantita ?? 8)) return finito(true, `${s.fatti} blocchi di ${c.blocco}`);
    if (s.pausa > 0) { s.pausa--; return; }
    if (s.esplora) {
      const r = vaiVerso(bot, s.esplora, 3);
      if (r === "bloccato") {
        // percorso bloccato: raggiunge il punto saltando sul terreno sicuro lì (prima restava fermo e falliva)
        const g = accanto(bot.dimension, s.esplora);
        if (g) { bot.teleport(centro(g)); nav.meta = null; nav.bloccato = 0; }
      }
      if (r === true || r === "bloccato") s.esplora = null;
      return;
    }
    if (s.galleria) {
      // scava una galleria alta 2 verso il minerale chiuso nella roccia
      const g = s.galleria;
      if (dist(centro(g), bot.location) <= 4.5) { s.lista = [g]; s.galleria = null; s.galleriaProvata = false; return; }
      if ((s.passiGalleria = (s.passiGalleria ?? 0) + 1) > 400) { s.galleria = null; s.giri = (s.giri ?? 0) + 1; return; }
      const p = pav(bot.location);
      const dx = g.x - p.x, dz = g.z - p.z;
      const passo = Math.abs(dx) >= Math.abs(dz) ? { x: Math.sign(dx), y: 0, z: 0 } : { x: 0, y: 0, z: Math.sign(dz) };
      if (g.y < p.y) passo.y = -1; // scende a scala
      else if (g.y > p.y + 1) passo.y = 1;
      const avanti = somma(p, passo);
      for (const cella of [avanti, somma(avanti, { x: 0, y: 1, z: 0 }), ...(passo.y ? [somma(avanti, { x: 0, y: 2, z: 0 })] : [])]) {
        const blk = bot.dimension.getBlock(cella);
        if (!blk || blk.isAir) continue;
        if (blk.typeId.includes("lava")) { s.galleria = null; return finito(false, `lava sulla strada verso ${c.blocco}: mi fermo per sicurezza`); }
        if (blk.isLiquid) continue;
        const id = blk.typeId;
        const esito = scava(bot, cella);
        if (esito === "protetto" || esito === "attrezzo") { s.galleria = null; s.giri = (s.giri ?? 0) + 1; return; }
        if (esito === "ok") { s.pausa = attesaScavo(id, bot); return; }
      }
      if (vaiVerso(bot, centro(avanti), 0.8) === "bloccato") { bot.teleport(centro(avanti)); nav.meta = null; nav.bloccato = 0; }
      return;
    }
    if (!s.lista?.length) {
      // solo blocchi raggiungibili: all'aria aperta o già a portata di braccio (si scava verso il basso)
      const vicino = (b) => dist(centro(b.location), bot.location) <= 4.5;
      // all'aria ma non a contatto con l'acqua: due volte è annegato inseguendo pietra sott'acqua
      const esposto = (b) => { const v = [b.above(), b.below(), b.north(), b.south(), b.east(), b.west()]; return v.some((n) => n?.isAir) && !v.some((n) => n?.typeId.includes("water")); };
      // raggio 12x6 (~8.000 blocchi): 20x10 erano 35.000 controlli in un tick e il server laggava
      // i blocchi già provati senza riuscire ad arrivarci non si riprovano (10 minuti persi sullo stesso tronco alto)
      const fuori = new Set(s.fuori ?? []);
      s.lista = cercaBlocchi(bot, (b) => filtro(b.typeId) && !protetto(bot, b) && (vicino(b) || esposto(b)) && !inPericolo(b.location)
        && !fuori.has(`${b.location.x},${b.location.y},${b.location.z}`), 12, 6);
      // minerali chiusi nella roccia: ci si arriva scavando una galleria
      if (!s.lista.length && /_ore$|ancient_debris/.test(`minecraft:${String(c.blocco).replace("minecraft:", "")}`) && !s.galleriaProvata) {
        const chiuso = cercaBlocchi(bot, (b) => filtro(b.typeId) && !protetto(bot, b) && !inPericolo(b.location), 12, 8, 1)[0];
        if (chiuso) { s.galleria = chiuso; s.galleriaProvata = true; s.passiGalleria = 0; evento(`Scavo una galleria verso ${c.blocco} a ${chiuso.x},${chiuso.y},${chiuso.z}`); return; }
      }
      if (!s.lista.length) {
        // prima prova i posti dove l'aveva visto (mappa delle risorse); un posto visitato a vuoto si dimentica
        const cat = categoriaRisorsa(c.blocco);
        if (s.daMappa) { dimenticaRisorsa(cat, s.daMappa); (s.escluse ??= []).push(s.daMappa); s.daMappa = null; }
        const nota = risorsaVicina(bot, cat, s.escluse ?? []);
        if (nota && dist(nota, bot.location) > 6) {
          s.esplora = nota; s.daMappa = nota;
          evento(`Vado a ${c.blocco} che avevo visto a ${nota.x},${nota.y},${nota.z}`);
          return;
        }
        s.giri = (s.giri ?? 0) + 1;
        if (s.giri > 4) return finito(s.fatti > 0, `trovati solo ${s.fatti} blocchi di ${c.blocco}`);
        const a = Math.random() * Math.PI * 2;
        s.esplora = { x: Math.floor(bot.location.x + Math.cos(a) * 32), y: Math.floor(bot.location.y), z: Math.floor(bot.location.z + Math.sin(a) * 32) };
        return;
      }
    }
    const t = s.lista[0];
    const b = bot.dimension.getBlock(t);
    if (!b || !filtro(b.typeId)) { s.lista.shift(); return; }
    if (s.bersaglio !== `${t.x},${t.y},${t.z}`) { s.bersaglio = `${t.x},${t.y},${t.z}`; s.tBersaglio = tick(); }
    // tronco alto sopra la testa: da sotto è a portata di braccio anche se in linea d'aria dista più di 4
    const daSotto = Math.hypot(t.x + 0.5 - bot.location.x, t.z + 0.5 - bot.location.z) <= 2.5 && t.y - bot.location.y > 0 && t.y - bot.location.y <= 5.5;
    const r = daSotto ? true : vaiVerso(bot, centro(t), 4);
    // 10 secondi per raggiungere un blocco, poi passa al prossimo e svuota la lista per ricercare da dove si trova
    if (r === "bloccato" || (r !== true && tick() - s.tBersaglio > 200)) { (s.fuori ??= []).push(s.bersaglio); if (s.fuori.length > 40) s.fuori.shift(); s.lista = []; nav.meta = null; nav.bloccato = 0; return; }
    if (r !== true) return;
    const id = b.typeId;
    const esito = scava(bot, t);
    if (esito === "attrezzo") return finito(false, `serve un piccone migliore per ${id.replace("minecraft:", "")}`);
    if (esito === "ok") { s.fatti++; s.pausa = attesaScavo(id, bot); if (/_log$/.test(id)) ripianta(bot, t, id); }
    s.lista.shift();
  },

  miniera_scala(bot, c) { scavoGuidato(bot, c, "scala"); },

  // miniera a rami: scende con una scala alla quota migliore per il minerale, poi scava un pettine di gallerie
  // (corridoio principale e rami laterali ogni 4 blocchi) e torna a casa. Tutto in coda, senza chiamare l'IA.
  miniera_rami(bot, c) {
    const QUOTE = { diamanti: -58, diamante: -58, diamond_ore: -58, redstone: -58, redstone_ore: -58, ferro: 16, iron_ore: 16,
      rame: 48, copper_ore: 48, carbone: 40, coal_ore: 40, oro: -16, gold_ore: -16, lapis: 0, lapis_ore: 0 };
    const chiave = String(c.minerale ?? c.blocco ?? "ferro").toLowerCase().replace("minecraft:", "");
    const quota = QUOTE[chiave] ?? 16;
    if (quota < 0 && !contaOggetti(bot, (id) => /(iron|diamond|netherite)_pickaxe$/.test(id))) return finito(false, `per scendere a y ${quota} serve un piccone di ferro`);
    const giro = ["nord", "est", "sud", "ovest"];
    const libera = (dir) => { const v = DIREZIONI[dir]; return !inPericolo({ x: bot.location.x + v.x * 20, y: quota, z: bot.location.z + v.z * 20 }) && !inPericolo({ x: bot.location.x, y: quota, z: bot.location.z }); };
    if (!giro.some(libera)) return finito(false, "zona pericolosa (grotte o acqua dove sono già morto): mino altrove");
    const d = giro.includes(c.direzione) && libera(c.direzione) ? c.direzione : giro.filter(libera)[Math.floor(Math.random() * giro.filter(libera).length)];
    const sx = giro[(giro.indexOf(d) + 3) % 4], dx = giro[(giro.indexOf(d) + 1) % 4];
    const y = Math.floor(bot.location.y);
    const passi = [];
    if (y - quota > 2) passi.push({ tipo: "miniera_scala", direzione: d, profondita: Math.min(120, y - quota) });
    for (let r = 0; r < 4; r++) passi.push({ tipo: "tunnel", direzione: d, lunghezza: 4 }, { tipo: "tunnel", direzione: sx, lunghezza: 12 }, { tipo: "tunnel", direzione: dx, lunghezza: 24 }, { tipo: "tunnel", direzione: sx, lunghezza: 12 });
    if (mem.luoghi.casa) passi.push({ tipo: "vai", x: mem.luoghi.casa.x, y: mem.luoghi.casa.y, z: mem.luoghi.casa.z });
    const nome = c.routine ?? `miniera_${chiave}`;
    mem.coda.unshift(...passi.map((p) => ({ ...p, routine: nome })));
    finito(true, `miniera a rami per ${chiave}: scendo a y ${quota} verso ${d}, ${passi.length} passi`);
  },
  tunnel(bot, c) { scavoGuidato(bot, c, "tunnel"); },

  scava_area(bot, c) {
    const s = c.stato;
    const a = posDa(c, bot);
    const b = { x: Math.floor(c.x2 ?? a.x), y: Math.floor(c.y2 ?? a.y), z: Math.floor(c.z2 ?? a.z) };
    const min = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) };
    const max = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) };
    const lx = max.x - min.x + 1, lz = max.z - min.z + 1, tot = lx * lz * (max.y - min.y + 1);
    if (tot > 4000) return finito(false, "area troppo grande (max 4000 blocchi)");
    s.i ??= 0;
    if (s.pausa > 0) { s.pausa--; return; }
    let saltati = 0; // al massimo 8 percorsi bloccati per tick: ognuno è un calcolo di percorso (watchdog)
    for (; s.i < tot; s.i++) {
      const strato = Math.floor(s.i / (lx * lz)), resto = s.i % (lx * lz);
      const p = { x: min.x + (resto % lx), y: max.y - strato, z: min.z + Math.floor(resto / lx) };
      const blk = bot.dimension.getBlock(p);
      if (!blk || blk.isAir || blk.isLiquid) continue;
      if (!c.forza && protetto(bot, blk)) continue;
      const r = vaiVerso(bot, centro(p), 4.5);
      if (r === "bloccato") { if (++saltati > 8) { s.i++; return; } continue; }
      if (r !== true) return;
      const id = blk.typeId;
      const esito = scava(bot, p, c.forza);
      if (esito === "attrezzo") { s.saltati = (s.saltati ?? 0) + 1; continue; }
      s.pausa = attesaScavo(id, bot);
      s.i++;
      return;
    }
    finito(true, `area scavata${s.saltati ? `, ${s.saltati} blocchi saltati (attrezzo inadatto)` : ""}`);
  },

  costruisci(bot, c) {
    const s = c.stato;
    if (!Array.isArray(c.blocchi) || !c.blocchi.length) return finito(false, "progetto vuoto");
    const o = posDa(c, bot);
    if (!s.ordinati) {
      c.blocchi.sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[2] - b[2]);
      s.ordinati = true; s.i = 0; s.mancanti = {}; s.rimasti = [];
    }
    if (s.pausa > 0) { s.pausa--; return; }
    let saltati = 0; // al massimo 8 blocchi irraggiungibili per tick: 36 s di blocco hanno fatto crashare il server
    while (s.i < c.blocchi.length) {
      const [dx, dy, dz, id] = c.blocchi[s.i];
      const p = { x: o.x + dx, y: o.y + dy, z: o.z + dz };
      const r = vaiVerso(bot, centro(p), 4.5);
      if (r === "bloccato") { s.rimasti.push(c.blocchi[s.i]); s.i++; if (++saltati > 8) return; continue; }
      if (r !== true) return;
      let esito = piazza(bot, p, id);
      if (esito === "occupato") {
        const blk = bot.dimension.getBlock(p);
        if (blk && !protetto(bot, blk) && scava(bot, p) === "ok") esito = piazza(bot, p, id);
      }
      // finita la pietra si usa un altro blocco pieno che ha in tasca (rifugio notturno fallito con 63 graniti e 25 dioriti: 4 morti)
      if (esito === "manca" && RIEMPITIVI.includes(id)) {
        const alt = RIEMPITIVI.find((a) => a !== id && contaOggetti(bot, a) > 0);
        if (alt) esito = piazza(bot, p, alt);
      }
      if (esito === "manca") { conta(s.mancanti, id); s.rimasti.push(c.blocchi[s.i]); }
      // c'è qualcuno nella cella: riprova alla fine, intanto il bot o il giocatore si saranno spostati.
      // Limite fisso e uscita dal ciclo: col limite legato alla lista che cresceva il ciclo non finiva (crash del watchdog).
      if (esito === "giocatore") {
        s.maxRinvii ??= c.blocchi.length;
        if ((s.rinvii = (s.rinvii ?? 0) + 1) <= s.maxRinvii) c.blocchi.push(c.blocchi[s.i]);
        else s.rimasti.push(c.blocchi[s.i]);
        const f = pav(bot.location);
        if (f.x === o.x + dx && f.z === o.z + dz) bot.teleport({ x: o.x - 1.5, y: o.y + 1, z: o.z + dz + 0.5 }); // il bot esce dalla cella
        s.i++;
        return;
      }
      s.i++;
      if (esito === "ok") { s.pausa = 3; return; }
    }
    const mancano = Object.entries(s.mancanti).map(([k, v]) => `${k} x${v}`).join(", ");
    if (!s.rimasti.length) {
      // progetto dell'architetto riuscito: lo salva per riusarlo gratis (dedup: i blocchi rinviati sono doppioni)
      const unici = [...new Map(c.blocchi.map((b) => [`${b[0]},${b[1]},${b[2]}`, b])).values()];
      const nome = c.nome_schema && salvaSchema(c.nome_schema, unici);
      if (nome) evento(`Schema salvato: ${nome} (${unici.length} blocchi)`);
      // rifugio notturno finito: dentro, al centro, e lì resta fino all'alba (lo costruiva e restava fuori: morto finendolo)
      if (c.routine === "notte_sicura") {
        const xs = unici.map((b) => b[0]), ys = unici.map((b) => b[1]), zs = unici.map((b) => b[2]);
        const dentro = { x: o.x + (Math.min(...xs) + Math.max(...xs)) / 2 + 0.5, y: o.y + Math.min(...ys) + 1, z: o.z + (Math.min(...zs) + Math.max(...zs)) / 2 + 0.5 };
        bot.teleport(dentro);
        mem.rifugio = { x: Math.floor(dentro.x), y: Math.floor(dentro.y), z: Math.floor(dentro.z), ok: true };
        nav.meta = null;
      }
      return finito(true, `costruzione "${c.descrizione ?? "progetto"}" completata${nome ? `, salvata come schema "${nome}"` : ""}`);
    }
    mem.sospesi.push({ tipo: "costruisci", x: o.x, y: o.y, z: o.z, descrizione: c.descrizione, blocchi: s.rimasti, da: c.da });
    finito(false, `costruzione sospesa, mancano: ${mancano || "blocchi irraggiungibili"} (usa riprendi quando hai il materiale)`);
  },

  riprendi(bot, c) {
    const k = Number.isInteger(c.indice) ? c.indice : mem.sospesi.length - 1;
    const sosp = mem.sospesi.splice(k, 1)[0];
    if (!sosp) return finito(false, "nessuna costruzione sospesa");
    mem.compito = { ...sosp, stato: {}, t: tick() };
    evento(`Riprendo la costruzione "${sosp.descrizione ?? "progetto"}"`);
  },

  crafta(bot, c) {
    const [ok, msg] = fabbrica(bot, c.oggetto, c.quantita);
    const m = !ok && msg.match(/manca (#?[\w:]+) \(ne servono (\d+)\)/);
    if (m && rinvia(c, m[1].startsWith("#") ? m[1] : ns(m[1]), Number(m[2]))) return;
    // senza banco e senza assi: un tronco basta (4 assi = banco). Prima l'armatura di rame si fermava qui con 24 lingotti pronti
    if (!ok && msg === "serve un banco da lavoro" && rinvia(c, "#tronco", 1)) return;
    // "crafta iron_ingot" con il ferro grezzo in tasca: si fa in fornace, non al banco
    const grezzo = !ok && Object.keys(FUSIONI).find((k) => FUSIONI[k] === ns(c.oggetto) && !k.startsWith("#") && contaOggetti(bot, k) > 0);
    if (grezzo) {
      mem.coda.unshift({ tipo: "fondi", oggetto: grezzo.replace("minecraft:", ""), quantita: c.quantita ?? 1, ...(c.routine ? { routine: c.routine } : {}) });
      return finito(true, `${ns(c.oggetto).replace("minecraft:", "")} si fa in fornace: fondo ${grezzo.replace("minecraft:", "")}`);
    }
    finito(ok, msg);
  },

  fondi(bot, c) {
    const s = c.stato;
    // "carne": la carne cruda che ha in tasca, qualunque sia (la routine cibo cuoceva solo manzo e maiale: il 10/11
    // aveva montone e pollo crudi e li ha mangiati crudi, un terzo del nutrimento)
    const CRUDE = ["beef", "porkchop", "mutton", "chicken", "rabbit", "cod", "salmon"];
    if (c.oggetto === "carne") {
      const cruda = CRUDE.find((n) => contaOggetti(bot, `minecraft:${n}`) > 0);
      if (!cruda) return finito(false, "non ho carne da cuocere");
      c.oggetto = cruda;
    }
    const o = String(c.oggetto ?? "");
    const ingresso = /^#?tronc|^log$|^legn/.test(o) || GRUPPI["#tronco"](ns(o)) ? "#tronco" : ns(o);
    const uscita = FUSIONI[ingresso];
    if (!uscita) return finito(false, `non so fondere ${c.oggetto}`);
    // niente da fondere: prima lo procura (prima provava lo stesso e falliva, centinaia di volte a notte)
    if (!s.fornace && contaOggetti(bot, ingresso) < 1) {
      if (rinvia(c, ingresso, c.quantita ?? 1)) return;
      return finito(false, `non ho ${ingresso.replace("minecraft:", "")} da fondere`);
    }
    if (!s.fornace) {
      const f = mem.luoghi.fornace;
      let fissa = false;
      try { fissa = !!f && dist(f, bot.location) < 64 && /furnace/.test(bot.dimension.getBlock(f)?.typeId ?? ""); } catch {}
      if (f && !fissa && dist(f, bot.location) < 16) delete mem.luoghi.fornace; // la fornace fissa non c'è più
      s.fornace = fissa ? { x: f.x, y: f.y, z: f.z } : assicuraBlocco(bot, "minecraft:furnace");
      // lontano da casa: se ha 8 pietre se ne fa una al volo
      if (!s.fornace && contaOggetti(bot, "#pietra") >= 8) {
        const [ok, msg] = fabbrica(bot, "minecraft:furnace");
        if (ok) s.fornace = assicuraBlocco(bot, "minecraft:furnace");
        // 81 ciottoli e nessun banco: prima falliva qui per sempre ("serve una fornace"); ora va a prendere un tronco
        else if (msg === "serve un banco da lavoro" && rinvia(c, "#tronco", 1)) return;
      }
      if (!s.fornace && contaOggetti(bot, "#pietra") < 8 && rinvia(c, "#pietra", 8 - contaOggetti(bot, "#pietra"))) return;
      if (!s.fornace) return finito(false, "serve una fornace (o 8 pietre per farne una)");
      s.fatti = 0; s.carica = 0; s.t = tick();
    }
    if (dist(bot.location, s.fornace) > 4) {
      // fornace non raggiunta: strada bloccata, oppure 90 secondi di cammino senza arrivare (mostri, palude, giri a vuoto).
      // Come negli altri compiti ci si porta accanto. Il 10/11 "fondi x2" è stato assegnato a ogni alba per 4 giornate di
      // gioco e non è mai finito in 10 minuti: 2 lingotti di rame mancanti, niente stivali.
      s.partenza ??= tick();
      if (vaiVerso(bot, centro(s.fornace), 3) === "bloccato" || tick() - s.partenza > 1800) {
        const q = accanto(bot.dimension, s.fornace);
        bot.teleport(q ? centro(q) : { x: s.fornace.x + 0.5, y: s.fornace.y + 1, z: s.fornace.z + 0.5 });
        nav.meta = null; nav.bloccato = 0; s.partenza = tick();
        evento("Non arrivavo alla fornace: mi ci porto accanto");
      }
      return;
    }
    if (tick() - s.t < 200) return; // 10 secondi a pezzo
    s.t = tick();
    if (s.fatti >= (c.quantita ?? 1) || contaOggetti(bot, ingresso) < 1) return finito(s.fatti > 0, `fusi ${s.fatti} ${uscita.replace("minecraft:", "")}`);
    if (s.carica <= 0) {
      const comb = COMBUSTIBILI.find(([f]) => contaOggetti(bot, f) > 0 && !(f === ingresso && contaOggetti(bot, f) < 2));
      if (!comb) return finito(s.fatti > 0, `combustibile finito dopo ${s.fatti} pezzi`);
      togli(bot, comb[0], 1); s.carica = comb[1];
    }
    togli(bot, ingresso, 1); aggiungi(bot, uscita, 1);
    s.carica--; s.fatti++;
    conta(sessione.fusi, uscita);
  },

  deposita(bot, c) {
    const s = c.stato;
    s.cassa ??= trovaCassa(bot, c);
    if (!s.cassa) return finito(false, "nessuna cassa trovata");
    const r = vaiVerso(bot, centro(s.cassa), 3);
    if (r === "bloccato") { bot.teleport({ x: s.cassa.x + 0.5, y: s.cassa.y + 1, z: s.cassa.z + 0.5 }); nav.meta = null; nav.bloccato = 0; return; } // sale sulla cassa
    if (r !== true) return;
    const cassa = bot.dimension.getBlock(s.cassa)?.getComponent("minecraft:inventory")?.container;
    if (!cassa) return finito(false, "il blocco non è una cassa");
    const tieni = new Set((c.tieni ?? []).map(ns));
    const migliori = new Set(["pickaxe", "axe", "sword", "shovel"].map((t) => miglioreAttrezzo(bot, t).slot));
    const tenuti = {};
    const ci = inv(bot);
    let spostati = 0;
    for (let i = 0; i < ci.size; i++) {
      const it = ci.getItem(i);
      if (!it || migliori.has(i) || tieni.has(it.typeId) || /_(helmet|chestplate|leggings|boots)$/.test(it.typeId)) continue;
      const limite = CIBO[it.typeId] ? 16 : it.typeId === "minecraft:torch" ? 32 : /crafting_table|furnace/.test(it.typeId) ? 1 : 0;
      if ((tenuti[it.typeId] ?? 0) + it.amount <= limite) { tenuti[it.typeId] = (tenuti[it.typeId] ?? 0) + it.amount; continue; }
      const resto = ci.transferItem(i, cassa);
      spostati += it.amount - (resto?.amount ?? 0);
      if (resto) break; // cassa piena
    }
    mem.luoghi.deposito ??= { ...s.cassa, nota: "cassa del bot" };
    finito(true, `depositati ${spostati} oggetti`);
  },

  prendi(bot, c) {
    const s = c.stato;
    s.cassa ??= trovaCassa(bot, c);
    if (!s.cassa) return finito(false, "nessuna cassa trovata");
    const r = vaiVerso(bot, centro(s.cassa), 3);
    if (r === "bloccato") { bot.teleport({ x: s.cassa.x + 0.5, y: s.cassa.y + 1, z: s.cassa.z + 0.5 }); nav.meta = null; nav.bloccato = 0; return; } // sale sulla cassa
    if (r !== true) return;
    const cassa = bot.dimension.getBlock(s.cassa)?.getComponent("minecraft:inventory")?.container;
    if (!cassa) return finito(false, "il blocco non è una cassa");
    let serve = Math.max(1, c.quantita ?? 64), presi = 0;
    for (let i = 0; i < cassa.size && serve > 0; i++) {
      const it = cassa.getItem(i);
      if (!it || !corrisponde(it.typeId, c.oggetto.startsWith("#") ? c.oggetto : ns(c.oggetto))) continue;
      if (it.amount <= serve) { serve -= it.amount; presi += it.amount; cassa.transferItem(i, inv(bot)); }
      else { aggiungi(bot, it.typeId, serve); it.amount -= serve; cassa.setItem(i, it); presi += serve; serve = 0; }
    }
    indossaArmatura(bot);
    finito(presi > 0, presi ? `presi ${presi} ${c.oggetto}` : `nella cassa non c'è ${c.oggetto}`);
  },

  dai(bot, c) {
    const p = giocatore(c.giocatore || mem.proprietario);
    if (!p) return finito(false, "giocatore non trovato");
    seguiGiocatore(bot, p, 2.5);
    if (dist(bot.location, p.location) > 3) return;
    const id = c.oggetto.startsWith("#") ? c.oggetto : ns(c.oggetto);
    const tolti = togli(bot, id, Math.max(1, c.quantita ?? 1));
    if (!tolti.length) return finito(false, `non ho ${c.oggetto}`);
    const perTipo = {};
    for (const t of tolti) perTipo[t] = (perTipo[t] ?? 0) + 1;
    for (const [t, n] of Object.entries(perTipo)) p.dimension.spawnItem(new ItemStack(t, n), p.location);
    finito(true, `dati ${tolti.length} ${c.oggetto} a ${p.name}`);
  },

  // schema d'azione: espande una sequenza pronta di compiti in testa alla coda, senza chiamare l'API
  routine(bot, c) {
    const passi = ROUTINE[c.nome]?.passi;
    if (!passi) return finito(false, `routine sconosciuta: ${c.nome}`);
    // lingotti già in tasca per il piccone (09/11: 4 lingotti, piccone rotto, e andava a scavare 10 minerali di ferro
    // senza piccone): si crafta subito; i lingotti che mancano per spada e ascia li procura il crafta stesso
    // materiale già in tasca: il passo di raccolta si salta (10/11: sabbia cercata con 31 in tasca, carbone con 54)
    const gia = (p) => p.tipo === "raccogli" && GIA_IN_TASCA[p.blocco] && contaOggetti(bot, GIA_IN_TASCA[p.blocco]) >= (p.quantita ?? 8);
    // pezzi di armatura già addosso o in tasca: non si rifanno (10/11: con corazza e gambali indossati la routine non veniva
    // più scelta e elmo e stivali non arrivavano mai; rifarla intera avrebbe sprecato 15 lingotti in doppioni)
    const POSTO = { helmet: "Head", chestplate: "Chest", leggings: "Legs", boots: "Feet" }, COSTO = { helmet: 5, chestplate: 8, leggings: 7, boots: 4 };
    const pezzo = (p) => (p.tipo === "crafta" ? /_(helmet|chestplate|leggings|boots)$/.exec(p.oggetto ?? "")?.[1] : null);
    const fatto = (p) => !!pezzo(p) && (bot.getComponent("minecraft:equippable")?.getEquipment?.(POSTO[pezzo(p)])?.typeId === ns(p.oggetto) || contaOggetti(bot, ns(p.oggetto)) > 0);
    let lista = (c.nome === "attrezzi_ferro" && contaOggetti(bot, "minecraft:iron_ingot") >= 3 ? passi.filter((p) => p.tipo === "crafta") : passi).filter((p) => !gia(p) && !fatto(p));
    if (c.nome === "armatura_rame") {
      // si fonde solo il rame che manca per i pezzi rimasti
      const serve = lista.reduce((n, p) => n + (COSTO[pezzo(p)] ?? 0), 0) - contaOggetti(bot, "minecraft:copper_ingot");
      lista = lista.filter((p) => p.tipo !== "fondi" || serve > 0).map((p) => (p.tipo === "fondi" ? { ...p, quantita: serve } : p));
    }
    mem.coda.unshift(...lista.map((p) => ({ ...p, routine: c.nome })));
    finito(true, `routine ${c.nome} avviata: ${lista.length} passi`);
  },

  caccia(bot, c) {
    const s = c.stato;
    s.fatti ??= 0;
    const tipo = ns(c.oggetto ?? "cow");
    if (!/cow|pig|sheep|chicken|rabbit|mooshroom|cod|salmon|goat/.test(tipo)) return finito(false, `${tipo} non si caccia`);
    let preda = s.id ? world.getEntity(s.id) : null;
    if (s.id && !preda?.isValid) {
      s.fatti++; s.id = null;
      for (const e of bot.dimension.getEntities({ type: "minecraft:item", location: s.ultima, maxDistance: 4 })) e.teleport(bot.location);
    }
    if (s.fatti >= (c.quantita ?? 2)) return finito(true, `cacciati ${s.fatti} ${tipo.replace("minecraft:", "")}`);
    // per il cibo va bene qualsiasi animale: la mappa ne ricorda di tutti i tipi, le mucche spesso non ci sono più
    const tipi = c.routine === "cibo" ? [...new Set([tipo, "minecraft:cow", "minecraft:pig", "minecraft:sheep", "minecraft:chicken"])] : [tipo];
    const affamato = (bot.getComponent("minecraft:player.hunger")?.currentValue ?? 20) < 18 || (bot.getComponent("minecraft:health")?.currentValue ?? 20) <= 14
      || contaOggetti(bot, (id) => id in CIBO) < 2;
    if (!preda?.isValid) {
      // mai animali con nome o addomesticati
      preda = tipi.flatMap((t) => bot.dimension.getEntities({ type: t, location: bot.location, maxDistance: 40 }))
        .filter((e) => !e.nameTag && !e.getComponent("minecraft:is_tamed"))
        // lascia sempre almeno una coppia per la riproduzione, ma non quando ha fame o poca vita: 11/11 mattina 0 pasti e vita
        // da 20 a 1, la caccia riusciva il 2% delle volte perché gli animali isolati o in coppia venivano sempre saltati
        .filter((e) => affamato || bot.dimension.getEntities({ type: e.typeId, location: e.location, maxDistance: 16 }).length > 2)
        .sort((a, b) => dist(a.location, bot.location) - dist(b.location, bot.location))[0];
      if (!preda) {
        // nessuno qui: va dove ne aveva visti (mappa delle risorse), poi riprova
        const cat = tipo.replace("minecraft:", "");
        if (!s.verso) {
          for (const t of tipi) { s.verso = risorsaVicina(bot, t.replace("minecraft:", ""), s.escluse ?? []); if (s.verso) { s.cat = t.replace("minecraft:", ""); break; } }
          if (s.verso) evento(`Vado a cercare ${s.cat} dove li avevo visti a ${s.verso.x},${s.verso.y},${s.verso.z}`);
          else if ((s.giri = (s.giri ?? 0) + 1) <= 2) {
            // mappa esaurita: perlustra 40 blocchi in una direzione a caso, lontano dalle zone pericolose
            const a = Math.random() * Math.PI * 2, g = suolo(bot.dimension, Math.floor(bot.location.x + Math.cos(a) * 40), Math.floor(bot.location.z + Math.sin(a) * 40));
            if (g && !g.liquido && !inPericolo(g)) { s.verso = g; s.cat = cat; evento(`Perlustro verso ${g.x},${g.z} in cerca di animali`); }
          }
        }
        if (s.verso) {
          const r = vaiVerso(bot, s.verso, 4);
          // un posto si dimentica solo dopo esserci arrivati a vuoto; se la strada è bloccata si salta per questa volta
          if (r === true) dimenticaRisorsa(s.cat ?? cat, s.verso);
          if (r === true || r === "bloccato") { (s.escluse ??= []).push(s.verso); s.verso = null; }
          return;
        }
        return finito(s.fatti > 0, `trovati solo ${s.fatti} ${cat} qui intorno`);
      }
      s.id = preda.id;
    }
    s.ultima = preda.location;
    colpisci(bot, preda);
  },

  // recupero dopo la morte: gli oggetti a terra spariscono dopo 5 minuti
  recupera(bot, c) {
    const meta = posDa(c, bot);
    if (tick() > (c.scadenza ?? 0)) return finito(false, "i miei oggetti sono spariti (passati 5 minuti)");
    const r = vaiVerso(bot, centro(meta), 3);
    if (r === "bloccato") { bot.teleport(centro(meta)); nav.meta = null; nav.bloccato = 0; return; }
    if (r !== true) return;
    let n = 0;
    for (const e of bot.dimension.getEntities({ type: "minecraft:item", location: centro(meta), maxDistance: 8 })) {
      n += e.getComponent("minecraft:item")?.itemStack?.amount ?? 1;
      e.teleport(bot.location);
    }
    finito(n > 0, n ? `recuperati ${n} oggetti dove ero morto` : "non ho trovato i miei oggetti");
  },

  // fattoria: campo 5x5 con l'acqua al centro accanto a casa; raccoglie il maturo, ripianta, e con il grano fa il pane
  fattoria(bot, c) {
    const s = c.stato;
    let f = mem.luoghi.fattoria;
    if (!f) {
      const casa = mem.luoghi.casa ?? pav(bot.location);
      const base = { x: casa.x - 7, z: casa.z + 1 };
      const g = suolo(bot.dimension, base.x + 2, base.z + 2);
      if (!g || g.liquido) return finito(false, "la zona della fattoria non è caricata o è in acqua");
      f = mem.luoghi.fattoria = { x: base.x, y: g.y - 1, z: base.z, nota: "campo 5x5 del bot" };
      evento(`Nuova fattoria a ${f.x},${f.y},${f.z}`);
    }
    const semi = [["minecraft:wheat_seeds", "minecraft:wheat"], ["minecraft:carrot", "minecraft:carrots"], ["minecraft:potato", "minecraft:potatoes"]];
    if (!s.celle) {
      s.celle = [];
      for (let dx = 0; dx < 5; dx++) for (let dz = 0; dz < 5; dz++) if (dx !== 2 || dz !== 2) s.celle.push({ x: f.x + dx, y: f.y, z: f.z + dz });
      s.i = 0; s.raccolti = 0; s.piantati = 0;
      // niente semi e niente coltivato: prima i semi (dall'erba alta)
      const coltivato = s.celle.some((p) => /wheat|carrots|potatoes/.test(bot.dimension.getBlock({ x: p.x, y: p.y + 1, z: p.z })?.typeId ?? ""));
      if (!coltivato && !semi.some(([it]) => contaOggetti(bot, it) > 0) && rinvia(c, "minecraft:wheat_seeds", 24)) return;
    }
    if (s.pausa > 0) { s.pausa--; return; }
    if (!s.acqua) {
      const w = { x: f.x + 2, y: f.y, z: f.z + 2 };
      const r = vaiVerso(bot, centro(w), 4);
      if (r !== true && r !== "bloccato") return;
      const b = bot.dimension.getBlock(w);
      if (b && !b.typeId.includes("water") && !protetto(bot, b)) b.setType("minecraft:water");
      s.acqua = true;
    }
    if (s.i >= s.celle.length) {
      const grano = contaOggetti(bot, "minecraft:wheat");
      if (grano >= 3) fabbrica(bot, "minecraft:bread", Math.floor(grano / 3));
      // campo senza niente da raccogliere né da piantare: la prossima visita slitta di 10 minuti (10/11 17:00: 6 visite
      // inutili di fila, "raccolti 0, piantati 0", mezza giornata di gioco persa)
      mem.ultimaFattoria = Date.now() + (!s.raccolti && !s.piantati ? 600000 : 0);
      // con una visita a vuoto si scrive cosa c'era nelle celle (acerbi senza farina, irraggiungibili, terreno non coltivabile)
      const perche = !s.raccolti && !s.piantati ? ` (acerbi ${s.acerbi ?? 0}, irraggiungibili ${s.bloccate ?? 0}, semi ${semi.reduce((n, [it]) => n + contaOggetti(bot, it), 0)}, ossa ${contaOggetti(bot, "minecraft:bone")}; celle: ${Object.entries(s.altro ?? {}).map(([k, v]) => `${k} x${v}`).join(", ") || "-"})` : "";
      return finito(true, `fattoria: raccolti ${s.raccolti}, piantati ${s.piantati}${s.concimati ? `, concimati ${s.concimati}` : ""}${grano >= 3 ? `, fatto il pane` : ""}${perche}`);
    }
    const p = s.celle[s.i];
    const su = { x: p.x, y: p.y + 1, z: p.z };
    const r = vaiVerso(bot, centro(su), 4);
    if (r === "bloccato") {
      // 2.8.91: da lontano la strada per la fattoria (in palude) si blocca: l'11/11 13:10 "irraggiungibili 24" su 24 celle,
      // 7 minuti persi. Una volta per visita ci si porta accanto al campo, come per la fornace (2.8.77)
      const q = !s.portato && dist(bot.location, centro(su)) > 6 ? accanto(bot.dimension, { x: f.x + 2, y: f.y, z: f.z + 2 }) : null;
      if (q) { s.portato = true; bot.teleport(centro(q)); nav.meta = null; nav.bloccato = 0; evento("Non arrivavo alla fattoria: mi ci porto accanto"); return; }
      s.bloccate = (s.bloccate ?? 0) + 1; s.i++; return;
    }
    if (r !== true) return;
    const terra = bot.dimension.getBlock(p);
    let sopra = bot.dimension.getBlock(su);
    if (sopra && /^minecraft:(wheat|carrots|potatoes)$/.test(sopra.typeId)) {
      let cresciuto = 0;
      try { cresciuto = sopra.permutation.getState("growth") ?? 0; } catch {}
      if (cresciuto < 7) {
        // 2.8.86: farina d'ossa (dalle ossa degli scheletri, che teneva in tasca senza usarle) fa crescere subito il raccolto:
        // l'11/11 la fattoria dava "raccolti 0" quasi a ogni visita perché il grano non era ancora maturo
        if (!contaOggetti(bot, "minecraft:bone_meal") && contaOggetti(bot, "minecraft:bone")) { try { fabbrica(bot, "minecraft:bone_meal", 1); } catch {} }
        if (!contaOggetti(bot, "minecraft:bone_meal")) { s.acerbi = (s.acerbi ?? 0) + 1; s.i++; return; }
        try { sopra.setPermutation(sopra.permutation.withState("growth", Math.min(7, cresciuto + 2 + Math.floor(Math.random() * 4)))); } catch { s.i++; return; }
        togli(bot, "minecraft:bone_meal", 1); s.concimati = (s.concimati ?? 0) + 1;
        return; // stesso posto al giro dopo: se è maturo lo raccoglie, se no altra farina
      }
      if (scava(bot, su) === "ok") s.raccolti++;
      sopra = bot.dimension.getBlock(su);
    }
    if (terra && /^minecraft:(grass_block|dirt|grass_path|coarse_dirt)$/.test(terra.typeId) && sopra?.isAir && !protetto(bot, terra)) terra.setType("minecraft:farmland");
    const seme = semi.find(([it]) => contaOggetti(bot, it) > 0);
    // 2.8.89: cosa c'era in ogni cella, per capire le visite "raccolti 0, piantati 0" (11/11: nessun dato per capirlo)
    const sotto = bot.dimension.getBlock(p)?.typeId?.replace("minecraft:", "") ?? "?", sopraOra = bot.dimension.getBlock(su);
    if (!(sotto === "farmland" && sopraOra?.isAir)) (s.altro ??= {})[`${sotto}/${sopraOra?.typeId?.replace("minecraft:", "") ?? "?"}`] = ((s.altro ?? {})[`${sotto}/${sopraOra?.typeId?.replace("minecraft:", "") ?? "?"}`] ?? 0) + 1;
    if (seme && bot.dimension.getBlock(p)?.typeId === "minecraft:farmland" && bot.dimension.getBlock(su)?.isAir) {
      bot.dimension.getBlock(su).setType(seme[1]);
      togli(bot, seme[0], 1);
      s.piantati++;
    }
    s.i++; s.pausa = 2;
  },

  // riproduzione: dà da mangiare a due adulti della stessa specie (mucche e pecore grano, maiali carote, galline semi)
  alleva(bot, c) {
    const s = c.stato;
    const CIBI = { cow: "minecraft:wheat", sheep: "minecraft:wheat", pig: "minecraft:carrot", chicken: "minecraft:wheat_seeds" };
    const adulti = (t) => bot.dimension.getEntities({ type: `minecraft:${t}`, location: bot.location, maxDistance: 24 }).filter((e) => !e.getComponent("minecraft:is_baby") && !e.nameTag);
    s.tipo ??= c.oggetto && CIBI[c.oggetto] ? c.oggetto : Object.keys(CIBI).find((t) => contaOggetti(bot, CIBI[t]) >= 2 && adulti(t).length >= 2);
    if (!s.tipo) return finito(false, "niente coppie di animali qui o niente cibo per farli riprodurre");
    s.coppia ??= adulti(s.tipo).slice(0, 2).map((e) => e.id);
    if (s.coppia.length < 2) return finito(false, `meno di 2 ${s.tipo} adulti qui`);
    s.i ??= 0;
    const e = world.getEntity(s.coppia[s.i]);
    if (!e?.isValid) return finito(false, `un ${s.tipo} è sparito`);
    if (dist(e.location, bot.location) > 2.5) { if (tick() - nav.t > 10) { try { bot.navigateToEntity(e, 1); } catch {} nav.t = tick(); nav.meta = null; } return; }
    const slot = trovaSlot(bot, CIBI[s.tipo]);
    if (slot < 0) return finito(false, `finito ${CIBI[s.tipo].replace("minecraft:", "")}`);
    seleziona(bot, slot);
    try { bot.interactWithEntity(e); } catch (err) { errore("alleva", err); }
    if (++s.i >= 2) { mem.ultimaRiproduzione = Date.now(); finito(true, `dato da mangiare a 2 ${s.tipo}: cuccioli in arrivo`); }
  },

  // torce a griglia intorno a casa (ogni 6 blocchi): niente mostri che spawnano vicino alla base
  illumina(bot, c) {
    const s = c.stato;
    const o = mem.luoghi.casa ?? pav(bot.location);
    if (!s.punti) { s.punti = []; for (let dx = -12; dx <= 18; dx += 6) for (let dz = -12; dz <= 18; dz += 6) s.punti.push({ x: o.x + dx, z: o.z + dz }); s.i = 0; s.messe = 0; }
    if (s.i >= s.punti.length) { mem.illuminata = Date.now(); return finito(true, `messe ${s.messe} torce intorno alla base`); }
    if (contaOggetti(bot, "minecraft:torch") < 1) {
      if (!s.messe && rinvia(c, "minecraft:torch", 16)) return;
      return finito(s.messe > 0, s.messe ? `torce finite dopo ${s.messe}` : "servono torce");
    }
    const q = s.punti[s.i];
    // suolo() e non getTopmostBlock: nei chunk non caricati quello dà y 319 e il bot finiva al tetto del mondo
    const g = suolo(bot.dimension, q.x, q.z);
    const top = g && !g.liquido ? bot.dimension.getBlock({ x: q.x, y: g.y - 1, z: q.z }) : null;
    if (!top || !/grass_block|dirt|stone|sand|gravel|podzol|cobblestone|planks|path/.test(top.typeId)) { s.i++; return; }
    const p = { x: q.x, y: g.y, z: q.z };
    // c'è già una torcia vicino?
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = -1; dy <= 1; dy++) {
      if (bot.dimension.getBlock({ x: p.x + dx, y: p.y + dy, z: p.z + dz })?.typeId === "minecraft:torch") { s.i++; return; }
    }
    const r = vaiVerso(bot, centro(p), 4);
    if (r === "bloccato") { s.i++; return; }
    if (r !== true) return;
    if (piazza(bot, p, "minecraft:torch") === "ok") s.messe++;
    s.i++;
  },

  // base sicura: torce intorno e un muro di pietra alto 2 (25x25, varco a ovest) attorno alla casa
  base_sicura(bot, c) {
    const casa = mem.luoghi.casa;
    if (!casa) return finito(false, "prima serve una casa (luogo casa)");
    const o = { x: casa.x - 9, y: casa.y, z: casa.z - 9 };
    const serve = Math.max(0, 200 - contaOggetti(bot, "minecraft:cobblestone"));
    const passi = [{ tipo: "illumina" }, ...(serve ? [{ tipo: "raccogli", blocco: "pietra", quantita: serve }] : []),
      { tipo: "costruisci", schema: "recinto", lato_x: 25, lato_z: 25, altezza: 2, materiale: "cobblestone", x: o.x, y: o.y, z: o.z }];
    mem.coda.unshift(...passi.map((p) => ({ ...p, routine: c.routine ?? "base_sicura" })));
    mem.luoghi.muro_base ??= { ...o, nota: "muro 25x25 intorno alla casa" };
    finito(true, `base sicura: torce e muro di pietra 25x25 intorno alla casa (${passi.length} passi)`);
  },

  // deposito organizzato: 5 casse in fila accanto al deposito (minerali, cibo, legna, blocchi, varie);
  // ci smista l'inventario e svuota la vecchia cassa del deposito nelle casse giuste
  // fornace fissa vicino a casa: fondi falliva l'80% delle volte per "serve una fornace"
  fornace(bot, c) {
    const s0 = c.stato;
    const casa = mem.luoghi.casa;
    if (!casa) return finito(false, "serve prima una casa");
    const r = vaiVerso(bot, { x: casa.x + 0.5, y: casa.y, z: casa.z + 2.5 }, 3);
    if (r === "bloccato") { bot.teleport({ x: casa.x + 0.5, y: casa.y + 1, z: casa.z + 2.5 }); nav.meta = null; nav.bloccato = 0; return; }
    if (r !== true) return;
    if (contaOggetti(bot, "minecraft:furnace") < 1) {
      if (contaOggetti(bot, "#pietra") < 8 && rinvia(c, "#pietra", 8 - contaOggetti(bot, "#pietra"))) return;
      const [ok, msg] = fabbrica(bot, "minecraft:furnace");
      if (!ok && msg === "serve un banco da lavoro" && rinvia(c, "#tronco", 1)) return;
      if (!ok) s0.motivo = msg; // la causa vera (di solito manca la legna per il banco), non "né 8 pietre"
    }
    const p = assicuraBlocco(bot, "minecraft:furnace");
    if (!p) return finito(false, `non riesco a fare la fornace: ${s0.motivo ?? "nessun posto asciutto dove piazzarla"}`);
    mem.luoghi.fornace = { x: p.x, y: p.y, z: p.z, nota: "fornace fissa del bot" };
    finito(true, `fornace fissa a ${p.x},${p.y},${p.z}`);
  },

  // tana: scende di 4 blocchi dove si trova e richiude con 2 blocchi pieni sopra la testa.
  // 2.8.66: profonda solo 2 la testa restava a 0,2 blocchi dal suolo, e in Bedrock gli zombie colpiscono attraverso i blocchi
  // (10/11 10:10: ucciso da uno zombie dentro la tana chiusa, dopo 8 minuti fermo). Senza piccone su roccia resta a 2-3.
  tana(bot, c) {
    const s = c.stato;
    const dim = bot.dimension;
    // +0.5: sopra un blocco basso (sentiero, terra arata) i piedi sono a 63,94 e la cella "dei piedi" era il blocco stesso
    const qui = pav({ x: bot.location.x, y: bot.location.y + 0.5, z: bot.location.z });
    // 2.8.23: prima falliva al primo posto storto ("occupato", acqua sotto) e il bot restava fuori tutta la notte:
    // ora prova la cella dove sta e 8 vicine, sempre all'asciutto, e si chiude nella prima buona
    // 2.8.62: in palude i 9 posti vicini erano tutti bagnati ("acqua o grotte tutto intorno") e il bot restava fuori
    // (10/11: 3 tane fallite, 7 rifugi costruiti in acqua, morto per uno scheletro): si cerca anche a 6, 10 e 14 blocchi
    const posti = [[0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 3], [-3, 3], [3, -3], [-3, -3],
      ...[6, 10, 14].flatMap((d) => [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, d], [d, -d], [-d, -d]])];
    const adatto = (b) => {
      const sotto3 = dim.getBlock({ x: b.x, y: b.y - 3, z: b.z });
      if (!sotto3 || sotto3.isAir || sotto3.isLiquid) return false;
      const testa = dim.getBlock(b);
      if (!testa || testa.isLiquid) return false;
      // anche ai lati della buca: l'acqua accanto entra appena si scava (annegato nella tana a 107,61,422 il 09/11)
      const bagnato = (q) => { const k = dim.getBlock(q); return !!k && (k.isLiquid || /water|lava/.test(k.typeId)); };
      return [0, -1, -2, -3, -4].every((dy) => !bagnato({ x: b.x, y: b.y + dy, z: b.z })
        && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([ax, az]) => !bagnato({ x: b.x + ax, y: b.y + dy, z: b.z + az })));
    };
    if (!s.base) {
      s.scartati ??= [];
      for (const [dx, dz] of posti) {
        if (s.scartati.includes(`${dx},${dz}`)) continue;
        const g = dx || dz ? suolo(dim, qui.x + dx, qui.z + dz) : null;
        if (g?.liquido) continue;
        const c0 = g ? { x: g.x, y: g.y, z: g.z } : qui;
        if (adatto(c0)) { s.base = c0; s.posto = `${dx},${dz}`; break; }
      }
      if (!s.base) return (mem.tanaKo = Date.now()), finito(false, "acqua o grotte tutto intorno: niente tana qui");
    }
    const b = s.base;
    let fondo = 4;
    for (const dy of [-1, -2, -3, -4]) {
      const blk = dim.getBlock({ x: b.x, y: b.y + dy, z: b.z });
      // grotta sotto o blocco che non si scava (roccia senza piccone, protetto): oltre i 2 blocchi ci si ferma lì,
      // prima si prova il posto successivo invece di arrendersi
      const giu = dim.getBlock({ x: b.x, y: b.y + dy - 1, z: b.z });
      const ko = (dy < -2 && (!giu || giu.isAir || giu.isLiquid)) || (blk && !blk.isAir && scava(bot, { x: b.x, y: b.y + dy, z: b.z }) !== "ok");
      if (!ko) continue;
      if (dy < -2) { fondo = -dy - 1; break; }
      s.scartati.push(s.posto); s.base = null;
      if (s.scartati.length >= posti.length) return (mem.tanaKo = Date.now()), finito(false, "terreno troppo duro per la tana");
      return;
    }
    bot.teleport({ x: b.x + 0.5, y: b.y - fondo, z: b.z + 0.5 });
    // pareti della buca aperte su una grotta (zona piena di cavità): mostri e frecce entravano di lato
    // (09-10/11: 3 morti dentro la tana). Si tappano con lo stesso materiale del tetto.
    for (const dy of [1 - fondo, -fondo]) for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const q = { x: b.x + ax, y: b.y + dy, z: b.z + az };
      const k = dim.getBlock(q);
      if (!k || !(k.isAir || SOSTITUIBILI.test(k.typeId))) continue;
      const tappo = RIEMPITIVI.find((t) => contaOggetti(bot, t) > 0);
      if (!tappo || piazza(bot, q, tappo) !== "ok") return (mem.tanaKo = Date.now()), finito(false, "tana aperta su una grotta: non riesco a chiuderla");
    }
    // tetto: le 2 celle sopra la testa (a filo del terreno con la tana profonda 4; con 2 solo quella al livello dei piedi di prima)
    for (const dy of [2 - fondo, 3 - fondo].filter((d) => d <= 0)) {
      const q = { x: b.x, y: b.y + dy, z: b.z };
      const testa = dim.getBlock(q);
      // già chiusa da un blocco pieno (succedeva con "occupato"): va bene così; se è altro (fiori, neve, foglie) lo tolgo
      if (testa && !testa.isAir && !testa.isLiquid && testa.isSolid) continue;
      const alt = RIEMPITIVI.find((a) => contaOggetti(bot, a) > 0);
      if (!alt) return (mem.tanaKo = Date.now()), finito(false, "niente blocchi per chiudere la tana");
      let esito = piazza(bot, q, alt, true);
      if (esito === "occupato" && scava(bot, q) === "ok") esito = piazza(bot, q, alt, true);
      if (esito !== "ok" && esito !== "gia") return (mem.tanaKo = Date.now()), finito(false, `non riesco a chiudere la tana (${esito})`);
    }
    mem.rifugio = { x: b.x, y: b.y - fondo, z: b.z, ok: true, ...(c.emergenza ? { fino: Date.now() + 90000 } : {}) };
    nav.meta = null;
    // di notte i lavori rimasti in coda (legna, deposito) lo facevano uscire subito dalla tana: 4 morti in 15 minuti il 09/11.
    // Si cancellano: all'alba il piano li riassegna.
    const ora = world.getTimeOfDay?.() ?? 0;
    if (ora >= 12500 && ora < 23000) mem.coda = [];
    finito(true, `tana scavata a ${b.x},${b.y - fondo},${b.z}: resto qui fino all'alba`);
  },

  // bosco: pianta gli alberelli accanto a casa, così la legna è sempre a due passi (i viaggi per la legna finivano nelle grotte)
  bosco(bot, c) {
    const s = c.stato;
    const casa = mem.luoghi.casa;
    if (!casa) return finito(false, "serve prima una casa");
    if (!s.punti) {
      let b = mem.luoghi.bosco;
      if (!b) {
        if (!arrivaACasa(bot, casa)) return;
        const sp = trovaSpiazzo(bot.dimension, casa, 9, luoghiBot());
        if (!sp) return finito(false, `nessuno spiazzo libero vicino a casa per il bosco (${perche()})`);
        b = mem.luoghi.bosco = { x: sp.x, y: sp.y, z: sp.z, nota: "bosco del bot (alberelli ogni 3 blocchi)" };
        evento(`Nuovo bosco a ${b.x},${b.y},${b.z}`);
      }
      s.punti = [];
      for (let a = 1; a < 9; a += 3) for (let d = 1; d < 9; d += 3) s.punti.push({ x: b.x + a, z: b.z + d });
      s.i = 0; s.piantati = 0;
    }
    const alberello = ALBERELLI.find((a) => contaOggetti(bot, a) > 0);
    if (s.i >= s.punti.length || !alberello) {
      mem.ultimoBosco = Date.now();
      return finito(true, `bosco: piantati ${s.piantati} alberelli`);
    }
    const q = s.punti[s.i];
    const g = suolo(bot.dimension, q.x, q.z);
    if (!g || g.liquido) { s.i++; return; }
    const r = vaiVerso(bot, centro(g), 4);
    if (r === "bloccato") { s.i++; return; }
    if (r !== true) return;
    const sotto = bot.dimension.getBlock({ x: g.x, y: g.y - 1, z: g.z });
    // anche sull'erba alta o sui fiori (piazza li sostituisce): prima piantava 0 alberelli su 8 nei prati
    const cella = bot.dimension.getBlock(g);
    if (cella && (cella.isAir || SOSTITUIBILI.test(cella.typeId)) && /dirt|grass_block|podzol|moss_block/.test(sotto?.typeId ?? "") && piazza(bot, g, alberello) === "ok") {
      protetti.delete(chiaveBlocco(bot.dimension, g)); // il tronco che crescerà deve restare tagliabile
      s.piantati++;
    }
    s.i++;
  },

  // casetta vera di pietra accanto alla tua casa: di notte si ripara lì (prima faceva la ronda all'aperto)
  casetta(bot, c) {
    const casa = mem.luoghi.casa;
    if (!casa) return finito(false, "serve prima una casa");
    if (!arrivaACasa(bot, casa)) return;
    const sp = trovaSpiazzo(bot.dimension, casa, 5, luoghiBot());
    if (!sp) return finito(false, `nessuno spiazzo libero 5x5 vicino a casa (${perche()})`);
    const pietra = contaOggetti(bot, "minecraft:cobblestone");
    const passi = [];
    if (pietra < 100) passi.push({ tipo: "raccogli", blocco: "stone", quantita: 100 - pietra, routine: c.routine });
    passi.push({ tipo: "costruisci", schema: "casa", lato_x: 5, lato_z: 5, altezza: 3, materiale: "cobblestone", x: sp.x, y: sp.y, z: sp.z,
      routine: c.routine, luogoFinale: { nome: "casetta", p: { x: sp.x + 2, y: sp.y + 1, z: sp.z + 2, nota: "casetta di pietra del bot" } } });
    mem.coda.unshift(...passi);
    finito(true, `casetta 5x5 di pietra a ${sp.x},${sp.y},${sp.z}: ${passi.length} passi`);
  },

  sistema_deposito(bot, c) {
    const s = c.stato;
    let base = mem.luoghi.deposito;
    const casa = mem.luoghi.casa;
    // deposito lontano dalla casa (la casa si è spostata): se ne fa uno nuovo in uno spiazzo libero accanto, mai dentro casa tua
    if (casa && (!base || dist(base, casa) > 48)) {
      if (!arrivaACasa(bot, casa)) return;
      const sp = trovaSpiazzo(bot.dimension, casa, 7, luoghiBot().filter((p) => p !== base));
      if (!sp) return finito(false, `nessuno spiazzo libero vicino a casa per il deposito (${perche()})`);
      base = mem.luoghi.deposito = { x: sp.x, y: sp.y, z: sp.z, nota: "deposito del bot (casse per categoria)" };
      mem.casse = {};
      evento(`Nuovo deposito accanto a casa a ${sp.x},${sp.y},${sp.z}`);
    }
    base ??= casa;
    if (!base) return finito(false, "nessuna casa o deposito dove sistemare le casse");
    mem.casse ??= {};
    if (!s.fase) s.fase = "casse";
    if (s.fase === "casse") {
      const manca = CATEGORIE_CASSE.find((k) => !mem.casse[k] || !/chest|barrel/.test(bot.dimension.getBlock(mem.casse[k])?.typeId ?? ""));
      if (!manca) { s.fase = "smista"; return; }
      const i = CATEGORIE_CASSE.indexOf(manca);
      const g = suolo(bot.dimension, base.x + 2 + i, base.z + 2);
      if (!g || g.liquido) return finito(false, "non trovo un posto per le casse");
      if (contaOggetti(bot, "minecraft:chest") < 1 && !fabbrica(bot, "minecraft:chest")[0]) {
        if (rinvia(c, "#tronco", 2)) return;
        return finito(false, "servono assi per le casse");
      }
      const r = vaiVerso(bot, centro(g), 4);
      if (r === "bloccato") { bot.teleport(centro(g)); nav.meta = null; nav.bloccato = 0; return; }
      if (r !== true) return;
      const esito = piazza(bot, g, "minecraft:chest");
      if (esito !== "ok" && esito !== "gia") return finito(false, `non riesco a piazzare la cassa (${esito})`);
      mem.casse[manca] = { x: g.x, y: g.y, z: g.z };
      evento(`Cassa ${manca} a ${g.x},${g.y},${g.z}`);
      return;
    }
    // smistamento: una cassa per volta
    s.i ??= 0;
    if (s.i >= CATEGORIE_CASSE.length) return finito(true, `deposito sistemato: ${s.spostati ?? 0} oggetti nelle casse per categoria`);
    const cat = CATEGORIE_CASSE[s.i];
    const pos = mem.casse[cat];
    const r = vaiVerso(bot, centro(pos), 3);
    if (r === "bloccato") { bot.teleport({ x: pos.x + 0.5, y: pos.y + 1, z: pos.z + 0.5 }); nav.meta = null; nav.bloccato = 0; return; }
    if (r !== true) return;
    const cassa = bot.dimension.getBlock(pos)?.getComponent("minecraft:inventory")?.container;
    if (!cassa) { delete mem.casse[cat]; s.fase = "casse"; return; }
    const ci = inv(bot);
    const migliori = new Set(["pickaxe", "axe", "sword", "shovel"].map((t) => miglioreAttrezzo(bot, t).slot));
    const tenuti = {};
    for (let i = 0; i < ci.size; i++) {
      const it = ci.getItem(i);
      if (!it || migliori.has(i) || /_(helmet|chestplate|leggings|boots)$|shield/.test(it.typeId) || categoriaCassa(it.typeId) !== cat) continue;
      const limite = CIBO[it.typeId] ? 16 : it.typeId === "minecraft:torch" ? 32 : /crafting_table|furnace|cobblestone/.test(it.typeId) ? (it.typeId.includes("cobble") ? 32 : 1) : 0;
      // tiene in tasca la scorta (cibo, torce, pietra per i pavimenti) e sposta il resto, anche dividendo la pila
      const tieni = Math.max(0, Math.min(it.amount, limite - (tenuti[it.typeId] ?? 0)));
      tenuti[it.typeId] = (tenuti[it.typeId] ?? 0) + tieni;
      if (tieni === it.amount) continue;
      if (tieni === 0) {
        const resto = ci.transferItem(i, cassa);
        s.spostati = (s.spostati ?? 0) + it.amount - (resto?.amount ?? 0);
        if (resto) break;
      } else {
        const parte = it.clone(); parte.amount = it.amount - tieni;
        const resto = cassa.addItem(parte);
        const spostati = parte.amount - (resto?.amount ?? 0);
        it.amount -= spostati; ci.setItem(i, it);
        s.spostati = (s.spostati ?? 0) + spostati;
        if (resto) break;
      }
    }
    // la vecchia cassa del deposito (se non è una delle nuove) si svuota nelle casse giuste, passando dall'inventario
    const vecchia = mem.luoghi.deposito && !Object.values(mem.casse).some((q) => q.x === mem.luoghi.deposito.x && q.y === mem.luoghi.deposito.y && q.z === mem.luoghi.deposito.z)
      ? bot.dimension.getBlock(mem.luoghi.deposito)?.getComponent?.("minecraft:inventory")?.container : null;
    if (vecchia && dist(bot.location, mem.luoghi.deposito) <= 6) {
      for (let i = 0; i < vecchia.size; i++) { const it = vecchia.getItem(i); if (it && categoriaCassa(it.typeId) === cat) { const resto = cassa.addItem(it); vecchia.setItem(i, resto); if (resto) break; } }
    }
    s.i++;
  },

  // esplora a tappe da 16 blocchi: prima puntava dritto alla meta lontana, il percorso risultava "bloccato" e finiva
  // subito senza muoversi ("150 blocchi" in 14 secondi, "niente di speciale" 166 volte). Si ferma sulla costa:
  // andando verso il mare è annegato tre volte.
  esplora(bot, c) {
    const s = c.stato;
    if (!s.dir) {
      const d = DIREZIONI[c.direzione];
      const a = Math.random() * Math.PI * 2;
      s.dir = d ? { x: d.x, z: d.z } : { x: Math.cos(a), z: Math.sin(a) };
      s.lung = Math.min(200, c.lunghezza ?? 64); s.fatti = 0; s.trovati = [];
    }
    const fine = (motivo) => finito(true, `${motivo}${s.trovati.length ? ", trovati: " + s.trovati.join(", ") : ""}`);
    if (tick() % 40 === 0) { annotaScoperte(bot, s.trovati); annotaRisorse(bot); }
    if (!s.tappa) {
      if (s.fatti >= s.lung) return fine(`esplorati ${s.fatti} blocchi`);
      const passo = Math.min(16, s.lung - s.fatti);
      const g = suolo(bot.dimension, Math.floor(bot.location.x + s.dir.x * passo), Math.floor(bot.location.z + s.dir.z * passo));
      if (!g) return fine(`zona non caricata dopo ${s.fatti} blocchi`);
      if (g.liquido) return fine(`davanti c'è acqua dopo ${s.fatti} blocchi: mi fermo sulla riva`);
      if (inPericolo(g)) {
        if ((s.giri = (s.giri ?? 0) + 1) > 3) return fine(`zone pericolose tutto intorno dopo ${s.fatti} blocchi`);
        s.dir = { x: -s.dir.z, z: s.dir.x }; // gira a destra
        return;
      }
      s.tappa = g; s.passo = passo; s.t0 = tick();
    }
    const r = vaiVerso(bot, centro(s.tappa), 3);
    if (r === true || r === "bloccato" || tick() - s.t0 > 300) {
      if (r !== true) { bot.teleport(centro(s.tappa)); nav.meta = null; nav.bloccato = 0; } // come un animale che raggiunge il padrone
      s.fatti += s.passo; s.tappa = null;
    }
  },
};

// Crafta un oggetto; assi e bastoni mancanti li prepara da solo (errore frequente visto nei rapporti).
// Restituisce [riuscito, messaggio].
export function fabbrica(bot, oggetto, quantita = 1, livello = 0) {
  const id = ns(oggetto);
  const quanti = Math.max(1, Math.floor(quantita ?? 1));
  if (/planks$|^minecraft:assi$/.test(id) && !RICETTE[id]) {
    let fatti = 0;
    while (fatti < quanti) {
      const t = togli(bot, "#tronco", 1)[0];
      if (!t) break;
      aggiungi(bot, assiDaTronco(t), 4); fatti += 4;
    }
    conta(sessione.craftati, "planks", fatti);
    return [fatti > 0, fatti ? `fatte ${fatti} assi` : "servono tronchi"];
  }
  const r0 = RICETTE[id];
  if (!r0) return [false, `non conosco la ricetta di ${id}`];
  // alternative (es. tintura rossa da papavero, tulipano o barbabietola): la prima che ha tutti gli ingredienti
  const varianti = [r0, ...(r0.alt ?? []).map((a) => ({ ...r0, ing: a.ing, out: a.out ?? r0.out }))];
  const r = varianti.find((v) => Object.entries(v.ing).every(([ing, n]) => contaOggetti(bot, ing) >= n)) ?? r0;
  if (r.banco && !assicuraBlocco(bot, "minecraft:crafting_table")) {
    // un banco nuovo solo se non ne ha già uno in tasca (stanotte ne aveva 12: ne craftava uno a ogni tentativo fallito)
    const giaInTasca = contaOggetti(bot, "minecraft:crafting_table") > 0;
    // legna che non basta per banco + oggetto: non si fa nemmeno il banco, si aspettano altri tronchi (10/11: per una cassa
    // 3 banchi piazzati in 8 minuti in 3 posti diversi, 12 assi buttate e alla fine "servono assi per le casse")
    if (!giaInTasca && contaOggetti(bot, "#assi") + 4 * contaOggetti(bot, "#tronco") < 4 + (r.ing["#assi"] ?? 0)) return [false, "serve un banco da lavoro"];
    if (giaInTasca || livello > 1 || !fabbrica(bot, "minecraft:crafting_table", 1, livello + 1)[0] || !assicuraBlocco(bot, "minecraft:crafting_table")) return [false, "serve un banco da lavoro"];
  }
  let fatti = 0;
  while (fatti < quanti) {
    for (const [ing, n] of Object.entries(r.ing)) {
      const manca = n - contaOggetti(bot, ing);
      if (manca > 0 && livello < 2 && (ing === "#assi" || ing === "minecraft:stick")) fabbrica(bot, ing === "#assi" ? "minecraft:planks" : ing, manca, livello + 1);
      else if (manca > 0 && /_planks$/.test(ing)) assiDelTipo(bot, ing, manca); // scale di abete: servono assi di abete, dai suoi tronchi
    }
    const manca = Object.entries(r.ing).find(([ing, n]) => contaOggetti(bot, ing) < n);
    if (manca) { if (!fatti) return [false, `manca ${manca[0]} (ne servono ${manca[1]})`]; break; }
    for (const [ing, n] of Object.entries(r.ing)) togli(bot, ing, n);
    aggiungi(bot, id, r.out); fatti += r.out;
  }
  conta(sessione.craftati, id, fatti);
  indossaArmatura(bot);
  return [true, `craftati ${fatti} ${id.replace("minecraft:", "")}`];
}

// assi di un legno preciso dai tronchi dello stesso legno (fabbrica("planks") usa il primo tronco che trova)
function assiDelTipo(bot, assi, quante) {
  const legno = assi.replace("minecraft:", "").replace(/_planks$/, "");
  for (const t of [`${legno}_log`, `${legno}_wood`, `stripped_${legno}_log`, `${legno}_stem`, `${legno}_hyphae`]) {
    while (quante > 0 && togli(bot, `minecraft:${t}`, 1)[0]) { aggiungi(bot, assi, 4); quante -= 4; conta(sessione.craftati, "planks", 4); }
  }
}

// Scarta le ricette con id che questa versione del gioco non conosce (il ricettario è grande: un nome sbagliato
// non deve mai far fallire il crafting con un'eccezione). Va chiamata dopo il caricamento del mondo.
export function verificaRicette() {
  const esiste = (id) => { if (id.startsWith("#")) return true; try { new ItemStack(id, 1); return true; } catch { return false; } };
  let tolte = 0;
  for (const [id, r] of Object.entries(RICETTE)) {
    if (r.alt) r.alt = r.alt.filter((a) => Object.keys(a.ing).every(esiste));
    if (!esiste(id) || !Object.keys(r.ing).every(esiste)) {
      if (r.alt?.length) { const [a, ...resto] = r.alt; RICETTE[id] = { ...r, ing: a.ing, out: a.out ?? r.out, alt: resto }; if (esiste(id)) continue; }
      delete RICETTE[id]; tolte++;
    }
  }
  for (const [a, b] of Object.entries(FUSIONI)) if (!esiste(a) || !esiste(b)) { delete FUSIONI[a]; tolte++; }
  return { ricette: Object.keys(RICETTE).length, fusioni: Object.keys(FUSIONI).length, tolte };
}

// Riflesso gratuito: spada, piccone o ascia mancanti (o rotti) li rifà col materiale migliore che ha.
export function procuraSpada(bot) {
  for (const tipo of ["sword", "pickaxe", "axe"]) {
    if (miglioreAttrezzo(bot, tipo).slot >= 0) continue;
    for (const [pref, mat] of [["diamond", "minecraft:diamond"], ["iron", "minecraft:iron_ingot"], ["copper", "minecraft:copper_ingot"], ["stone", "#pietra"], ["wooden", "#assi"]]) {
      const disponibile = contaOggetti(bot, mat) + (mat === "#assi" ? contaOggetti(bot, "#tronco") * 4 : 0);
      if (disponibile >= 5 && fabbrica(bot, `minecraft:${pref}_${tipo}`)[0]) { evento(`Mi sono rifatto: ${pref}_${tipo}`); break; }
    }
  }
}

function trovaCassa(bot, c) {
  if (Number.isFinite(c.x)) return posDa(c, bot);
  const l = mem.luoghi.deposito;
  if (l && dist(l, bot.location) < 64) return { x: l.x, y: l.y, z: l.z };
  return cercaBlocchi(bot, (b) => /chest|barrel/.test(b.typeId), 10, 4, 1)[0] ?? null;
}

// Trova il blocco (banco/fornace) vicino, oppure lo piazza se ce l'ha in inventario.
function assicuraBlocco(bot, id) {
  const vicino = cercaBlocchi(bot, (b) => b.typeId === id || (id === "minecraft:furnace" && b.typeId === "minecraft:lit_furnace"), 6, 3, 1)[0];
  if (vicino) return vicino;
  if (contaOggetti(bot, id) < 1) return null;
  const o = pav(bot.location);
  for (const d of Object.values(DIREZIONI)) {
    const p = somma(o, d);
    const sotto = bot.dimension.getBlock(somma(p, { x: 0, y: -1, z: 0 }));
    if (sotto && !sotto.isAir && !sotto.isLiquid && piazza(bot, p, id) === "ok") { evento(`Piazzato ${id.replace("minecraft:", "")}`); return p; }
  }
  // in galleria tutte le celle intorno sono roccia: scava una nicchia e piazzalo lì
  // (prima falliva sempre: 12 banchi e una fornace in tasca e "serve un banco da lavoro")
  for (const d of Object.values(DIREZIONI)) {
    const p = somma(o, d);
    const blk = bot.dimension.getBlock(p);
    const sotto = bot.dimension.getBlock(somma(p, { x: 0, y: -1, z: 0 }));
    if (!blk || blk.isLiquid || protetto(bot, blk) || !sotto || sotto.isAir || sotto.isLiquid) continue;
    if (scava(bot, p) === "ok" && piazza(bot, p, id) === "ok") { evento(`Piazzato ${id.replace("minecraft:", "")} in una nicchia`); return p; }
  }
  return null;
}

const NOTEVOLI = /diamond_ore|emerald_ore|ancient_debris|mob_spawner|trial_spawner|budding_amethyst/;
function annotaScoperte(bot, trovati) {
  for (const p of cercaBlocchi(bot, (b) => NOTEVOLI.test(b.typeId), 8, 6, 3)) {
    const tipo = bot.dimension.getBlock(p).typeId.replace("minecraft:", "");
    if (Object.values(mem.luoghi).some((l) => l.nota === tipo && dist(l, p) < 12)) continue;
    const nome = `${tipo}_${Object.keys(mem.luoghi).length + 1}`;
    mem.luoghi[nome] = { ...p, nota: tipo };
    trovati.push(nome);
    evento(`Scoperta: ${tipo} a ${p.x},${p.y},${p.z}`);
    if (/diamond|emerald|ancient_debris/.test(tipo)) notifica(`💎 Claude ha trovato ${tipo} a ${p.x},${p.y},${p.z}`);
  }
}

// Miniera a scala e tunnel: apre una sezione per passo, raccoglie i minerali sulle pareti.
function scavoGuidato(bot, c, forma) {
  const s = c.stato;
  const d = DIREZIONI[c.direzione] ?? DIREZIONI.nord;
  s.origine ??= pav(bot.location);
  s.i ??= 1;
  s.minerali ??= 0;
  const passi = forma === "scala" ? Math.min(120, c.profondita ?? 30) : Math.min(200, c.lunghezza ?? 32);
  if (s.pausa > 0) { s.pausa--; return; }
  if (s.i > passi) return finito(true, `${forma} completata: ${passi} passi, ${s.minerali} minerali raccolti`);
  const scendi = forma === "scala" ? s.i : 0;
  const base = { x: s.origine.x + d.x * s.i, y: s.origine.y - scendi, z: s.origine.z + d.z * s.i };
  if (base.y <= bot.dimension.heightRange.min + 5) return finito(true, `fondo raggiunto a y=${base.y}, ${s.minerali} minerali`);
  const lato = d.x !== 0 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  const larghezza = forma === "tunnel" && c.larghezza === 3 ? [-1, 0, 1] : [0];
  const celle = [];
  for (const w of larghezza) for (let h = 0; h < (forma === "scala" ? 3 : 2); h++) celle.push({ x: base.x + lato.x * w, y: base.y + h, z: base.z + lato.z * w });

  // sicurezza: lava o acqua accanto alle celle da aprire si tappano; senza blocchi ci si ferma
  // (l'acqua lo annegava nelle grotte allagate, stanotte e ieri)
  const tappo = () => {
    const sl = [trovaSlot(bot, "#pietra"), trovaSlot(bot, "minecraft:dirt"), trovaSlot(bot, "minecraft:cobbled_deepslate")].find((i) => i >= 0);
    return sl === undefined ? null : inv(bot).getItem(sl)?.typeId;
  };
  for (const cel of celle) for (const v of [...Object.values(DIREZIONI), { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }]) {
    const b = bot.dimension.getBlock(somma(cel, v));
    if (b && /lava|water/.test(b.typeId) && !celle.some((x) => x.x === b.location.x && x.y === b.location.y && x.z === b.location.z)) {
      const blocco = tappo();
      if (blocco && piazza(bot, somma(cel, v), blocco) === "ok") continue;
      return finito(false, `${b.typeId.includes("lava") ? "lava" : "acqua"} a ${b.location.x},${b.location.y},${b.location.z}: mi fermo per sicurezza`);
    }
  }
  // pavimento: sotto il passo c'è il vuoto (grotta) o un liquido? ci mette un blocco, così non cade
  const sotto = somma(base, { x: 0, y: -1, z: 0 });
  const bs = bot.dimension.getBlock(sotto);
  if (bs && (bs.isAir || bs.isLiquid) && !celle.some((x) => x.x === sotto.x && x.y === sotto.y && x.z === sotto.z)) {
    const blocco = tappo();
    if (!blocco || piazza(bot, sotto, blocco) !== "ok") return finito(false, `sotto il passo ${s.i} c'è una grotta e non ho blocchi per fare il pavimento`);
  }
  const r = vaiVerso(bot, centro(somma(base, { x: -d.x, y: forma === "scala" ? 1 : 0, z: -d.z })), 4.5);
  // percorso bloccato dentro la scala (succedeva al passo 18): salta nella sezione appena scavata invece di fallire
  if (r === "bloccato") { bot.teleport(centro(somma(base, { x: -d.x, y: forma === "scala" ? 1 : 0, z: -d.z }))); nav.meta = null; nav.bloccato = 0; return; }
  if (r !== true) return;
  for (const cel of celle) {
    const blk = bot.dimension.getBlock(cel);
    if (!blk || blk.isAir || blk.isLiquid) continue;
    const id = blk.typeId;
    const esito = scava(bot, cel);
    if (esito === "protetto") return finito(false, `blocco protetto a ${cel.x},${cel.y},${cel.z}: non lo rompo`);
    if (esito === "attrezzo") return finito(false, `serve un piccone migliore per ${id.replace("minecraft:", "")}`);
    if (esito === "ok") { s.pausa = attesaScavo(id, bot); return; } // un blocco per volta
  }
  // minerali sulle pareti della sezione appena aperta
  for (const cel of celle) for (const v of [...Object.values(DIREZIONI), { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 }]) {
    const p = somma(cel, v);
    const b = bot.dimension.getBlock(p);
    if (b && ORE_NATURALI.test(b.typeId) && scava(bot, p) === "ok") { s.minerali++; s.pausa = attesaScavo(b.typeId, bot); return; }
  }
  if (s.i % 8 === 0 && contaOggetti(bot, "minecraft:torch") > 0) piazza(bot, base, "minecraft:torch");
  s.i++;
}

// Avvia un nuovo compito; una costruzione interrotta finisce tra le sospese.
export function assegna(compito, da) {
  if (mem.compito?.tipo === "costruisci" && mem.compito.stato?.ordinati && compito.tipo !== "costruisci") {
    const c = mem.compito;
    mem.sospesi.push({ tipo: "costruisci", x: c.x, y: c.y, z: c.z, descrizione: c.descrizione, blocchi: c.blocchi.slice(c.stato.i), da: c.da });
  }
  mem.compito = { ...compito, da, stato: {}, t: tick() };
  if (!["segui", "fermo"].includes(compito.tipo) && mem.modalita === "fermo") mem.modalita = "autonomo";
  nav.meta = null; nav.bloccato = 0;
  evento(`Nuovo compito da ${da}: ${JSON.stringify({ ...compito, blocchi: compito.blocchi ? `${compito.blocchi.length} blocchi` : undefined })}`);
}

// cosa resta in inventario dopo aver raccolto quel blocco (per saltare le raccolte inutili nelle routine)
const GIA_IN_TASCA = { sand: "minecraft:sand", coal_ore: (id) => /^minecraft:(coal|charcoal)$/.test(id), copper_ore: "minecraft:raw_copper",
  iron_ore: "minecraft:raw_iron", legna: (id) => /_log$|_stem$/.test(id), pietra: "#pietra" };

export function eseguiCompito(bot) {
  const c = mem.compito;
  if (c) {
    const f = ESECUTORI[c.tipo];
    if (!f) return finito(false, `compito sconosciuto: ${c.tipo}`);
    c.stato ??= {};
    // non fermarsi: oltre 10 minuti (30 per costruzioni e miniere) senza finire si cambia strada
    const max = /costruisci|miniera|scava_area|tunnel/.test(c.tipo) ? 36000 : 12000;
    if (c.t === undefined || c.t > tick()) c.t = tick(); // compito ripreso dopo un riavvio: i tick ripartono da zero
    // finché avanza non scade: il tempo conta dall'ultimo blocco raccolto (pietra x100 falliva a 10 minuti con 80 già presi)
    if ((c.stato.fatti ?? 0) !== (c.visti ?? 0)) { c.visti = c.stato.fatti; c.t = tick(); }
    if (!["segui", "fermo"].includes(c.tipo) && tick() - c.t > max) return finito(false, `troppo tempo senza finire (${Math.round(max / 1200)} min): cambio strada`);
    try { f(bot, c); } catch (e) { errore(`compito ${c.tipo}`, e); finito(false, `errore: ${e?.message ?? e}`); }
    return;
  }
  // Nessun compito: comportamento della modalità
  const p = giocatore(mem.bersaglio) ?? giocatore(mem.proprietario);
  if ((mem.modalita === "segui" || mem.modalita === "difendi") && p) seguiGiocatore(bot, p, mem.modalita === "difendi" ? 2.5 : 3.5);
  else if (mem.modalita === "fermo") bot.stopMoving();
}

export const descriviCompito = (c) => (c ? `${c.tipo} ${JSON.stringify({ ...c, blocchi: c.blocchi ? `${c.blocchi.length} blocchi` : undefined, stato: { fatti: c.stato?.fatti, i: c.stato?.i, minerali: c.stato?.minerali } })}` : "nessuno");
