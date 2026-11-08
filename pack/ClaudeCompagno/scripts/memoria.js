import { world, system } from "@minecraft/server";

export const VERSIONE = "2.8.0";

// Stato persistente (sopravvive ai riavvii del server)
export const mem = {
  luoghi: {},        // nome -> { x, y, z, nota }
  obiettivi: [],     // obiettivi a lungo termine, testo libero
  eventi: [],        // ultimi eventi { t, testo }
  chat: [],          // ultimi messaggi "nome: testo"
  spesa: { giorno: "", usd: 0, chiamate: 0 },
  modalita: "autonomo", // autonomo | segui | fermo | difendi
  bersaglio: "",     // giocatore da seguire o difendere
  ordine: null,      // { da, t } ultimo ordine ricevuto
  pos: null,         // ultima posizione del bot
  inventario: [],    // [[typeId, quantità, danno]]
  compito: null,     // compito in corso (vedi azioni.js)
  coda: [],          // compiti già pianificati, eseguiti senza chiamare l'API
  schemi: {},        // progetti riusciti salvati: nome -> [[dx,dy,dz,id]]
  sospesi: [],       // costruzioni interrotte da riprendere
  lezioni: [],       // cose imparate dagli errori, lette prima di ogni decisione
  esperienza: {},    // tipo di compito -> { ok, ko, ultimoErrore }
};

// Statistiche della sessione per il rapporto
export const sessione = {
  inizio: Date.now(), chiamate: 0, tokIn: 0, tokOut: 0, tokCache: 0, usd: 0,
  esitiApi: {}, ultimaRisposta: "", errori: [], operazioni: [],
  minati: {}, piazzati: {}, craftati: {}, fusi: {}, uccisi: {}, morti: [],
  compitiOk: 0, compitiKo: [], chatRicevute: 0, chatInviate: 0,
  giocatori: {}, attivita: [], danniSubiti: 0, distanza: 0, mangiato: 0, budgetEsaurito: false,
};

const KEY = "claude_mem";
const PROT = "claude_prot_";
const MAX_PROT = 60000;
export const protetti = new Set(); // "o:x,y,z" blocchi piazzati dai giocatori

export function adesso() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Le proprietà del mondo hanno un limite di lunghezza: i testi lunghi vanno a pezzi.
const PEZZO = 30000;
function scriviAPezzi(chiave, testo) {
  const n = Math.ceil(testo.length / PEZZO);
  for (let i = 0; i < n; i++) world.setDynamicProperty(`${chiave}_${i}`, testo.slice(i * PEZZO, (i + 1) * PEZZO));
  world.setDynamicProperty(`${chiave}_n`, n);
}
function leggiAPezzi(chiave) {
  const n = Number(world.getDynamicProperty(`${chiave}_n`) ?? 0);
  let s = "";
  for (let i = 0; i < n; i++) s += world.getDynamicProperty(`${chiave}_${i}`) ?? "";
  return s;
}

export function carica() {
  try {
    const raw = leggiAPezzi(KEY);
    if (raw) Object.assign(mem, JSON.parse(raw));
  } catch (e) { errore("caricamento memoria", e); }
  try {
    const n = Number(world.getDynamicProperty(PROT + "n") ?? 0);
    for (let i = 0; i < n; i++) {
      const s = world.getDynamicProperty(PROT + i);
      if (typeof s === "string" && s) for (const k of s.split(";")) protetti.add(k);
    }
  } catch (e) { errore("caricamento blocchi protetti", e); }
}

export function salva() {
  try {
    mem.eventi = mem.eventi.slice(-25);
    mem.chat = mem.chat.slice(-12);
    mem.sospesi = mem.sospesi.slice(-3);
    // dei luoghi "ultima_morte_N" tiene solo gli ultimi 3: erano 20 e gonfiavano ogni chiamata (le coordinate utili sono già nelle lezioni)
    for (const n of Object.keys(mem.luoghi).filter((k) => /^ultima_morte/.test(k)).slice(0, -3)) delete mem.luoghi[n];
    scriviAPezzi(KEY, JSON.stringify(mem));
    const tutti = [...protetti];
    const pezzi = [];
    for (let i = 0; i < tutti.length; i += 1500) pezzi.push(tutti.slice(i, i + 1500).join(";"));
    pezzi.forEach((s, i) => world.setDynamicProperty(PROT + i, s));
    world.setDynamicProperty(PROT + "n", pezzi.length);
  } catch (e) { errore("salvataggio memoria", e); }
}

export function chiaveBlocco(dim, p) {
  return `${dim.id.includes("nether") ? "n" : dim.id.includes("end") ? "e" : "o"}:${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
}

export function proteggi(dim, p) {
  protetti.add(chiaveBlocco(dim, p));
  if (protetti.size > MAX_PROT) protetti.delete(protetti.values().next().value);
}

// Il bot scrive ogni operazione nel log del server: lo script di avvio la copia nel rapporto.
export function evento(testo) {
  mem.eventi.push({ t: adesso().slice(5, 16), testo });
  if (mem.eventi.length > 25) mem.eventi.shift();
  sessione.operazioni.push(`${adesso()} ${testo}`);
  if (sessione.operazioni.length > 400) sessione.operazioni.shift();
  console.log(`[Claude][OPERAZIONE] ${testo}`);
}

let ultimoErrore = { testo: "", t: 0, volte: 0 };
// Scrive un oggetto nel log a pezzi da 900 caratteri (il log tronca le righe lunghe): "[Claude][TAG] id i/n pezzo".
// Lo leggono avvia.sh (backup) e il pannello web (stato e memoria in diretta).
export function scriviBlocco(tag, obj) {
  const testo = JSON.stringify(obj);
  const id = Date.now().toString(36);
  const pezzi = Math.max(1, Math.ceil(testo.length / 900));
  for (let i = 0; i < pezzi; i++) console.log(`[Claude][${tag}] ${id} ${i + 1}/${pezzi} ${testo.slice(i * 900, (i + 1) * 900)}`);
}
// Notifica sul telefono (avvia.sh la inoltra a ntfy): solo per gli eventi importanti.
export function notifica(testo) { console.log(`[Claude][NOTIFICA] ${String(testo).replace(/\s+/g, " ").slice(0, 200)}`); }

export function errore(dove, e) {
  const testo = `${dove}: ${e?.message ?? e}${e?.stack ? " | " + String(e.stack).split("\n").slice(0, 3).join(" > ") : ""}`;
  // lo stesso errore ripetuto (es. 5 volte al secondo) si scrive una volta ogni 30 s col conteggio: non intasa log e rapporto
  if (testo === ultimoErrore.testo && Date.now() - ultimoErrore.t < 30000) { ultimoErrore.volte++; return; }
  const ripetuto = testo === ultimoErrore.testo && ultimoErrore.volte ? ` (ripetuto ${ultimoErrore.volte} volte)` : "";
  ultimoErrore = { testo, t: Date.now(), volte: 0 };
  if (ripetuto) { sessione.errori.push(`${adesso()} ${testo}${ripetuto}`); console.warn(`[Claude][ERRORE] ${testo}${ripetuto}`); return; }
  sessione.errori.push(`${adesso()} ${testo}`);
  if (sessione.errori.length > 60) sessione.errori.shift();
  console.warn(`[Claude][ERRORE] ${testo}`);
}

export function conta(obj, chiave, n = 1) {
  const k = String(chiave).replace("minecraft:", "");
  obj[k] = (obj[k] ?? 0) + n;
}

const elenco = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} x${v}`).join(", ") || "nessuno";

export function rapporto(motivo, stato) {
  const durata = Math.round((Date.now() - sessione.inizio) / 60000);
  const r = [];
  r.push("=====RAPPORTO_INIZIO=====");
  r.push(`RAPPORTO CLAUDE COMPAGNO v${VERSIONE} — ${adesso()} — motivo: ${motivo}`);
  r.push("Missione: sopravvivere, trovare una soluzione, adattarsi, evolversi, costruire, esplorare — e mai fermarsi");
  r.push(`Durata sessione: ${durata} min`);
  r.push("");
  r.push("== STATO ATTUALE");
  for (const [k, v] of Object.entries(stato)) r.push(`${k}: ${v}`);
  r.push(`Modalità: ${mem.modalita}${mem.bersaglio ? " (" + mem.bersaglio + ")" : ""}`);
  r.push(`Compito: ${mem.compito ? JSON.stringify(mem.compito).slice(0, 400) : "nessuno"}`);
  r.push(`Costruzioni sospese: ${mem.sospesi.length}`);
  r.push("");
  r.push("== API CLAUDE");
  r.push(`Chiamate sessione: ${sessione.chiamate} | token in ${sessione.tokIn}, out ${sessione.tokOut}, da cache ${sessione.tokCache}`);
  r.push(`Costo sessione: $${sessione.usd.toFixed(4)} | oggi (${mem.spesa.giorno}): $${mem.spesa.usd.toFixed(4)} in ${mem.spesa.chiamate} chiamate`);
  r.push(`Prestazioni server: TPS media ${(sessione.tpsMedia ?? 20).toFixed(1)}, minimo ${(sessione.tpsMin ?? 20).toFixed(1)} (20 = perfetto)`);
  r.push(`Esiti HTTP: ${elenco(sessione.esitiApi)} | budget esaurito: ${sessione.budgetEsaurito ? "sì" : "no"}`);
  r.push(`Ultima risposta: ${sessione.ultimaRisposta.slice(0, 300)}`);
  r.push("");
  r.push("== ATTIVITÀ");
  r.push(`Blocchi scavati: ${elenco(sessione.minati)}`);
  r.push(`Blocchi piazzati: ${elenco(sessione.piazzati)}`);
  r.push(`Oggetti craftati: ${elenco(sessione.craftati)}`);
  r.push(`Oggetti fusi: ${elenco(sessione.fusi)}`);
  r.push(`Mob uccisi: ${elenco(sessione.uccisi)}`);
  r.push(`Pasti: ${sessione.mangiato} | danni subiti: ${sessione.danniSubiti.toFixed(1)} | distanza percorsa: ${Math.round(sessione.distanza)} blocchi`);
  r.push(`Compiti completati: ${sessione.compitiOk} | falliti: ${sessione.compitiKo.length}`);
  for (const k of sessione.compitiKo.slice(-15)) r.push(`  - ${k}`);
  r.push(`Morti: ${sessione.morti.length}`);
  for (const m of sessione.morti) r.push(`  - ${m}`);
  r.push(`Chat ricevute: ${sessione.chatRicevute} | inviate: ${sessione.chatInviate}`);
  r.push("");
  r.push("== GIOCATORI");
  for (const [n, g] of Object.entries(sessione.giocatori)) r.push(`${n}: ${g}`);
  r.push("");
  r.push("== MEMORIA");
  r.push(`Luoghi: ${Object.entries(mem.luoghi).map(([n, l]) => `${n}(${l.x},${l.y},${l.z})`).join(", ") || "nessuno"}`);
  r.push(`Obiettivi: ${mem.obiettivi.join(" | ") || "nessuno"}`);
  r.push(`Blocchi protetti registrati: ${protetti.size}`);
  r.push("");
  r.push("== AUTODIAGNOSI (prove all'avvio, gratis)");
  if (!sessione.diagnosi) r.push("non ancora eseguita");
  for (const [nome, ok, det] of sessione.diagnosi ?? []) r.push(`${ok ? "OK" : "KO"}  ${nome}${det ? " — " + det : ""}`);
  r.push("");
  r.push(`Manuale di esperienza universale: ${(mem.universali ?? []).length} lezioni dal gioco${(mem.universali ?? []).length ? " | ultime: " + mem.universali.slice(-3).map((u) => u.t).join(" | ") : ""}`);
  r.push("== APPRENDIMENTO (missione principale)");
  const perc = (ok, ko) => (ok + ko ? `${Math.round((100 * ok) / (ok + ko))}%` : "-");
  for (const [t, e] of Object.entries(mem.esperienza)) {
    const prima = sessione.espInizio?.[t] ?? { ok: 0, ko: 0 };
    const okS = e.ok - prima.ok, koS = e.ko - prima.ko;
    r.push(`${t}: prima di oggi ${perc(prima.ok, prima.ko)} su ${prima.ok + prima.ko} | questa sessione ${perc(okS, koS)} su ${okS + koS} | totale ${perc(e.ok, e.ko)}`);
  }
  r.push(`Riordini della memoria in questa sessione: ${sessione.riordini ?? 0}`);
  r.push(`Routine (successi/fallimenti totali): ${Object.entries(mem.statRoutine ?? {}).map(([n, s]) => `${n} ${s.ok}/${s.ko}`).join(", ") || "nessuna"}`);
  r.push(`Priorità del piano gratis (riflessione): ${(mem.prioritaGratis ?? []).join(" > ") || "non ancora decise"}`);
  r.push(`Riflessione giornaliera: ${mem.riflessione ? `${mem.riflessione.stato} (${mem.riflessione.giorno})${mem.riflessione.nota ? " — " + mem.riflessione.nota : ""}` : "mai fatta"}`);
  r.push(`Mappa delle risorse: ${Object.entries(mem.risorse ?? {}).map(([k, l]) => `${k} x${l.length}`).join(", ") || "vuota"}`);
  r.push(`Lezioni automatiche dal codice (${(mem.lezioniAuto ?? []).length}): ${(mem.lezioniAuto ?? []).join(" | ") || "nessuna"}`);
  r.push(`Fattoria: ${mem.luoghi.fattoria ? `${mem.luoghi.fattoria.x},${mem.luoghi.fattoria.y},${mem.luoghi.fattoria.z}` : "non ancora"} | muro base: ${mem.luoghi.muro_base ? "sì" : "no"} | schemi salvati: ${Object.keys(mem.schemi ?? {}).join(", ") || "nessuno"}`);
  r.push(`Zone pericolose: ${(mem.pericoli ?? []).map((z) => `${z.x},${z.y},${z.z} r${z.r} ${z.motivo}`).join(" | ") || "nessuna"}`);
  r.push(`Casse del deposito: ${Object.entries(mem.casse ?? {}).map(([k, q]) => `${k} ${q.x},${q.y},${q.z}`).join(", ") || "non ancora"}`);
  r.push(`Voti dei giocatori: ${mem.voti ? `${mem.voti.bravo} bravo, ${mem.voti.sbagliato} sbagliato` : "nessuno"}`);
  r.push(`Lezioni imparate (${mem.lezioni.length}):`);
  for (const l of mem.lezioni) r.push(`  - ${l}`);
  r.push("");
  r.push("== ULTIME OPERAZIONI");
  for (const o of sessione.operazioni.slice(-60)) r.push(o);
  r.push("");
  r.push("== ERRORI");
  if (!sessione.errori.length) r.push("nessuno");
  for (const e of sessione.errori) r.push(e);
  r.push("=====RAPPORTO_FINE=====");
  return r.join("\n");
}

export function stampaRapporto(motivo, stato) {
  // Una riga per volta: il log del server tronca le righe troppo lunghe.
  for (const riga of rapporto(motivo, stato).split("\n")) console.log(`[Claude][R] ${riga}`);
}

export const ogniTick = (n, f) => system.runInterval(() => {
  try { f(); } catch (e) { errore("ciclo", e); }
}, n);
