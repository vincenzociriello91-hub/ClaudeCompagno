import { world, system, GameMode } from "@minecraft/server";
import { spawnSimulatedPlayer, SimulatedPlayer } from "@minecraft/server-gametest";
import { variables } from "@minecraft/server-admin";
import { mem, sessione, carica, salva, evento, errore, scriviBlocco, notifica, stampaRapporto, proteggi, protetti, chiaveBlocco, adesso, ogniTick, conta, VERSIONE } from "./memoria.js";
import { CFG, caricaConfig, pensa, progetta, budgetOk, riordinaLezioni, riflessione, stato as cervello } from "./cervello.js";
import {
  notifiche, avvisa, difendi, gestisciFame, eseguiCompito, indossaArmatura, registraAggressione, giocatoriVeri, vuotoSotto, esciDalRiparo,
  istantaneaInventario, ripristinaInventario, riassuntoInventario, assegna, descriviCompito, seguiGiocatore, giocatore, procuraSpada, contaOggetti, interrompi, dist, routineKo, routineInPausa, inEmergenza, rientraNelRiparo, nelRiparo, affamato, togliFantasmi, zonaDi, annotaRisorse, lezioneAuto, riordinaInventario, spostaBaseSeAllagata, suolo, ariaSopra, segnaPericolo, prestazioni, inv, piazza, verificaRicette, inPericolo, guarda, inquadra, vista, ordinePannello, traslocoNelBosco, scortaCibo,
} from "./azioni.js";
import { ROUTINE, salvaSchema } from "./schemi.js";
import { CIBO } from "./ricette.js";
import { autodiagnosi } from "./diagnosi.js";

let bot = null;
let pronto = false;
let chatPendente = null; // { da, testo }
const vivo = () => bot?.isValid === true;
// Di notte senza armatura e lontano da casa non cammina al buio (stamattina 6 morti in 20 minuti così):
// si chiude in un rifugio dove si trova e aspetta l'alba. true = notte gestita, non assegnare altro.
function notteFuori() {
  if (inEmergenza(bot)) return true; // chiuso nel riparo d'emergenza: niente lavori fino alla scadenza
  const ora = world.getTimeOfDay();
  // vicino a casa ci si ripara nella casetta; senza casetta anche lì tana o rifugio (4 morti per scheletri a casa)
  // fino a 500 dopo l'alba i mostri sono ancora in giro: usciva alle 23000 con poca vita e moriva (10/11: vita 1/20, mandato a cacciare)
  // "aspetta" = mostri ancora intorno all'uscita: resta nel riparo e non prende lavori
  if (ora >= 500 && ora < 12500) return esciDalRiparo(bot) === "aspetta";
  if (!mem.luoghi.casa || (dist(bot.location, mem.luoghi.casa) <= 24 && mem.luoghi.casetta)) return false;
  const eq = bot.getComponent("minecraft:equippable");
  // solo un'armatura vera (corazza di ferro o meglio) permette di restare fuori: con quella di rame appena indossata
  // è rimasto all'aperto ed è morto 2 volte in 5 minuti (10/11, scheletro e creeper)
  if (/(iron|diamond|netherite)_chestplate$/.test(eq?.getEquipment("Chest")?.typeId ?? "")) return false;
  // mentre costruisce il rifugio o scava la tana non si ricomincia altrove (spinto dai mostri, ricominciava 6 volte a notte)
  const lavori = mem.compito?.routine === "notte_sicura" || mem.compito?.tipo === "tana";
  // riparo fatto ma lui è fuori (10/11 18:34: ucciso da un ragno mentre chiudeva la tana, è rimasto sul tetto tutta la notte
  // perché "entro 16 blocchi dal riparo" contava come al riparo): rientra; se è lontano o la buca non c'è più, se ne fa un'altra
  if (!lavori && mem.rifugio?.ok && !nelRiparo(bot) && !rientraNelRiparo(bot, bot.location, "Ero fuori dal riparo: rientro")) mem.rifugio = null;
  // riparo non riuscito (rifugio senza blocchi, tana fallita): si riprova ogni 30 secondi invece di restare scoperti
  const daRifare = !mem.rifugio?.ok && Date.now() - (mem.rifugioT ?? 0) > 30000;
  if (!lavori && (!mem.rifugio || dist(mem.rifugio, bot.location) > 16 || daRifare)) {
    mem.rifugio = { x: Math.floor(bot.location.x), y: Math.floor(bot.location.y), z: Math.floor(bot.location.z) };
    mem.rifugioT = Date.now();
    mem.coda = [];
    // prima la tana (1 blocco, 1 minuto, 9 posti provati); il rifugio costruito solo se la tana è già fallita qui
    // (il rifugio riusciva 7 volte su 55: il 09/11 4 morti per scheletri mentre lo costruiva senza ciottoli)
    const blocchi = BLOCCHI_PIENI.reduce((n, id) => n + contaOggetti(bot, id), 0);
    const rifugio = mem.tanaKo && Date.now() - mem.tanaKo < 120000 && blocchi >= 34;
    evento(`Notte senza armatura di ferro e senza casetta: ${rifugio ? "mi chiudo in un rifugio" : "scavo una tana"} qui fino all'alba`);
    assegna(rifugio ? { tipo: "routine", nome: "notte_sicura" } : { tipo: "tana", routine: "notte_sicura" }, "piano");
  }
  return true;
}
const BLOCCHI_PIENI = ["minecraft:cobblestone", "minecraft:cobbled_deepslate", "minecraft:stone", "minecraft:granite", "minecraft:diorite", "minecraft:andesite", "minecraft:tuff", "minecraft:dirt", "minecraft:sandstone"];
// La dettatura vocale storpia spesso "Claude": accetto le varianti più comuni.
let nomeRe = /\b(claude|cloud|clod|claud|cloude|clode)\b/i;
const reale = (p) => p && p.typeId === "minecraft:player" && !(p instanceof SimulatedPlayer);

// Livello di maturazione 0-100 (gratis, dai dati): equipaggiamento 30, sopravvivenza 25, abilità 20, base 15, sapere 10.
// Serve a vedere se cresce giorno per giorno e quando è pronto da portare in altre applicazioni.
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

function statoAttuale() {
  if (!vivo()) return { Bot: "non presente nel mondo" };
  const l = bot.location;
  return {
    Posizione: `${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.z)} (${bot.dimension.id})`,
    Vita: Math.round(bot.getComponent("minecraft:health")?.currentValue ?? 0),
    Fame: Math.round(bot.getComponent("minecraft:player.hunger")?.currentValue ?? 0),
    Inventario: riassuntoInventario(bot),
    "Giocatori online": giocatoriVeri().map((p) => p.name).join(", ") || "nessuno",
    Maturità: (() => { const m = maturita(); return m ? `${m.totale}/100 (equipaggiamento ${m.equipaggiamento}/30, sopravvivenza ${m.sopravvivenza}/25, abilità ${m.abilita}/20, base ${m.base}/15, sapere ${m.sapere}/10)` : "-"; })(),
  };
}

function generaBot(vicino) {
  if (vivo() || !pronto) return;
  try {
    const dim = world.getDimension(mem.pos?.dim ?? vicino?.dimension.id ?? "minecraft:overworld");
    const salvata = mem.pos && dim.getBlock(mem.pos) ? mem.pos : null; // solo se il chunk è caricato
    if (!salvata && !vicino) return; // senza giocatori serve la posizione salvata, col chunk caricato
    const l = salvata ?? { x: vicino.location.x + 1.5, y: vicino.location.y, z: vicino.location.z + 1.5 };
    // dopo un reload può restare il "vecchio" Claude senza script: si toglie prima di farne entrare uno nuovo (mai due)
    togliFantasmi(CFG.nome, dim);
    bot = spawnSimulatedPlayer({ dimension: salvata ? dim : vicino.dimension, x: l.x, y: l.y, z: l.z }, CFG.nome, GameMode.Survival);
    if (mem.inventario.length) ripristinaInventario(bot, mem.inventario);
    try { rientraNelRiparo(bot, l); } catch (e) { errore("rientro nel riparo", e); }
    evento(`${CFG.nome} entra nel mondo a ${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.z)}`);
    // autodiagnosi gratis una volta per sessione, 10 secondi dopo l'ingresso (il risultato va nel rapporto)
    if (!sessione.diagnosi) system.runTimeout(() => { if (vivo()) { try { autodiagnosi(bot); } catch (e) { errore("autodiagnosi", e); } } }, 200);
    if (!sessione.ricettario) { try { const v = verificaRicette(); sessione.ricettario = v; evento(`Ricettario: ${v.ricette} ricette e ${v.fusioni} fusioni${v.tolte ? ` (${v.tolte} non esistono in questa versione, scartate)` : ""}`); } catch (e) { errore("ricettario", e); } }
  } catch (e) { errore("generazione del bot", e); }
}

function parla(testo) {
  if (!vivo()) return;
  try { bot.chat(testo); sessione.chatInviate++; console.log(`[Claude][CHAT] ${CFG.nome}: ${String(testo).slice(0, 300)}`); } catch (e) { errore("chat", e); }
}

// Comandi immediati, senza chiamare l'API.
function comandoRapido(p, testo) {
  const t = testo.toLowerCase().replace(nomeRe, "").replace(/^[\s,:;!@.]+/, "").replace(/[.!?]+$/, "").trim();
  const proprietario = p.name.toLowerCase() === CFG.proprietario.toLowerCase();
  const ordineRecente = mem.ordine && mem.ordine.da.toLowerCase() === CFG.proprietario.toLowerCase() && Date.now() - mem.ordine.t < 5 * 60000;
  const cambiaStato = /^(fermo|fermati|stop|basta|seguimi|segui|vieni|difendimi|difendi|proteggimi|autonomo|libero)\b/.test(t);
  if (cambiaStato && !proprietario && ordineRecente) { parla(`Sto facendo una cosa per ${CFG.proprietario}, chiedi a lui.`); return true; }
  const ordina = () => { mem.ordine = { da: p.name, t: Date.now() }; };
  // spettatore: solo il proprietario (cambia la sua modalità di gioco); "smetti" e non "basta", che ferma il bot
  if (/^guarda(mi|ti)?$/.test(t) && proprietario) { guarda(p, true); parla("Ora mi vedi in diretta. Scrivi \"smetti\" per tornare dove eri."); return true; }
  if (/^smetti\b/.test(t) && proprietario) { if (guarda(p, false)) parla("Sei tornato dove eri."); return true; }
  if (/^(fermo|fermati|stop|basta|seguimi|segui|difendimi|difendi|proteggimi)\b/.test(t)) mem.coda = [];
  if (/^(fermo|fermati|stop|basta)\b/.test(t)) { ordina(); mem.compito = null; mem.modalita = "fermo"; bot.stopMoving(); parla("Ok, mi fermo."); return true; }
  if (/^(seguimi|segui)\b/.test(t)) { ordina(); mem.compito = null; mem.modalita = "segui"; mem.bersaglio = p.name; parla("Ti seguo."); return true; }
  if (/^vieni\b/.test(t)) { ordina(); assegna({ tipo: "vai", x: p.location.x, y: p.location.y, z: p.location.z }, p.name); parla("Arrivo."); return true; }
  if (/^(difendimi|difendi|proteggimi)\b/.test(t)) { ordina(); mem.compito = null; mem.modalita = "difendi"; mem.bersaglio = p.name; parla("Ti proteggo io."); return true; }
  if (/^(autonomo|libero)\b/.test(t)) { ordina(); mem.modalita = "autonomo"; mem.bersaglio = ""; parla("Torno a fare di testa mia."); return true; }
  // "rendimi amministratore" oppure "rendi amministratore NomeAmico": solo il proprietario
  const op = t.match(/^(?:rendimi|fammi) (?:amministratore|admin|operatore|op)\b|^rendi (?:amministratore|admin|operatore|op) ([\w -]{1,32})$/);
  if (op) {
    if (!proprietario) { parla(`Solo ${CFG.proprietario} può nominare gli amministratori.`); return true; }
    const nome = (op[1] ?? p.name).trim();
    const vero = giocatoriVeri().find((g) => g.name.toLowerCase() === nome.toLowerCase());
    if (!vero) { parla(`${nome} non è online: deve essere nel server.`); return true; }
    console.log(`[Claude][OP] ${vero.name}`); // avvia.sh lo passa alla console del server, che ha i permessi
    evento(`${p.name} ha nominato amministratore ${vero.name}`);
    parla(`${vero.name} è amministratore del mondo.`);
    return true;
  }
  if (/^stato\b/.test(t)) {
    const s = statoAttuale();
    parla(`Vita ${s.Vita}/20, fame ${s.Fame}/20, modalità ${mem.modalita}, compito: ${mem.compito?.tipo ?? "nessuno"}. Spesa oggi $${mem.spesa.usd.toFixed(3)}.`);
    return true;
  }
  // "salva questa costruzione come torre": la costruzione del giocatore diventa uno schema
  const salvaCmd = t.match(/^salva (?:questa |la mia |la )?(?:costruzione |struttura )?(?:come|con nome|col nome) ([\wàèéìòù -]{2,30})$/);
  if (salvaCmd) {
    const r = salvaCostruzione(p.name, salvaCmd[1].trim());
    parla(r?.chiave ? `Salvata come "${r.chiave}" (${r.n} blocchi): dimmi "rifai ${r.chiave}" e la rifaccio.` : r?.errore ? `Non riesco: ${r.errore}.` : "Non vedo una tua costruzione recente qui (servono almeno 8 blocchi piazzati da te).");
    return true;
  }
  // voti: "bravo" rafforza ciò che ha appena fatto (lezione gratis), "sbagliato ..." lo corregge
  const voto = t.match(/^(bravo|brava|bravissimo|ottimo|ben fatto|perfetto|grande)\b|^(sbagliato|hai sbagliato|non così|no così|non va bene)(?=[\s,:]|$)[\s,:]*(.*)$/); // niente \b dopo "così": con la ì non scatta
  if (voto) {
    mem.voti ??= { bravo: 0, sbagliato: 0 };
    const cosa = mem.ultimoCompito ?? descriviCompito(mem.compito);
    if (voto[1]) {
      mem.voti.bravo++;
      const l = `Approvato da ${p.name}: ${cosa}`.slice(0, 200);
      // al massimo 3 approvazioni tra le lezioni, le più recenti
      mem.lezioni = [...mem.lezioni.filter((x) => !x.startsWith("Approvato da")).concat(mem.lezioni.filter((x) => x.startsWith("Approvato da")).slice(-2)), l].slice(-25);
      evento(`Voto positivo da ${p.name}: ${cosa}`);
      parla("Grazie, me lo segno.");
    } else {
      mem.voti.sbagliato++;
      const l = `Disapprovato da ${p.name}: ${cosa}${voto[3] ? " — " + voto[3] : ""}`.slice(0, 200);
      mem.lezioni = [...mem.lezioni, l].slice(-25);
      evento(`Voto negativo da ${p.name}: ${cosa}`);
      mem.compito = null; // smette subito di fare la cosa sbagliata
      avvisa(`${p.name} dice che hai sbagliato (${cosa})${voto[3] ? ": " + voto[3] : ""}. Capisci cosa voleva e scrivi una lezione chiara`);
      parla("Ricevuto, correggo.");
    }
    return true;
  }
  // "casa qui": la casa del bot diventa il punto dove sei (era rimasta a 360 blocchi dalla vostra base vera)
  if (/^(casa qui|questa è casa|qui è casa)$/.test(t)) {
    if (!proprietario) { parla(`Solo ${CFG.proprietario} può spostare la casa.`); return true; }
    const l = p.location;
    mem.luoghi.casa = { x: Math.floor(l.x), y: Math.floor(l.y), z: Math.floor(l.z), nota: "casa scelta da " + p.name };
    delete mem.luoghi.fattoria; delete mem.luoghi.muro_base; mem.casse = {}; // fattoria, muro e casse si rifanno vicino alla casa nuova
    evento(`Casa spostata da ${p.name} a ${mem.luoghi.casa.x},${mem.luoghi.casa.y},${mem.luoghi.casa.z}`);
    parla("Ok, da ora casa è qui: fattoria, deposito e rifugio li faccio vicino.");
    return true;
  }
  if (/^rapporto\b/.test(t)) { stampaRapporto(`richiesto in chat da ${p.name}`, statoAttuale()); parla("Rapporto scritto, lo trovi tra i rapporti della Odin."); return true; }
  return false;
}

// ---------- eventi ----------
// avvio: con il mondo che si carica (accensione) oppure subito se il mondo è già pronto (dopo un "reload" degli
// aggiornamenti automatici l'evento worldLoad può non arrivare più). Una volta sola.
let avviato = false;
function avvio() {
  if (avviato) return;
  avviato = true;
  caricaConfig();
  carica();
  ripristinaBackup();
  // riparazione una tantum: la 2.8.23 spostando la casa (09/11 05:18) ha cancellato anche la fattoria funzionante
  // a 135,62,360; la 2.8.25 non la cancella più, qui la si rimette se manca
  const cp = mem.luoghi?.casa_palude;
  if (cp) mem.casaSpostataT ??= Date.now(); // casa già spostata dalla 2.8.23: le zone d'acqua vecchie non la fanno risaltare
  if (cp && cp.x === 142 && cp.z === 359 && !mem.luoghi.fattoria && !mem.fattoriaRipristinata) {
    mem.luoghi.fattoria = { x: 135, y: 62, z: 360 };
    mem.fattoriaRipristinata = true;
    evento("Fattoria a 135,62,360 ritrovata dopo lo spostamento della casa");
  }
  mem.baseContatori = mem.ultimiContatori ?? mem.baseContatori ?? {};
  mem.proprietario = CFG.proprietario;
  sessione.espInizio = JSON.parse(JSON.stringify(mem.esperienza)); // per misurare i progressi di questa sessione
  if (CFG.nome.toLowerCase() !== "claude") nomeRe = new RegExp(`\\b${CFG.nome.replace(/[^\w]/g, "")}\\b`, "i");
  sessione.budgetEsaurito = !budgetOk();
  pronto = true;
  evento(`Avvio Claude Compagno v${VERSIONE}, proprietario: ${CFG.proprietario || "non impostato"}, modelli: complesso ${CFG.complesso}, quotidiano ${CFG.medio}, rapido ${CFG.modello}, budget $${CFG.budget}/giorno`);
  for (const p of giocatoriVeri()) generaBot(p);
  // nessuno online all'avvio: prima entrava solo quando si collegava un giocatore, e restava fuori tutta la notte.
  // Carica il chunk dove si trovava (area di ticking temporanea), entra lì e poi toglie l'area: da quel momento il bot
  // tiene caricata la zona da solo, come un giocatore.
  if (!giocatoriVeri().length && mem.pos && CFG.senzaGiocatori) {
    const dim = world.getDimension(mem.pos.dim ?? "minecraft:overworld");
    try { dim.runCommand(`tickingarea add circle ${Math.floor(mem.pos.x)} ${Math.floor(mem.pos.y)} ${Math.floor(mem.pos.z)} 1 claude_avvio`); } catch (e) { errore("area di avvio", e); }
    system.runTimeout(() => {
      generaBot(null);
      try { dim.runCommand("tickingarea remove claude_avvio"); } catch {}
      if (!vivo()) evento("Avvio senza giocatori: non riesco a entrare nel mondo, aspetto un giocatore");
    }, 200);
  }
}
world.afterEvents.worldLoad.subscribe(avvio);
system.runTimeout(() => { try { world.getDynamicProperty("claude_prova"); avvio(); } catch {} }, 100);

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (!initialSpawn || !reale(player)) return;
  // era uscito mentre guardava (o il server si è riavviato): gli si ridà la sua modalità e il suo posto
  if (mem.spettatore?.nome === player.name) system.runTimeout(() => { try { guarda(player, false); } catch (e) { errore("fine spettatore", e); } }, 40);
  sessione.giocatori[player.name] = `${sessione.giocatori[player.name] ? sessione.giocatori[player.name] + "; " : ""}entrato ${adesso()}`;
  evento(`${player.name} è entrato`);
  if (player.name.toLowerCase() === CFG.proprietario.toLowerCase()) system.runTimeout(() => riassuntoAssenza(player.name), 200);
  if (!vivo()) system.runTimeout(() => generaBot(player), 100);
});

world.afterEvents.playerLeave.subscribe(({ playerName }) => {
  if (playerName === CFG.nome) return;
  sessione.giocatori[playerName] = `${sessione.giocatori[playerName] ?? ""}, uscito ${adesso()}`;
  evento(`${playerName} è uscito`);
  if (playerName.toLowerCase() === CFG.proprietario.toLowerCase()) mem.assenza = { t: Date.now(), ...contatori() };
  // seguiva o difendeva chi è uscito: torna autonomo, se no resta fermo a vuoto tutta la notte ("fermo" lo toglie solo il giocatore)
  if (["segui", "difendi"].includes(mem.modalita) && (!giocatore(mem.bersaglio) || mem.bersaglio === playerName)) {
    mem.modalita = "autonomo"; mem.bersaglio = "";
    evento("Torno autonomo: chi seguivo o difendevo è uscito");
  }
});

world.afterEvents.chatSend.subscribe(({ sender, message }) => {
  if (!reale(sender)) return;
  mem.chat.push(`${sender.name}: ${message.slice(0, 200)}`);
  console.log(`[Claude][CHAT] ${sender.name}: ${message.slice(0, 300)}`); // per il pannello web
  // il proprietario non deve chiamarlo per nome: ogni suo messaggio è per il bot. Gli amici sì, se no risponderebbe a tutto.
  const dalProprietario = sender.name.toLowerCase() === CFG.proprietario.toLowerCase();
  if (!vivo() || (!dalProprietario && !nomeRe.test(message))) return;
  sessione.chatRicevute++;
  if (sender.name.toLowerCase() === CFG.proprietario.toLowerCase()) mem.ordine = { da: sender.name, t: Date.now() };
  if (!comandoRapido(sender, message)) chatPendente = { da: sender.name, testo: message.slice(0, 300) };
});

// 2.8.103: ordini dal pannello web (avvia.sh li passa alla console come "scriptevent claude:pannello <cosa>")
system.afterEvents.scriptEventReceive?.subscribe(({ id, message }) => {
  if (id !== "claude:pannello" || !vivo()) return;
  try { ordinePannello(bot, String(message ?? "").trim(), CFG.proprietario); } catch (e) { errore("ordine dal pannello", e); }
});

world.afterEvents.entityHurt.subscribe(({ hurtEntity, damage, damageSource }) => {
  if (hurtEntity.typeId !== "minecraft:player") return;
  registraAggressione(hurtEntity, damageSource.damagingEntity);
  if (vivo() && hurtEntity.id === bot.id) {
    sessione.danniSubiti += damage;
    // soffoca dentro un blocco (è morto così a 110,64,350): esce subito sul terreno libero sopra
    // danno da annegamento: il conto "testa sott'acqua da 10 secondi" si azzera a ogni salto (il bot non nuota, salta),
    // l'aria no. Il 10/11 14:41 è annegato in palude a 3 blocchi di profondità con due "salvataggi" appena fatti.
    // Al primo danno esce subito su terra asciutta e cambia compito.
    if (damageSource.cause === "drowning") {
      const casa = mem.luoghi.casa;
      const asciutto = terraSicura(bot.dimension, bot.location) ?? (casa ? { x: casa.x + 0.5, y: casa.y + 1, z: casa.z + 0.5 } : ultimoSicuro);
      if (asciutto) {
        segnaPericolo(bot.location, 8, "acqua (annegamento)");
        bot.teleport(asciutto); sottAcqua = 0;
        if (mem.compito) interrompi("stavo annegando: uscito dall'acqua, cambio strada");
        evento("Salvataggio: stavo annegando, esco dall'acqua");
      }
    }
    if (damageSource.cause === "suffocation") {
      // si esce verso l'alto: suolo() scende dentro i tronchi e rimetteva il bot nel legno (morto a 87,73,361)
      const g = ariaSopra(bot.dimension, bot.location);
      soffocamenti = soffocamenti.filter((t) => Date.now() - t < 30000).concat(Date.now());
      const casa = mem.luoghi.casa;
      if (soffocamenti.length >= 3 && (ultimoSicuro || casa)) {
        // il salvataggio sul posto non basta (ieri 9 di fila e poi morto): via di lì e compito cambiato
        segnaPericolo(bot.location, 8, "soffocamento"); // il punto pericoloso, prima di spostarsi
        bot.teleport(terraSicura(bot.dimension, bot.location) ?? (casa ? { x: casa.x + 0.5, y: casa.y + 1, z: casa.z + 0.5 } : ultimoSicuro));
        if (mem.compito) interrompi("soffocavo di continuo in quel punto: cambio strada");
        soffocamenti = [];
        evento("Salvataggio: soffocavo di continuo, mi sposto in un punto sicuro");
      } else if (g) { bot.teleport({ x: g.x + 0.5, y: g.y, z: g.z + 0.5 }); evento("Salvataggio: stavo soffocando in un blocco"); }
    }
  }
});

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  if (!vivo() && deadEntity.id !== bot?.id) return;
  const causa = `${damageSource.cause}${damageSource.damagingEntity ? " da " + damageSource.damagingEntity.typeId.replace("minecraft:", "") : ""}`;
  if (deadEntity.id === bot?.id) {
    const l = bot.location;
    sessione.morti.push(`${adesso()} ${causa} a ${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.z)}`);
    evento(`Sono morto: ${causa}`);
    notifica(`💀 Claude è morto: ${causa} a ${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.z)}`);
    avvisa(`sei morto (${causa}) a ${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.z)}: i tuoi oggetti sono rimasti lì. Capisci cosa è andato storto e scrivi una lezione`);
    const dove = { x: Math.round(l.x), y: Math.round(l.y), z: Math.round(l.z) };
    // offline la lezione sulla morte la scrive il codice (modalità zero)
    if (!giocatoriVeri().length) lezioneAuto(`morte|${causa}|${zonaDi(dove)}`, `Morto per ${causa} a ${dove.x},${dove.y},${dove.z} mentre facevo: ${descriviCompito(mem.compito)}. Lì serve più prudenza.`, 1);
    // recupero oggetti: non in lava o nel vuoto, e non se è già morto lì da poco (sarebbe una trappola)
    const giaMortoQui = mem.morteRecente && dist(mem.morteRecente, dove) < 8 && Date.now() - mem.morteRecente.t < 600000;
    // raffica di morti (09/11: 4 morti per zombie in 2 minuti intorno a casa): niente recupero, si rinasce protetti
    mem.mortiRecenti = (mem.mortiRecenti ?? []).filter((t) => Date.now() - t < 180000).concat(Date.now());
    const raffica = mem.mortiRecenti.length >= 2;
    const recuperabile = !/lava|void|fire/.test(causa) && !giaMortoQui && !raffica;
    mem.morteRecente = { ...dove, t: Date.now() };
    segnaPericolo(dove, 12, causa);
    mem.luoghi.ultima_morte = { ...dove, nota: "oggetti persi" };
    mem.compito = null;
    mem.inventario = []; // gli oggetti sono caduti a terra: non vanno ripristinati al riavvio
    system.runTimeout(() => {
      try { bot.respawn(); } catch (e) { errore("rinascita", e); return; }
      // rinasce dal proprietario o a casa, non al punto di spawn del mondo (lì moriva di continuo)
      system.runTimeout(() => {
        const p = giocatore(CFG.proprietario);
        const casa = mem.luoghi.casa;
        if (p) bot.teleport(p.location, { dimension: p.dimension });
        else if (casa) bot.teleport({ x: casa.x + 0.5, y: casa.y + 1, z: casa.z + 0.5 });
        if (raffica) {
          // 15 secondi non bastavano (09/11 sera: 18 morti, rinasceva tra gli stessi mostri e si rimetteva a combattere):
          // 2 minuti protetto e senza combattere, il tempo di chiudersi nella tana e restarci
          try { bot.addEffect("resistance", 2400, { amplifier: 4, showParticles: false }); } catch {}
          mem.protettoFino = Date.now() + 120000;
          evento("Rinasco protetto per 2 minuti: troppe morti di fila, niente recupero né combattimenti, mi chiudo in una tana");
          assegna({ tipo: "tana", routine: "notte_sicura" }, "autonomia");
        }
        // gli oggetti a terra spariscono dopo 5 minuti: va subito a riprenderli
        // di notte da solo niente recupero: usciva dalla tana appena scavata e moriva di nuovo (10/11: 00:12 e 00:13)
        const buio = world.getTimeOfDay() >= 12500 && world.getTimeOfDay() < 23000;
        if (recuperabile && vivo() && !(buio && !giocatoriVeri().length)) assegna({ tipo: "recupera", ...dove, scadenza: system.currentTick + 5600 }, "autonomia");
      }, 20);
    }, 60);
    return;
  }
  if (vivo() && damageSource.damagingEntity?.id === bot.id) conta(sessione.uccisi, deadEntity.typeId);
  if (reale(deadEntity)) { evento(`${deadEntity.name} è morto (${causa})`); if (vivo()) parla(`${deadEntity.name}, mi dispiace (${causa.replace(/entityExplosion da /, "esploso da ").replace(/projectile da /, "colpito da ").replace(/entityAttack da /, "attaccato da ")}). Ti raggiungo quando rinasci.`); }
});

// Cosa fanno i giocatori: serve al bot per imitarli ("fai come me") e per capire cosa stanno costruendo.
function annotaAttivita(testo) {
  sessione.attivita.push(`${adesso().slice(11, 16)} ${testo}`);
  if (sessione.attivita.length > 15) sessione.attivita.shift();
}

// Costruzioni dei giocatori: si annotano i blocchi piazzati; a costruzione finita (5 min di pausa, almeno 20 blocchi)
// diventano uno schema riusabile gratis ("rifai ..."), o subito con "salva questa costruzione come nome".
const cantieri = new Map(); // nome giocatore -> [{x,y,z,id,t,dim}]
function salvaCostruzione(nomeGiocatore, nomeSchema, minimo) {
  const l = cantieri.get(nomeGiocatore) ?? [];
  const ultimo = l.at(-1);
  if (!ultimo) return null;
  const dim = world.getDimension(ultimo.dim);
  const vivi = l.filter((b) => b.dim === ultimo.dim && dist(b, ultimo) <= 24 && dim.getBlock(b)?.typeId === b.id);
  const unici = [...new Map(vivi.map((b) => [`${b.x},${b.y},${b.z}`, b])).values()];
  if (unici.length < (minimo ?? 8)) return null;
  const min = { x: Math.min(...unici.map((b) => b.x)), y: Math.min(...unici.map((b) => b.y)), z: Math.min(...unici.map((b) => b.z)) };
  const chiave = salvaSchema(nomeSchema, unici.map((b) => [b.x - min.x, b.y - min.y, b.z - min.z, b.id]));
  if (!chiave) return { errore: unici.length > 800 ? `troppo grande (${unici.length} blocchi, massimo 800)` : "nome non valido" };
  cantieri.set(nomeGiocatore, l.filter((b) => !unici.includes(b)));
  evento(`Schema salvato dalla costruzione di ${nomeGiocatore}: ${chiave} (${unici.length} blocchi)`);
  return { chiave, n: unici.length };
}
ogniTick(1200, () => {
  for (const [nome, l] of cantieri) {
    if (l.length < 20 || system.currentTick - l.at(-1).t < 6000) continue;
    mem.nCostruzioni = (mem.nCostruzioni ?? 0) + 1;
    const r = salvaCostruzione(nome, `costruzione_${nome}_${mem.nCostruzioni}`, 16);
    if (r?.chiave) parla(`Ho salvato la costruzione di ${nome} come "${r.chiave}": dimmi "rifai ${r.chiave}" e la rifaccio io.`);
    else cantieri.set(nome, []);
  }
});

world.afterEvents.playerPlaceBlock.subscribe(({ player, block }) => {
  if (!reale(player)) return;
  proteggi(block.dimension, block.location);
  const l = cantieri.get(player.name) ?? [];
  l.push({ x: block.location.x, y: block.location.y, z: block.location.z, id: block.typeId, t: system.currentTick, dim: block.dimension.id });
  if (l.length > 1500) l.shift();
  cantieri.set(player.name, l);
  annotaAttivita(`${player.name} ha piazzato ${block.typeId.replace("minecraft:", "")} a ${block.location.x},${block.location.y},${block.location.z}`);
});

world.afterEvents.playerBreakBlock.subscribe(({ player, brokenBlockPermutation, block }) => {
  if (!reale(player)) return;
  protetti.delete(chiaveBlocco(block.dimension, block.location));
  annotaAttivita(`${player.name} ha rotto ${brokenBlockPermutation.type.id.replace("minecraft:", "")} a ${block.location.x},${block.location.y},${block.location.z}`);
});

system.beforeEvents.shutdown.subscribe(() => {
  try { stampaRapporto("chiusura del server", statoAttuale()); } catch (e) { console.warn(`[Claude][ERRORE] rapporto di chiusura: ${e}`); }
  try { scriviBackup(); } catch (e) { console.warn(`[Claude][ERRORE] backup di chiusura: ${e}`); }
});

// ---------- riassunto, backup, aiuto ----------
const somma = (o) => Object.values(o ?? {}).reduce((a, b) => a + b, 0);
// i contatori della sessione ripartono da zero a ogni riavvio: la base porta avanti quelli delle sessioni precedenti
function contatori() {
  const b = mem.baseContatori ?? {}, piu = (k, v) => (b[k] ?? 0) + v;
  return { minati: piu("minati", somma(sessione.minati)), piazzati: piu("piazzati", somma(sessione.piazzati)), craftati: piu("craftati", somma(sessione.craftati)),
    fusi: piu("fusi", somma(sessione.fusi)), uccisi: piu("uccisi", somma(sessione.uccisi)), morti: piu("morti", sessione.morti.length), ok: piu("ok", sessione.compitiOk), lezioni: mem.lezioni.length + (mem.lezioniAuto?.length ?? 0),
    usd: mem.spesa.usd, giorno: mem.spesa.giorno, ferro: contaOggetti(bot, (id) => /iron_ingot|raw_iron/.test(id)), diamanti: contaOggetti(bot, "minecraft:diamond") };
}
// Quando il proprietario rientra: cosa ha fatto mentre era via, coi numeri veri (gratis, niente IA).
function riassuntoAssenza(nome) {
  const a = mem.assenza;
  if (!a || !vivo() || Date.now() - a.t < 10 * 60000) return;
  const n = contatori();
  const d = (k) => Math.max(0, n[k] - (a[k] ?? 0));
  const min = Math.round((Date.now() - a.t) / 60000);
  const spesa = n.giorno === a.giorno ? n.usd - a.usd : n.usd;
  parla(`Bentornato ${nome}! In ${min >= 60 ? Math.floor(min / 60) + "h " : ""}${min % 60}m: scavati ${d("minati")} blocchi, piazzati ${d("piazzati")}, craftati ${d("craftati")}, fusi ${d("fusi")}, mostri abbattuti ${d("uccisi")}.`);
  parla(`Compiti riusciti ${d("ok")}, morti ${d("morti")}, lezioni nuove ${d("lezioni")}. Ho ${n.ferro} ferro e ${n.diamanti} diamanti. Spesa mentre eri via: $${spesa.toFixed(2)}.`);
  mem.assenza = null;
}
// Backup della memoria nel log, a pezzi (il log tronca le righe lunghe): avvia.sh lo ricompone in Odin2_report.
const DA_SALVARE = ["successoGiorno", "maturita", "universali", "lezioniArchivio", "diario", "lezioni", "lezioniAuto", "esperienza", "statRoutine", "risorse", "luoghi", "schemi", "obiettivi", "prioritaGratis", "voti", "riflessione", "pericoli", "casse", "spesa", "contaKo"];
function scriviBackup() {
  const dati = { versione: VERSIONE, salvato: adesso() };
  for (const k of DA_SALVARE) if (mem[k] !== undefined) dati[k] = mem[k];
  scriviBlocco("BACKUP", dati);
}
// Ripristino: avvia.sh mette il backup in "ripristino_memoria" solo se l'utente ha preparato ClaudeMinecraft_ripristina.json
function ripristinaBackup() {
  let r;
  try { r = variables.get("ripristino_memoria"); } catch { return; }
  if (!r || typeof r !== "object" || !Array.isArray(r.lezioni) || r.salvato === mem.ripristinatoDa) return;
  for (const k of DA_SALVARE) if (r[k] !== undefined) mem[k] = r[k];
  mem.ripristinatoDa = r.salvato;
  evento(`Memoria ripristinata dal backup del ${r.salvato}: ${r.lezioni.length} lezioni, ${Object.keys(r.esperienza ?? {}).length} abilità`);
}
// Aiuto attivo: se un giocatore vicino non ha piccone o torce glieli porta; se scava al buio gli mette una torcia accanto.
const aiutiDati = new Map();
function aiutoAttivo() {
  if (mem.compito || mem.modalita === "fermo") return;
  for (const p of giocatoriVeri()) {
    if (p.dimension.id !== bot.dimension.id || dist(p.location, bot.location) > 24) continue;
    const c = p.getComponent("minecraft:inventory")?.container;
    if (!c) continue;
    let piccone = false, torce = 0;
    for (let i = 0; i < c.size; i++) { const it = c.getItem(i); if (it?.typeId.endsWith("_pickaxe")) piccone = true; if (it?.typeId === "minecraft:torch") torce += it.amount; }
    const recente = (k) => Date.now() - (aiutiDati.get(`${p.name}|${k}`) ?? 0) < 10 * 60000;
    if (!piccone && !recente("piccone")) {
      const scorta = [...Array(inv(bot).size).keys()].map((i) => inv(bot).getItem(i)).filter((it) => it?.typeId.endsWith("_pickaxe"));
      if (scorta.length >= 2) { aiutiDati.set(`${p.name}|piccone`, Date.now()); assegna({ tipo: "dai", giocatore: p.name, oggetto: scorta[scorta.length - 1].typeId, quantita: 1 }, "autonomia"); parla(`${p.name}, non hai un piccone: te ne porto uno.`); return; }
    }
    const sottoterra = p.location.y < 55;
    if (sottoterra && torce < 4 && contaOggetti(bot, "minecraft:torch") >= 16 && !recente("torce")) {
      aiutiDati.set(`${p.name}|torce`, Date.now()); assegna({ tipo: "dai", giocatore: p.name, oggetto: "torch", quantita: 8 }, "autonomia"); parla(`${p.name}, ti porto 8 torce.`); return;
    }
    // scava al buio e io sono vicino: torcia accanto a lui
    if (sottoterra && dist(p.location, bot.location) < 6 && contaOggetti(bot, "minecraft:torch") > 0 && !recente("luce")) {
      let luce = 15;
      try { luce = p.dimension.getLightLevel({ x: Math.floor(p.location.x), y: Math.floor(p.location.y), z: Math.floor(p.location.z) }); } catch {}
      if (luce < 7) {
        const f = { x: Math.floor(p.location.x), y: Math.floor(p.location.y), z: Math.floor(p.location.z) };
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const q = { x: f.x + dx, y: f.y, z: f.z + dz };
          const b = p.dimension.getBlock(q), sotto = p.dimension.getBlock({ x: q.x, y: q.y - 1, z: q.z });
          if (b?.isAir && sotto && !sotto.isAir && !sotto.isLiquid && piazza(bot, q, "minecraft:torch") === "ok") { aiutiDati.set(`${p.name}|luce`, Date.now() - 9.5 * 60000); break; }
        }
      }
    }
  }
}

// ---------- cicli ----------
// Riflessi: difesa, cibo, compito. 5 volte al secondo.
ogniTick(10, () => { if (mem.spettatore && vivo()) try { inquadra(bot); } catch (e) { errore("spettatore", e); } });

ogniTick(4, () => {
  if (!vivo()) return;
  // il giocatore simulato non nuota da solo: con la testa sott'acqua salta per risalire
  const l = bot.location;
  // fuori dai limiti del mondo (era finito a y 320, il tetto): ogni lettura di blocchi dava errore e il ciclo dei
  // riflessi si fermava del tutto. Torna sul terreno lì sotto, o a casa.
  const lim = bot.dimension.heightRange;
  if (l.y >= lim.max - 2 || l.y < lim.min) {
    const g = suolo(bot.dimension, Math.floor(l.x), Math.floor(l.z));
    const casa = mem.luoghi.casa;
    const dest = g && !g.liquido && g.y < lim.max - 3 ? { x: g.x + 0.5, y: g.y, z: g.z + 0.5 } : casa ? { x: casa.x + 0.5, y: casa.y + 1, z: casa.z + 0.5 } : null;
    if (dest) { bot.clearVelocity(); bot.teleport(dest); notifica(`⚠️ Claude era fuori dal mondo (y ${Math.round(l.y)}): riportato a terra`); evento(`Salvataggio: ero fuori dal mondo (y ${Math.round(l.y)}), torno a ${Math.round(dest.x)},${Math.round(dest.y)},${Math.round(dest.z)}`); }
    return;
  }
  const testaInAcqua = l.y + 1.6 < lim.max && bot.dimension.getBlock({ x: l.x, y: l.y + 1.6, z: l.z })?.isLiquid;
  if (testaInAcqua) bot.jump();
  // Salvataggio: è morto 4 volte in pochi minuti cadendo in grotte e annegando. Se cade nel vuoto
  // (dopo ~3 blocchi) o resta sott'acqua 10 s, torna all'ultimo punto sicuro e lo scavo si interrompe.
  if (bot.isOnGround && !bot.isInWater && !testaInAcqua) ultimoSicuro = { x: l.x, y: l.y, z: l.z, dim: bot.dimension.id };
  sottAcqua = testaInAcqua ? sottAcqua + 1 : 0;
  // con poca vita ogni caduta si ferma; altrimenti solo quelle nel vuoto (non il salto giù da un albero o da un gradino)
  const cade = bot.getVelocity().y < -0.6 && ((bot.getComponent("minecraft:health")?.currentValue ?? 20) <= 8 || vuotoSotto(bot.dimension, l));
  if ((cade || sottAcqua > 50) && ultimoSicuro?.dim === bot.dimension.id && dist(l, ultimoSicuro) > 1.5) {
    bot.clearVelocity();
    // 3 salvataggi in 30 s = il "punto sicuro" non lo è (ieri 40 cadute di fila dallo stesso punto, ogni compito fallito
    // all'istante): via su terreno solido lontano qualche blocco, o a casa
    salvataggi = salvataggi.filter((t) => Date.now() - t < 30000).concat(Date.now());
    if (salvataggi.length >= 3) {
      const casa = mem.luoghi.casa;
      const altrove = terraSicura(bot.dimension, l) ?? (casa ? { x: casa.x + 0.5, y: casa.y + 1, z: casa.z + 0.5 } : null);
      if (altrove) { ultimoSicuro = { ...altrove, dim: bot.dimension.id }; evento(`Salvataggio: cadevo di continuo dallo stesso punto, mi sposto a ${Math.round(altrove.x)},${Math.round(altrove.y)},${Math.round(altrove.z)}`); }
      salvataggi = [];
    }
    bot.teleport(ultimoSicuro);
    sottAcqua = 0;
    const motivo = cade ? "sotto c'era il vuoto (grotta): salvato dalla caduta" : "ero sott'acqua: salvato dall'annegamento";
    evento(`Salvataggio: ${motivo}`);
    segnaPericolo(l, 8, cade ? "grotta (caduta)" : "acqua (annegamento)");
    const c = mem.compito;
    if (c && /raccogli|caccia/.test(c.tipo) && (c.stato.cadute = (c.stato.cadute ?? 0) + 1) < 3) {
      // quella meta porta in una grotta: la si scarta e si cerca la prossima (prima falliva tutto il compito)
      Object.assign(c.stato, { esplora: null, verso: null, galleria: null, lista: [] });
    } else if (c) interrompi(`${motivo} a ${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.z)}; scava altrove`);
    return;
  }
  const inLotta = difendi(bot);
  if (gestisciFame(bot, inLotta) || inLotta) return;
  // riparo d'emergenza: fermo nella tana finché scade (con un giocatore online torna subito disponibile)
  if (inEmergenza(bot) && !giocatoriVeri().length && mem.compito?.tipo !== "tana") return;
  // passo successivo del piano, senza chiamare l'API
  if (!mem.compito && mem.coda.length && !progettando) {
    const prossimo = mem.coda.shift();
    if (prossimo.tipo === "costruisci" && !prossimo.blocchi) {
      progettando = true;
      progetta(bot, prossimo, "piano").catch((e) => errore("progetto", e)).finally(() => { progettando = false; });
    } else assegna(prossimo, "piano");
  }
  eseguiCompito(bot);
});
let progettando = false, ultimaRonda = -1e9, soffocamenti = [];
let ultimoSicuro = null, sottAcqua = 0, salvataggi = [];
// terreno solido all'aperto a 8-16 blocchi, fuori dalle zone pericolose
function terraSicura(dim, l) {
  for (const [dx, dz] of [[8, 0], [-8, 0], [0, 8], [0, -8], [12, 12], [-12, -12], [12, -12], [-12, 12], [16, 0], [0, 16]]) {
    const g = suolo(dim, Math.floor(l.x) + dx, Math.floor(l.z) + dz);
    if (g && !g.liquido && !inPericolo(g)) return { x: g.x + 0.5, y: g.y, z: g.z + 0.5 };
  }
  return null;
}

// Cervello: decide quando chiedere a Claude.
let ultimaDecisione = 0;
let pianiVuoti = 0;
ogniTick(20, () => {
  if (!vivo() || cervello.inCorso) return;
  let motivo = null, da = "autonomia";
  if (chatPendente) {
    ({ da } = chatPendente);
    motivo = `${chatPendente.da} ti ha scritto in chat: "${chatPendente.testo}"`;
    const mittente = chatPendente.da;
    chatPendente = null;
    // risparmio: ordini brevi a Haiku, domande e richieste lunghe a Sonnet
    const breve = !/\?/.test(motivo) && motivo.split(/\s+/).length <= 14; // ~6 parole del giocatore + la cornice
    // il proprietario comanda: l'etichetta ricorda al modello che va eseguito subito (prima rimandava "a quando è giorno").
    // I suoi messaggi vanno sempre a Sonnet: Haiku tendeva a eseguire a metà (esplora invece di minare).
    const dalProprietario = mittente.toLowerCase() === CFG.proprietario.toLowerCase();
    if (dalProprietario) motivo += " [MESSAGGIO DEL PROPRIETARIO: se è un ordine, assegna SUBITO il compito richiesto, non uno più prudente]";
    pensa(bot, motivo, da, breve && !dalProprietario ? "rapido" : "medio").then((ok) => { if (!ok) parla(`${mittente}, non riesco a ragionare: ${cervello.errore || "motivo sconosciuto"}`); });
    ultimaDecisione = system.currentTick;
    return;
  }
  // offline gli avvisi (soprattutto fallimenti) si raccolgono e vanno al cervello al massimo una volta al minuto, in un'unica chiamata
  // modalità zero: senza giocatori online gli avvisi non vanno all'IA (le lezioni le scrive il codice)
  if (!giocatoriVeri().length) notifiche.length = 0;
  const attesaAvvisi = giocatoriVeri().length ? 600 : 1200; // online una chiamata ogni 30 s con tutti gli avvisi insieme
  if (notifiche.length && system.currentTick - ultimiAvvisi >= attesaAvvisi) { motivo = notifiche.splice(0).slice(-8).join("; "); ultimiAvvisi = system.currentTick; }
  else {
    // Niente controlli mentre lavora: si risparmia. Ci pensa quando resta senza niente da fare.
    if (mem.compito || mem.coda.length || progettando) { pianiVuoti = 0; return; }
    const online = giocatoriVeri().length > 0;
    if (!online && !CFG.senzaGiocatori) return;
    const autonomo = mem.modalita === "autonomo";
    // risparmio: senza giocatori, o se l'API ha pianificato da meno di 15 min, il piano lo sceglie il codice (gratis)
    // budget finito: continua a lavorare col piano gratis invece di restare fermo
    if (autonomo && (!online || !budgetOk() || system.currentTick - ultimoPianoApi < 18000)) {
      if (system.currentTick - ultimaDecisione < 200) return;
      ultimaDecisione = system.currentTick;
      if (notteFuori()) return;
      const r = pianoGratis();
      if (r === "casa") { const d = mem.luoghi.casetta ?? mem.luoghi.casa; evento(`Piano gratis: è notte, torno ${mem.luoghi.casetta ? "nella casetta" : "a casa"}`); assegna({ tipo: "vai", x: d.x, y: d.y, z: d.z }, "piano"); return; }
      if (r === "ronda" && mem.luoghi.casetta) {
        // con la casetta la notte la passa dentro, al riparo
        const d = mem.luoghi.casetta;
        if (dist(bot.location, d) > 2) assegna({ tipo: "vai", x: d.x, y: d.y, z: d.z }, "piano");
        return;
      }
      if (r === "ronda") {
        if (system.currentTick - ultimaRonda < 2400) return; // un giro di ronda ogni 2 minuti, non di continuo
        ultimaRonda = system.currentTick;
        const c = mem.luoghi.casa, a = Math.random() * Math.PI * 2; assegna({ tipo: "vai", x: c.x + Math.round(Math.cos(a) * 6), y: c.y, z: c.z + Math.round(Math.sin(a) * 6) }, "piano"); return; }
      if (r?.startsWith("miniera:")) { evento(`Piano gratis: ${r}`); assegna({ tipo: "miniera_rami", minerale: r.split(":")[1], routine: r }, "piano"); return; }
      if (r === "compito:casetta") mem.ultimaCasetta = Date.now();
      if (r?.startsWith("compito:")) { evento(`Piano gratis: ${r}`); assegna({ tipo: r.slice(8), routine: r }, "piano"); return; }
      if (r?.startsWith("crafta:")) { evento(`Piano gratis: ${r}`); assegna({ tipo: "crafta", oggetto: r.slice(7), routine: r }, "piano"); return; }
      if (r) { evento(`Piano gratis: routine ${r}`); assegna({ tipo: "routine", nome: r }, "piano"); return; }
      // tutte fallite di recente: la zona è povera, esplora in una direzione a caso per trovare animali e roccia
      if (!online) { const dir = ["nord", "sud", "est", "ovest"][Math.floor(Math.random() * 4)]; assegna({ tipo: "esplora", direzione: dir, lunghezza: 80 }, "piano"); return; }
    }
    if (!online) return; // senza giocatori nessuna chiamata per pianificare
    // mai fermo: senza lavoro pianifica dopo 10 s; se il cervello non trova niente, riprova più piano (fino a 1 min)
    const intervallo = autonomo ? Math.min(1200, 200 * 2 ** pianiVuoti) : 6000;
    if (system.currentTick - ultimaDecisione < intervallo) return;
    motivo = autonomo ? "nessun compito e piano vuoto: pianifica le prossime attività" : `controllo in modalità ${mem.modalita}`;
    if (autonomo) ultimoPianoApi = system.currentTick;
    pianiVuoti = Math.min(pianiVuoti + 1, 4);
  }
  ultimaDecisione = system.currentTick;
  // risparmio: Opus solo per le morti; Sonnet per pianificare e dopo 3 fallimenti di fila; Haiku per il resto
  if (sessione.compitiOk !== okVisti) { okVisti = sessione.compitiOk; koDiFila = 0; }
  if (/fallito/.test(motivo)) koDiFila++;
  // offline sempre Haiku: con i fallimenti a raffica la regola dei 3 di fila mandava quasi tutto a Sonnet ($1/ora di notte)
  const online = giocatoriVeri().length > 0;
  pensa(bot, motivo, da, /morto|morte/.test(motivo) || (online && (/pianifica/.test(motivo) || koDiFila >= 3)) ? "medio" : "rapido"); // Opus solo per progetti e riflessione
});
let ultimoPianoApi = -18000, okVisti = 0, koDiFila = 0, ultimiAvvisi = -1200;

// Pilota automatico gratis: sceglie una routine guardando l'inventario, senza chiamare l'API.
// Salta le routine fallite negli ultimi 10 minuti (es. cibo senza animali in zona) e passa alla successiva.
function pianoGratis() {
  const ha = (f) => contaOggetti(bot, f);
  const notte = world.getTimeOfDay() >= 12500 && world.getTimeOfDay() < 23000;
  const candidati = [];
  const minuti = (t) => (Date.now() - (t ?? 0)) / 60000;
  const vuoti = [...Array(inv(bot).size).keys()].filter((i) => !inv(bot).getItem(i)).length;
  const valida = (c) => (ROUTINE[c] || /^(miniera|compito|crafta):/.test(c)) && !(system.currentTick - (routineKo.get(c) ?? -1e9) < 12000) && !routineInPausa(c, bot);
  if (!notte && !traslocoNelBosco(bot)) spostaBaseSeAllagata(bot);
  // ritmo giorno/notte: di notte lontano da casa prima si torna; vicino a casa solo lavori sicuri, poi la ronda
  if (notte && mem.luoghi.casa) {
    if (dist(bot.location, mem.luoghi.casa) > 24) return "casa";
    const sicuri = [];
    if (vuoti < 6) sicuri.push("compito:sistema_deposito");
    // lavori accanto a casa, sicuri anche di notte
    if (!mem.luoghi.fornace && (ha("minecraft:furnace") || ha("#pietra") >= 8)) sicuri.push("compito:fornace");
    if (ha((id) => id.endsWith("_sapling")) >= 2 && minuti(mem.ultimoBosco) > 120) sicuri.push("compito:bosco");
    if (mem.luoghi.fattoria && minuti(mem.ultimaFattoria) > 5) sicuri.push("compito:fattoria");
    if (minuti(mem.ultimaRiproduzione) > 6 && ha("minecraft:wheat") >= 2) sicuri.push("compito:alleva");
    if (ha("minecraft:torch") >= 10 && minuti(mem.illuminata) > 24 * 60) sicuri.push("compito:illumina");
    return sicuri.find(valida) ?? "ronda";
  }
  if (vuoti < 6 && (mem.luoghi.casa || mem.luoghi.deposito)) candidati.push("compito:sistema_deposito");
  // catena della crescita: fornace fissa (senza, fondi falliva l'80%), bosco accanto a casa (legna sempre vicina), casetta vera
  if (mem.luoghi.casa && !mem.luoghi.fornace && (ha("minecraft:furnace") || ha("#pietra") >= 8)) candidati.push("compito:fornace");
  if (mem.luoghi.casa && ha((id) => id.endsWith("_sapling")) >= 2 && minuti(mem.ultimoBosco) > 120) candidati.push("compito:bosco");
  if (!ha((id) => id.endsWith("_pickaxe"))) candidati.push("kit_legno");
  if (!ha((id) => /(stone|copper|iron|diamond|netherite)_pickaxe$/.test(id))) candidati.push("attrezzi_pietra");
  // senza corazza l'armatura di rame viene prima di cibo, torce e deposito: basta avere il rame o sapere dov'è, e un piccone
  // che lo scava (10/11: rinato senza armatura con 6 lingotti, il piano ha scelto deposito, fattoria e allevamento: 2 morti di giorno)
  const corazza = bot.getComponent("minecraft:equippable")?.getEquipment("Chest")?.typeId ?? "";
  // anche con la corazza addosso, finché manca un pezzo (elmo, gambali, stivali): la routine fa solo quelli che mancano
  const eqA = bot.getComponent("minecraft:equippable");
  const incompleta = ["Head", "Chest", "Legs", "Feet"].some((p) => !eqA?.getEquipment(p));
  if (incompleta && !/(iron|diamond|netherite)_chestplate$/.test(corazza) && (ha("minecraft:raw_copper") + ha("minecraft:copper_ingot") >= 8
    || ((mem.risorse?.copper_ore ?? []).length > 0 && ha((id) => /(stone|copper|iron|diamond|netherite)_pickaxe$/.test(id))))) candidati.push("armatura_rame");
  if (scortaCibo(bot) < 6) candidati.push("cibo", ...(mem.luoghi.fattoria && minuti(mem.ultimaFattoria) > 5 ? ["compito:fattoria"] : []));
  if (ha("minecraft:torch") < 8) candidati.push("torce", "carbonella");
  if (notte && !mem.luoghi.casa) candidati.push("notte_sicura");
  const pickFerro = ha((id) => /(iron|diamond|netherite)_pickaxe$/.test(id));
  // ferro: prima la miniera a rami (porta minerale vero), poi la routine che fonde e crafta (i lingotti mancanti li procura da sola)
  if (!pickFerro && ha("minecraft:raw_iron") + ha("minecraft:iron_ingot") < 3) candidati.push("miniera:ferro");
  if (!pickFerro) candidati.push("attrezzi_ferro");
  if (!ha((id) => /(iron|diamond|netherite)_chestplate$/.test(id)) && !/(iron|diamond|netherite)_chestplate$/.test(corazza)) candidati.push("armatura_ferro");
  if (mem.luoghi.casa && !mem.luoghi.casetta && minuti(mem.ultimaCasetta) > 30) candidati.push("compito:casetta");
  if (!ha((id) => /_bed$/.test(id))) candidati.push("letto");
  if (pickFerro && ha("minecraft:diamond") < 3) candidati.push("miniera:diamanti");
  // fattoria, allevamento e base: cibo infinito vicino a casa e niente mostri intorno
  if (mem.luoghi.casa && (!mem.luoghi.fattoria || minuti(mem.ultimaFattoria) > 15)) candidati.push("compito:fattoria");
  const coppia = (t, cibo) => ha(cibo) >= 2 && bot.dimension.getEntities({ type: `minecraft:${t}`, location: bot.location, maxDistance: 24 }).length >= 2;
  if (minuti(mem.ultimaRiproduzione) > 6 && (coppia("cow", "minecraft:wheat") || coppia("sheep", "minecraft:wheat") || coppia("pig", "minecraft:carrot") || coppia("chicken", "minecraft:wheat_seeds"))) candidati.push("compito:alleva");
  if (mem.luoghi.casa && ha("minecraft:torch") >= 10 && minuti(mem.illuminata) > 24 * 60) candidati.push("compito:illumina");
  if (pickFerro && !ha("minecraft:shield") && !bot.getComponent("minecraft:equippable")?.getEquipment("Offhand")) candidati.push("crafta:shield");
  if (mem.luoghi.casa && !mem.luoghi.muro_base && ha((id) => /(iron|diamond|netherite)_chestplate$/.test(id))) candidati.push("compito:base_sicura");
  // riempitivi: prima l'ordine deciso dalla riflessione giornaliera di Opus, poi il tasso di successo misurato
  const prio = mem.prioritaGratis ?? [];
  const successo = (n) => { const s = mem.statRoutine?.[n]; return ((s?.ok ?? 0) + 1) / ((s?.ok ?? 0) + (s?.ko ?? 0) + 2); };
  const riempitivi = ["rifornisci_deposito", "cibo", "torce", "miniera:ferro", "vetro"]
    .sort((a, b) => ((prio.indexOf(a) + 1) || 99) - ((prio.indexOf(b) + 1) || 99) || successo(b) - successo(a));
  candidati.push(...riempitivi);
  // zona povera per quella routine (3 fallimenti e nessun successo qui): la salta finché non cambia zona
  const zona = zonaDi(bot.location);
  const povera = (n) => { const z = mem.statRoutine?.[n]?.zone?.[zona]; return z && z.ko >= 3 && z.ok === 0; };
  return candidati.find((c) => (ROUTINE[c] || /^(miniera|compito|crafta):/.test(c)) && !(system.currentTick - (routineKo.get(c) ?? -1e9) < 12000) && !routineInPausa(c, bot) && (!povera(c) || ((c === "cibo" || c === "compito:fattoria") && affamato(bot))));
}

// Salvataggio ogni 30 secondi, armatura ogni 10, rapporto ogni 15 minuti.
ogniTick(600, () => {
  if (vivo()) {
    const l = bot.location;
    mem.pos = { x: l.x, y: l.y, z: l.z, dim: bot.dimension.id };
    mem.inventario = istantaneaInventario(bot, true);
  }
  if (pronto) salva();
});
// Prestazioni: 200 tick dovrebbero durare 10 s; se durano di più il server è in affanno e il bot alleggerisce il lavoro.
let tUltimo = Date.now(), giro200 = 0;
ogniTick(200, () => {
  const ora = Date.now();
  const tps = Math.min(20, 200 / Math.max(0.5, (ora - tUltimo) / 1000));
  tUltimo = ora;
  prestazioni.tps = tps; prestazioni.lento = tps < 12;
  sessione.tpsMedia = sessione.tpsMedia ? sessione.tpsMedia * 0.9 + tps * 0.1 : tps;
  sessione.tpsMin = Math.min(sessione.tpsMin ?? 20, tps);
  giro200++;
  if (!vivo()) return;
  indossaArmatura(bot); procuraSpada(bot);
  // server lento: mappa delle risorse e inventario una volta ogni tre giri invece che ogni giro
  if (!prestazioni.lento || giro200 % 3 === 0) { annotaRisorse(bot); riordinaInventario(bot); }
});
// Battito ogni 2 minuti: avvia.sh lo controlla e, se lo script si blocca, lo ricarica da solo
ogniTick(2400, () => console.log(`[Claude][BATTITO] ${adesso()} tps ${prestazioni.tps.toFixed(1)} media ${(sessione.tpsMedia ?? 20).toFixed(1)} min ${(sessione.tpsMin ?? 20).toFixed(1)} | compito ${mem.compito?.tipo ?? "nessuno"} | spesa oggi $${mem.spesa.usd.toFixed(3)}`));
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
    vista: (() => { try { return vista(bot); } catch (e) { errore("vista", e); return null; } })(),
  });
});
ogniTick(2400, () => {
  if (!pronto) return;
  // andamento giornaliero della maturazione (un valore al giorno, l'ultimo del giorno)
  const m = maturita();
  {
    const g = adesso().slice(0, 10), tot = Object.entries(mem.esperienza).filter(([t]) => !/^(routine|fermo)$/.test(t)).reduce((a, [, e]) => [a[0] + e.ok, a[1] + e.ko], [0, 0]);
    const sg = (mem.successoGiorno ??= []);
    if (sg.at(-1)?.g === g) { sg.at(-1).ok = tot[0]; sg.at(-1).ko = tot[1]; } else sg.push({ g, ok: tot[0], ko: tot[1] });
    if (sg.length > 365) sg.shift();
  }
  if (m) { const g = adesso().slice(0, 10), st = (mem.maturita ??= []); if (st.at(-1)?.g === g) st.at(-1).v = m.totale; else st.push({ g, v: m.totale }); if (st.length > 365) st.shift(); }
  scriviBlocco("MEMORIA", { lezioni: mem.lezioni, lezioniAuto: mem.lezioniAuto ?? [], luoghi: mem.luoghi, risorse: mem.risorse ?? {}, pericoli: mem.pericoli ?? [],
    casse: mem.casse ?? {}, esperienza: mem.esperienza, statRoutine: mem.statRoutine ?? {}, priorita: mem.prioritaGratis ?? [], riflessione: mem.riflessione ?? null,
    schemi: Object.keys(mem.schemi ?? {}), obiettivi: mem.obiettivi, voti: mem.voti ?? null, diagnosi: sessione.diagnosi ?? [], universali: (mem.universali ?? []).map((u) => u.t), maturita: mem.maturita ?? [] });
});
// contatori cumulativi salvati ogni minuto: al prossimo avvio diventano la base
ogniTick(1200, () => { if (pronto && vivo()) mem.ultimiContatori = contatori(); });
// Backup della memoria ogni 30 minuti (avvia.sh lo salva in Odin2_report, quindi anche su Drive)
ogniTick(36000, () => { if (pronto) scriviBackup(); });
ogniTick(18000, () => stampaRapporto("periodico", statoAttuale()));
// riflessione giornaliera di Opus (Batch API): invio una volta al giorno, controllo della risposta ogni 5 minuti
ogniTick(6000, () => { if (pronto) riflessione(); });

// Proattività: avvisa il cervello quando arriva la notte o un giocatore è in difficoltà (una volta per evento).
const giaAvvisati = new Map();
let notteAvvisata = false;
ogniTick(100, () => {
  if (!vivo()) return;
  const ora = world.getTimeOfDay();
  const notte = ora >= 12500 && ora < 23000;
  if (notte && !notteAvvisata && giocatoriVeri().length) avvisa("sta calando la notte: organizzati (lavoro sicuro vicino a casa, giocatori protetti)");
  // offline: di notte molla i lavori e si ripara (di notte creeper e scheletri lo uccidevano lontano da casa). Si controlla per
  // tutta la notte e non solo al tramonto: il 10/11 al tramonto era a 20 blocchi da casa, il compito lo ha poi portato lontano
  // e ha cercato rame al buio per 7 minuti (4 morti in 8 minuti). Con un lavoro in corso il pilota non passa da notteFuori.
  else if (notte && !giocatoriVeri().length && mem.compito && mem.compito.routine !== "notte_sicura"
    && !/^(tana|vai|fattoria|alleva|illumina|sistema_deposito|recupera)$/.test(mem.compito.tipo) && !notteFuori()
    && mem.luoghi.casa && dist(bot.location, mem.luoghi.casa) > 24) {
    mem.coda = [];
    assegna({ tipo: "vai", x: mem.luoghi.casa.x, y: mem.luoghi.casa.y, z: mem.luoghi.casa.z }, "piano");
    evento("Notte: torno a casa");
  }
  notteAvvisata = notte;
  aiutoAttivo();
  for (const p of giocatoriVeri()) {
    const vita = p.getComponent("minecraft:health")?.currentValue ?? 20;
    const fame = p.getComponent("minecraft:player.hunger")?.currentValue ?? 20;
    if ((vita <= 8 || fame <= 6) && Date.now() - (giaAvvisati.get(p.name) ?? 0) > 120000) {
      giaAvvisati.set(p.name, Date.now());
      // riflesso gratis: se ha cibo cotto glielo porta subito, senza aspettare il cervello
      const cibo = Object.keys(CIBO).find((id) => contaOggetti(bot, id) > 0);
      if (cibo && !mem.compito) { assegna({ tipo: "dai", giocatore: p.name, oggetto: cibo, quantita: Math.min(4, contaOggetti(bot, cibo)) }, "autonomia"); parla(`${p.name}, ti porto da mangiare.`); continue; }
      avvisa(`${p.name} è in difficoltà (vita ${Math.round(vita)}/20, fame ${Math.round(fame)}/20): aiutalo (cibo, difesa, riparo)`);
    }
  }
});
// Riordino delle lezioni: quando sono tante, o ogni 30 minuti se ce ne sono almeno 12.
let ultimoRiordino = 0;
ogniTick(1200, () => {
  const trascorso = system.currentTick - ultimoRiordino;
  // al massimo ogni 10 minuti, anche se fallisce; senza urgenza ogni 30
  // al massimo ogni ora, e solo con la memoria quasi piena: il riordino vero lo fa la riflessione giornaliera di Opus
  if (!vivo() || trascorso < 72000 || mem.lezioni.length < 22) return;
  ultimoRiordino = system.currentTick;
  riordinaLezioni();
});
