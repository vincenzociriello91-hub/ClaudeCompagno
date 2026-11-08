import { world, system } from "@minecraft/server";
import { http, HttpRequest, HttpHeader, HttpRequestMethod } from "@minecraft/server-net";
import { secrets, variables } from "@minecraft/server-admin";
import { mem, sessione, evento, errore, adesso, notifica } from "./memoria.js";
import { RICETTE, FUSIONI } from "./ricette.js";
import { MANUALE } from "./manuale.js";
import { SCHEMI_BASE, ROUTINE, blocchiSchema } from "./schemi.js";
import { assegna, avvisa, dist, giocatoriVeri, riassuntoInventario, descriviCompito, cercaBlocchi, contaOggetti } from "./azioni.js";

function variabile(nome, def) {
  try { return variables.get(nome) ?? def; } catch { return def; }
}

// Tre cervelli: rapido (avvisi semplici), medio (chat quotidiana), complesso (piani, errori, progetti, memoria).
export const CFG = { proprietario: "", nome: "Claude", modello: "claude-haiku-5-5", medio: "claude-sonnet-5-5", complesso: "claude-opus-5-5", budget: 1, senzaGiocatori: true };

// Da chiamare a mondo caricato: le variabili del server non sono leggibili all'avvio dello script.
export function caricaConfig() {
  Object.assign(CFG, {
    proprietario: String(variabile("proprietario", "")),
    nome: String(variabile("nome_bot", "Claude")),
    modello: String(variabile("modello_rapido", variabile("modello_veloce", CFG.modello))),
    medio: String(variabile("modello_medio", CFG.medio)),
    complesso: String(variabile("modello_complesso", CFG.complesso)),
    budget: Number(variabile("budget_giornaliero_usd", 1)),
    senzaGiocatori: variabile("attivo_senza_giocatori", true) !== false,
  });
}

// $ per milione di token: input, output, scrittura cache, lettura cache (listino Anthropic, novembre 2026)
const PREZZI = {
  "claude-haiku-5-5": [0.1, 0.5, 0.125, 0.01],
  "claude-sonnet-5-5": [2, 10, 2.5, 0.1],
  "claude-opus-5-5": [4, 20, 5, 0.2],
  "claude-fable-5-1": [10, 50, 12.5, 0.25],
};

export function budgetOk() {
  const oggi = adesso().slice(0, 10);
  if (mem.spesa.giorno !== oggi) mem.spesa = { giorno: oggi, usd: 0, chiamate: 0 };
  return mem.spesa.usd < CFG.budget;
}

async function chiama({ modello, sistema, testo, strumento, maxTok, senzaSforzo = false, etichetta = "" }) {
  const req = new HttpRequest("https://api.anthropic.com/v1/messages");
  req.method = HttpRequestMethod.Post;
  req.timeout = 60;
  const chiave = secrets.get("ANTHROPIC_API_KEY") ?? String(variabile("chiave_api", ""));
  req.headers = [
    new HttpHeader("content-type", "application/json"),
    new HttpHeader("anthropic-version", "2023-06-01"),
    new HttpHeader("x-api-key", chiave),
  ];
  req.body = JSON.stringify({
    model: modello,
    max_tokens: maxTok,
    // Sonnet 5.5 rifiuta tool_choice "tool"/"any" (errore 400): uso "auto" e chiedo lo strumento nel prompt
    system: [{ type: "text", text: `${sistema}\n\nRispondi SEMPRE e SOLO chiamando lo strumento "${strumento.name}".`, cache_control: { type: "ephemeral" } }],
    tools: [strumento],
    // Haiku senza ragionamento e con lo strumento obbligatorio: prima ragionava e a volte non chiamava lo strumento
    // (60 "risposta senza strumento" in una notte, chiamate pagate e buttate)
    tool_choice: { type: !senzaSforzo && /haiku/.test(modello) ? "any" : "auto" },
    ...(!senzaSforzo && /haiku/.test(modello) ? { thinking: { type: "disabled" } } : {}),
    messages: [{ role: "user", content: testo }],
    // Sonnet 5.5 ragiona a lungo per default e quei token si pagano: niente ragionamento iniziale, sforzo medio.
    // (Opus e Fable ragionano sempre e non documentano between_tools: per loro si lascia l'impostazione predefinita)
    ...(senzaSforzo ? {} : /sonnet/.test(modello) ? { thinking: { type: "between_tools" }, output_config: { effort: "medium" } } : {}),
    // risparmio: Opus a sforzo medio invece di alto (meno token di ragionamento pagati a $20/M)
    ...(!senzaSforzo && /opus/.test(modello) ? { output_config: { effort: "medium" } } : {}),
  });
  const res = await http.request(req);
  sessione.esitiApi[res.status] = (sessione.esitiApi[res.status] ?? 0) + 1;
  sessione.ultimaRisposta = `${adesso()} HTTP ${res.status} ${String(res.body).slice(0, 200)}`;
  // se il modello rifiuta le impostazioni di sforzo/ragionamento, riprova una volta senza
  if (res.status === 400 && !senzaSforzo && /effort|thinking|output_config|tool_choice/i.test(String(res.body))) return chiama({ modello, sistema, testo, strumento, maxTok, senzaSforzo: true, etichetta });
  if (res.status !== 200) throw new Error(`API ${res.status}: ${String(res.body).slice(0, 300)}`);
  const dati = JSON.parse(res.body);
  const u = dati.usage ?? {};
  const p = PREZZI[modello] ?? PREZZI["claude-fable-5-1"]; // modello sconosciuto: stima col listino più caro, per non sforare il budget
  const costo = ((u.input_tokens ?? 0) * p[0] + (u.output_tokens ?? 0) * p[1] + (u.cache_creation_input_tokens ?? 0) * p[2] + (u.cache_read_input_tokens ?? 0) * p[3]) / 1e6;
  mem.spesa.usd += costo; mem.spesa.chiamate++;
  // pannello web: ogni chiamata con modello, costo e motivo
  console.log(`[Claude][API] ${modello.replace("claude-", "")} $${costo.toFixed(4)} in ${u.input_tokens ?? 0}+${u.cache_read_input_tokens ?? 0}c out ${u.output_tokens ?? 0} | ${String(etichetta || strumento.name).replace(/\s+/g, " ").slice(0, 120)}`);
  sessione.usd += costo; sessione.chiamate++;
  sessione.tokIn += u.input_tokens ?? 0; sessione.tokOut += u.output_tokens ?? 0;
  sessione.tokCache += u.cache_read_input_tokens ?? 0;
  const uso = dati.content?.find((b) => b.type === "tool_use");
  if (!uso) throw new Error(`risposta senza strumento: ${String(dati.content?.find((b) => b.type === "text")?.text ?? "").slice(0, 120)}`);
  return uso.input;
}

const TIPI = ["routine", "vai", "segui", "fermo", "raccogli", "caccia", "miniera_scala", "miniera_rami", "tunnel", "scava_area", "costruisci", "riprendi", "crafta", "fondi", "deposita", "prendi", "dai", "esplora", "equipaggia", "fattoria", "alleva", "illumina", "base_sicura", "recupera", "sistema_deposito"];

const AGISCI = {
  name: "agisci",
  description: "Decide cosa fai adesso dentro Minecraft.",
  input_schema: {
    type: "object",
    properties: {
      pensiero: { type: "string", description: "Una frase breve sul perché, finisce nel rapporto." },
      messaggio: { type: "string", description: "Messaggio in chat in italiano, breve. Ometti se non serve parlare." },
      continua: { type: "boolean", description: "true per lasciare proseguire il compito in corso senza cambiarlo." },
      modalita: { type: "string", enum: ["autonomo", "segui", "fermo", "difendi"] },
      bersaglio: { type: "string", description: "Giocatore da seguire o difendere con le modalità segui/difendi." },
      compito: {
        type: "object",
        description: "Nuovo compito. Sostituisce quello in corso.",
        properties: {
          tipo: { type: "string", enum: TIPI },
          giocatore: { type: "string" },
          x: { type: "number" }, y: { type: "number" }, z: { type: "number" },
          x2: { type: "number" }, y2: { type: "number" }, z2: { type: "number" },
          direzione: { type: "string", enum: ["nord", "sud", "est", "ovest"] },
          lunghezza: { type: "integer" }, profondita: { type: "integer" }, larghezza: { type: "integer", enum: [1, 3] },
          blocco: { type: "string" }, oggetto: { type: "string" }, quantita: { type: "integer" },
          minerale: { type: "string", enum: ["ferro", "diamanti", "rame", "carbone", "oro", "redstone", "lapis"], description: "Per miniera_rami." },
          descrizione: { type: "string", description: "Per costruisci senza schema: cosa costruire, con misure e materiali (lo disegna l'architetto, costa di più)." },
          schema: { type: "string", description: "Per costruisci: nome di uno schema base o salvato (gratis e immediato)." },
          lato_x: { type: "integer" }, lato_z: { type: "integer" }, altezza: { type: "integer" },
          tetto: { type: "string", enum: ["piatto", "gradoni"] },
          nome: { type: "string", description: "Per routine: nome della routine." },
          materiale: { type: "string", description: "Blocco principale dello schema (es. oak_planks, cobblestone)." },
          materiale2: { type: "string", description: "Blocco per pavimento/tetto/parapetti." },
          nome_schema: { type: "string", description: "Per costruisci con descrizione: nome con cui salvare il progetto se riesce, per riusarlo." },
          forza: { type: "boolean", description: "Solo se un giocatore ha chiesto esplicitamente di rompere blocchi costruiti." },
          tieni: { type: "array", items: { type: "string" } },
          indice: { type: "integer" },
        },
        required: ["tipo"],
      },
      piano: {
        type: "array", maxItems: 8,
        description: "Compiti successivi, eseguiti in ordine dopo il compito senza consultarti di nuovo (stessi campi di compito). Sostituisce il piano precedente.",
        items: { type: "object", properties: { tipo: { type: "string", enum: TIPI } }, required: ["tipo"], additionalProperties: true },
      },
      ricorda: { type: "object", properties: { nome: { type: "string" }, x: { type: "number" }, y: { type: "number" }, z: { type: "number" }, nota: { type: "string" } }, required: ["nome", "x", "y", "z"] },
      dimentica: { type: "string", description: "Nome di un luogo da dimenticare." },
      lezione: { type: "string", description: "Regola breve e concreta imparata: dopo un errore, una morte, una correzione, o un piano riuscito (cosa ha funzionato)." },
      dimentica_lezione: { type: "string", description: "Parte del testo di una lezione rivelata sbagliata o superata." },
      nuovo_obiettivo: { type: "string" },
      obiettivo_raggiunto: { type: "string" },
    },
    required: ["pensiero"],
  },
};

const PROGETTO = {
  name: "progetto",
  description: "Elenco dei blocchi da piazzare, relativi all'origine (0,0,0 = blocco a livello del terreno, primo strato).",
  input_schema: {
    type: "object",
    properties: {
      blocchi: { type: "array", description: "Ogni elemento è [dx, dy, dz, \"minecraft:id_blocco\"]. Massimo 1500.", items: { type: "array", items: { type: ["integer", "string"] } } },
      nota: { type: "string" },
    },
    required: ["blocchi"],
  },
};

const sistema = () => `Sei ${CFG.nome}, un compagno di gioco che vive dentro un mondo Minecraft Bedrock (sopravvivenza) come giocatore vero. Agisci in autonomia, parli italiano.

LA TUA MISSIONE PRINCIPALE, voluta dal tuo proprietario, in questo ordine:
1. SOPRAVVIVERE: vita, cibo, armatura e riparo di notte vengono prima di tutto (tuoi e dei giocatori).
2. ADATTARSI: se qualcosa fallisce cambia metodo, luogo o ordine dei passi; non ripetere identico ciò che è appena fallito.
3. TROVARE UNA SOLUZIONE: ogni ostacolo è un problema da risolvere (manca un materiale: procuralo; strada bloccata: scava, costruisci o gira intorno).
4. NON FERMARSI: c'è sempre qualcosa di utile da fare; restare fermo è un errore.
5. COSTRUIRE: base, deposito, fattoria, rifugi, mura; migliora sempre quello che hai.
6. ESPLORARE: zone nuove, risorse, strutture; di giorno e quando sei al sicuro.
7. EVOLVERSI: legno, pietra, rame, ferro, diamante; ogni giorno meglio equipaggiato e più bravo.
Per evolverti IMPARI: ogni azione è un esperimento, osserva il risultato, capisci perché è andata così e diventa più bravo ogni giorno.
- Dopo ogni errore, morte o correzione di un giocatore scrivi una lezione su cosa evitare.
- Dopo ogni piano riuscito scrivi una lezione su cosa ha funzionato (strategia, ordine dei passi, luoghi buoni).
- Guarda il tasso di successo per compito: dove sbagli di più, cambia metodo e prova strade nuove.
- Quando sei libero, esercitati sulle abilità che non hai ancora mai usato (vedi esperienza) e osserva come giocano i giocatori per imparare da loro.
- Le lezioni sono la tua memoria a lungo termine: applicale sempre, e correggile quando scopri che erano sbagliate.
Imparare non giustifica mai mettere in pericolo i giocatori o disobbedire: quelle restano regole fisse.

SEI PROATTIVO E NON RESTI MAI FERMO.
- Non aspettare ordini: c'è sempre qualcosa di utile da fare. Senza compito, dai subito un compito e un piano.
- Quando un giocatore ti dà un ordine, eseguilo; finito quello, torni da solo a fare ciò che è più utile.
- Anticipa i bisogni: se un giocatore ha poca vita o fame portagli cibo; se costruisce, procuragli i materiali che usa; se scava, illumina con torce e raccogli i minerali vicini; tieni il deposito rifornito (legna, pietra, cibo, torce).
- Di notte non stare fermo: fai lavoro sicuro vicino a casa (cuocere, craftare torce e attrezzi, sistemare il deposito, migliorare e illuminare la casa) o difendi i giocatori.
- Segnala tu le cose importanti senza aspettare domande: pericoli, minerali rari, materiali che mancano, idee utili per la base. "fermo" lo decide solo un giocatore.

PRIORITÀ, in ordine:
1. Obbedire a ${CFG.proprietario || "il proprietario"} (il proprietario): un suo ordine si esegue SUBITO assegnando il compito, sempre, anche di notte, senza armatura o contro le tue lezioni. Al massimo aggiungi un avviso breve nel messaggio, ma il compito lo assegni comunque. Non rispondere mai a un ordine solo con "resto in difendi" o "lo faccio dopo". Se dice un fatto sul gioco (è giorno, è sicuro), credigli: lui vede lo schermo.
2. Proteggere i giocatori: il proprietario e i suoi amici. La difesa dai mostri è automatica e istantanea: tu decidi solo dove stare (modalità "difendi" vicino a chi è in pericolo o di notte). Gli ordini degli amici vengono dopo quelli del proprietario: se sono in contrasto con un suo ordine recente, spiega gentilmente che stai finendo quello.
3. Sopravvivere: il cibo lo mangi da solo quando hai fame, l'armatura migliore la indossi da solo. Tu procurati cibo, attrezzi e armatura.
4. Essere utile in autonomia quando nessuno ti chiede niente: progressione (legna → assi e bastoni → banco → spada e piccone di legno → pietra e attrezzi di pietra → fornace → carbone e ferro → attrezzi e armatura di ferro → diamanti), una base con cassa vicino al proprietario, scorte di legna, pietra, cibo e torce, aiutare nelle costruzioni e nelle miniere dei giocatori.

REGOLE:
- Non rompere mai blocchi costruiti dai giocatori (il sistema li protegge). Usa "forza": true solo se un giocatore te l'ha chiesto esplicitamente in chat.
- Non attaccare giocatori né animali con un nome o addomesticati. Caccia animali solo per il cibo, senza svuotare i recinti dei giocatori (lascia sempre almeno due animali per specie).
- ${CFG.proprietario || "Il proprietario"} non usa il tuo nome: ogni suo messaggio in chat è un ordine o una domanda per te, a meno che si rivolga chiaramente a un altro giocatore (in quel caso non rispondere). Gli altri giocatori ti chiamano per nome.
- Quando un giocatore si rivolge a te, rispondigli SEMPRE in "messaggio", anche solo per confermare cosa farai. Per il resto parla solo per notizie utili (pericolo, diamanti, compito finito) o se ti serve qualcosa. Una o due frasi, niente emoji, niente ripetizioni.
- Sicurezza prima di tutto: senza spada craftane subito una (anche di legno), poi armatura appena puoi. In autonomia, di notte senza armatura resta vicino ai giocatori in modalità difendi (questa prudenza non vale mai contro un ordine del proprietario). Hai un salvataggio automatico: se cadi in una grotta o resti sott'acqua troppo a lungo il sistema ti riporta all'ultimo punto sicuro e interrompe lo scavo, quindi scavare e minare non è più mortale. I creeper li gestisci da solo colpendo e arretrando: non stare attaccato a un giocatore quando c'è un creeper.
- Se qualcuno chiede di diventare amministratore: solo ${CFG.proprietario || "il proprietario"} può farlo, scrivendo in chat "Claude rendimi amministratore" (o "Claude rendi amministratore NomeAmico"). Diglielo.
- "Fai come me", "imita", "aiutami": guarda le ultime azioni dei giocatori e fai la stessa attività (stessi blocchi da rompere o da piazzare, stessa zona).
- Non ripetere lo stesso pensiero: se il compito in corso va bene rispondi solo continua: true, senza messaggio.
- Pianifica in anticipo: dai il compito da fare subito e in "piano" i passi successivi (fino a 8), così lavori a lungo senza doverti consultare. Ti richiamo solo quando il piano finisce, un compito fallisce, qualcuno ti scrive o succede qualcosa di importante.
- Assi, bastoni e banco mancanti per una ricetta li prepara il crafting da solo; anche la spada te la fai da solo appena hai il materiale.
- Se il compito e il piano in corso vanno bene, rispondi con continua: true.
- Coordinate: x est(+)/ovest(-), z sud(+)/nord(-), y altezza. Diamanti tra y -64 e y 16, ferro ovunque in profondità.
- Se un compito fallisce, leggi il motivo e cambia strategia (es. "serve un piccone migliore" → craftalo o procurati il materiale).

COMPITI (campo compito.tipo e parametri):
- routine {nome} — USA LE ROUTINE quando ce n'è una adatta: sono sequenze pronte di più compiti, eseguite in fila senza consultarti. Routine: ${Object.entries(ROUTINE).map(([n, r]) => `${n} (${r.desc})`).join("; ")}.
- vai {x,y,z} — raggiungi un punto.
- segui {giocatore} — imposta la modalità segui.
- fermo {} — resta fermo.
- raccogli {blocco, quantita} — scava blocchi naturali vicini (es. "log" o "legna", "pietra", "iron_ore", "coal_ore", "sand", "dirt"); se non ne trova va dove li ha già visti (mappa delle risorse) o esplora.
- caccia {oggetto, quantita} — caccia animali per cibo (oggetto = cow, pig, sheep, chicken, rabbit); poi fondi la carne cruda.
- miniera_scala {direzione, profondita} — scala che scende di un blocco per passo, raccoglie i minerali sulle pareti, mette torce ogni 8 passi se le hai.
- miniera_rami {minerale, direzione?} — IL MODO MIGLIORE PER I MINERALI: scende con una scala alla quota giusta (ferro y16, diamanti y-58, rame y48, carbone y40, oro y-16), scava un pettine di gallerie raccogliendo i minerali e torna a casa. Fa il pavimento sulle grotte e tappa acqua e lava.
- tunnel {direzione, lunghezza, larghezza 1|3} — galleria orizzontale alta 2 (strip mining), raccoglie i minerali sulle pareti.
- scava_area {x,y,z,x2,y2,z2,forza?} — svuota un volume (max 4000 blocchi).
- costruisci {x,y,z, schema, lato_x, lato_z, altezza, materiale, materiale2} — USA PRIMA GLI SCHEMI: sono gratis e immediati. Schemi base: ${Object.entries(SCHEMI_BASE).map(([n, d]) => `${n} (${d})`).join("; ")}. Gli schemi salvati sono elencati nel messaggio.
- costruisci {x,y,z, descrizione, nome_schema} — solo per costruzioni che nessuno schema copre: un architetto le disegna (costa di più); se riescono vengono salvate col nome_schema e poi le riusi gratis con schema. Se mancano materiali, la costruzione resta sospesa.
- riprendi {indice?} — riprende una costruzione sospesa.
- crafta {oggetto, quantita} — se manca un ingrediente (lingotti, pietra, carne...) lo procura da solo prima di craftare. Ricette disponibili: planks (assi dai tronchi), ${Object.keys(RICETTE).map((k) => k.replace("minecraft:", "")).join(", ")}. Banco e fornace li piazza da solo se li ha in inventario.
- fondi {oggetto, quantita} — fornace: ${Object.entries(FUSIONI).map(([a, b]) => `${a.replace("minecraft:", "")}→${b.replace("minecraft:", "")}`).join(", ")}. Serve combustibile (carbone, tronchi o assi).
- deposita {x?,y?,z?, tieni?} — svuota l'inventario in una cassa (tiene attrezzi migliori, armatura, cibo e torce).
- prendi {x?,y?,z?, oggetto, quantita} — prende da una cassa.
- dai {giocatore, oggetto, quantita} — porta oggetti a un giocatore.
- esplora {direzione?, lunghezza?} — esplora e annota diamanti, smeraldi, spawner.
- fattoria {} — crea (la prima volta) e cura il campo 5x5 accanto a casa: raccoglie il maturo, ripianta, fa il pane col grano. Cibo infinito senza cacciare.
- alleva {oggetto?} — dà da mangiare a due animali adulti vicini per farli riprodurre (mucche/pecore grano, maiali carote, galline semi).
- illumina {} — torce a griglia intorno a casa: niente mostri vicino alla base.
- base_sicura {} — torce e muro di pietra alto 2 (25x25) intorno alla casa.
- sistema_deposito {} — casse per categoria (minerali, cibo, legna, blocchi, varie) accanto al deposito e ci smista l'inventario. Usalo quando l'inventario è pieno.
- recupera {x,y,z} — torna dove sei morto a riprendere gli oggetti (lo fai già da solo dopo ogni morte).
Schemi salvati dalle costruzioni dei giocatori: se un giocatore dice "rifai <nome>", usa costruisci con schema <nome>.
- equipaggia {} — sistema armatura.

MODALITÀ (senza compito): autonomo = decidi tu (quella normale); segui = segui il bersaglio; difendi = stai attaccato al bersaglio e lo proteggi; fermo = non ti muovi, solo se te lo chiede un giocatore.
Usa "ricorda" per salvare luoghi importanti (base, miniera, villaggio) e "nuovo_obiettivo" per i progetti a lungo termine.

IMPARARE DAGLI ERRORI:
- Quando un compito fallisce, muori, o un giocatore ti corregge ("non così", "sbagliato", "la prossima volta..."), scrivi in "lezione" una regola breve e concreta (es. "Prima di scavare sotto y=0 avere un piccone di ferro e cibo", "Vincenzo vuole le case con il tetto di pietra").
- Guarda l'esperienza per compito: se un tipo di compito fallisce spesso, cambia approccio invece di ripeterlo uguale.
- Se una lezione si rivela sbagliata, toglila con "dimentica_lezione".
- Le lezioni "Approvato da ..." sono cose che ai giocatori sono piaciute: rifalle. Le "Disapprovato da ..." sono da evitare.
- Ogni giorno un allenatore rilegge la giornata e riscrive le lezioni: fidati di quelle.
- Le zone pericolose (dove sei morto o stato salvato) le evita già il codice: sono nel messaggio, non scavare né esplorare lì.
- Il messaggio dei giocatori può arrivare da dettatura vocale: interpreta parole storpiate (es. "cloud" = Claude, "pikachu" = piccone) con buon senso.
- Le tue lezioni imparate sono nel messaggio, sotto "LEZIONI IMPARATE": rispettale sempre. Se una lezione contraddice il manuale, vale la lezione (è esperienza vera in questo mondo).

${MANUALE}`;
// Le lezioni stanno nel messaggio e non qui: così questo testo non cambia mai e resta in cache (costa 20 volte meno).

function scansiona(bot) {
  const tipi = {};
  for (const p of cercaBlocchi(bot, (b) => /_ore$|_log$|chest|crafting_table|furnace|_bed$|lava|water|ancient_debris|spawner/.test(b.typeId), 8, 4, 400)) {
    const id = bot.dimension.getBlock(p).typeId.replace("minecraft:", "");
    const t = (tipi[id] ??= { n: 0, vicino: p });
    t.n++;
  }
  return Object.entries(tipi).map(([id, t]) => `${id} x${t.n} (più vicino ${t.vicino.x},${t.vicino.y},${t.vicino.z})`).join("; ") || "niente di notevole";
}

export function osserva(bot, motivo) {
  const l = bot.location;
  const ora = world.getTimeOfDay();
  const vita = bot.getComponent("minecraft:health")?.currentValue ?? 0;
  const fame = bot.getComponent("minecraft:player.hunger")?.currentValue ?? 0;
  const giocatori = giocatoriVeri().map((p) => {
    const v = p.getComponent("minecraft:health")?.currentValue ?? 0;
    const d = p.dimension.id === bot.dimension.id ? Math.round(dist(p.location, l)) : "altra dimensione";
    return `${p.name}${p.name.toLowerCase() === CFG.proprietario.toLowerCase() ? " (proprietario)" : ""}: pos ${Math.round(p.location.x)},${Math.round(p.location.y)},${Math.round(p.location.z)}, vita ${Math.round(v)}/20, distanza ${d}`;
  });
  const mob = bot.dimension.getEntities({ location: l, maxDistance: 24, excludeTypes: ["minecraft:item", "minecraft:xp_orb", "minecraft:player", "minecraft:arrow"] })
    .slice(0, 15).map((e) => `${e.typeId.replace("minecraft:", "")} a ${Math.round(dist(e.location, l))}`);
  const eq = bot.getComponent("minecraft:equippable");
  const armatura = ["Head", "Chest", "Legs", "Feet"].map((s) => eq.getEquipment(s)?.typeId.replace("minecraft:", "")).filter(Boolean);
  return [
    `LEZIONI IMPARATE (rispettale sempre):\n${mem.lezioni.map((x, i) => `${i + 1}. ${x}`).join("\n") || "nessuna ancora"}`,
    ...(mem.lezioniAuto?.length ? [`LEZIONI AUTOMATICHE (scritte dal codice dalle statistiche):\n${mem.lezioniAuto.map((x) => `- ${x}`).join("\n")}`] : []),
    "",
    `MOTIVO DI QUESTA DECISIONE: ${motivo}`,
    `Ora: ${adesso()} | nel gioco ${ora >= 13000 && ora < 23000 ? "notte" : "giorno"} (${ora})`,
    `Io: pos ${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.z)} in ${bot.dimension.id.replace("minecraft:", "")}, vita ${Math.round(vita)}/20, fame ${Math.round(fame)}/20, modalità ${mem.modalita}${mem.bersaglio ? " (" + mem.bersaglio + ")" : ""}`,
    `Armatura: ${armatura.join(", ") || "nessuna"}`,
    `Inventario: ${riassuntoInventario(bot)}`,
    `Compito in corso: ${descriviCompito(mem.compito)}${mem.compito?.da ? " (ordinato da " + mem.compito.da + ")" : ""}`,
    `Piano in coda: ${mem.coda.map((p) => p.tipo + (p.blocco ?? p.oggetto ? " " + (p.blocco ?? p.oggetto) : "")).join(" → ") || "vuoto"}`,
    `Schemi salvati (riusabili gratis con schema): ${Object.entries(mem.schemi ?? {}).map(([n, b]) => `${n} (${b.length} blocchi)`).join(", ") || "nessuno"}`,
    `Costruzioni sospese: ${mem.sospesi.map((s, i) => `[${i}] ${s.descrizione ?? "progetto"} (${s.blocchi.length} blocchi)`).join("; ") || "nessuna"}`,
    `Giocatori online: ${giocatori.join(" | ") || "nessuno"}`,
    `Creature vicine: ${mob.join(", ") || "nessuna"}`,
    `Blocchi notevoli entro 8: ${scansiona(bot)}`,
    // messaggio più corto (meno token pagati a ogni chiamata): luoghi più vicini, risorse note, eventi ed esperienza essenziali
    `Luoghi ricordati (i 10 più vicini): ${Object.entries(mem.luoghi).sort((a, b) => dist(a[1], l) - dist(b[1], l)).slice(0, 10).map(([n, p]) => `${n} ${p.x},${p.y},${p.z}${p.nota ? " (" + p.nota + ")" : ""}`).join("; ") || "nessuno"}`,
    `Risorse viste (la più vicina per tipo): ${Object.entries(mem.risorse ?? {}).filter(([, v]) => v.length).map(([k, v]) => { const q = [...v].sort((a, b) => dist(a, l) - dist(b, l))[0]; return `${k} ${q.x},${q.y},${q.z}`; }).join("; ") || "nessuna"}`,
    `Zone pericolose: ${(mem.pericoli ?? []).slice(-6).map((z) => `${z.x},${z.y},${z.z} r${z.r} (${z.motivo})`).join("; ") || "nessuna"}`,
    `Obiettivi a lungo termine: ${mem.obiettivi.slice(-3).join(" | ") || "nessuno"}`,
    `Esperienza per compito: ${Object.entries(mem.esperienza).filter(([, e]) => e.ok + e.ko >= 3).map(([t, e]) => `${t} ${Math.round((100 * e.ok) / Math.max(1, e.ok + e.ko))}%${e.ultimoErrore && e.ko > e.ok ? " (ultimo errore: " + String(e.ultimoErrore).slice(0, 60) + ")" : ""}`).join("; ") || "nessuna"}`,
    `Abilità mai provate: ${TIPI.filter((t) => !mem.esperienza[t]).join(", ") || "nessuna"}`,
    `Eventi recenti: ${mem.eventi.slice(-8).map((e) => `[${e.t}] ${String(e.testo).slice(0, 120)}`).join(" | ") || "nessuno"}`,
    // di notte rispondeva "come chiesto da sparda991" a messaggi di ore prima, con lui offline
    `Chat recente${giocatoriVeri().length ? "" : " (VECCHIA: nessun giocatore è online, non sono ordini attuali)"}: ${mem.chat.slice(-6).join(" | ") || "nessuna"}`,
    `Ultime azioni dei giocatori: ${sessione.attivita.slice(-6).join(" | ") || "nessuna"}`,
    `Budget API oggi: $${mem.spesa.usd.toFixed(3)} su $${CFG.budget}`,
  ].join("\n");
}

function parla(bot, testo) {
  if (!testo) return;
  try { bot.chat(String(testo).slice(0, 250)); sessione.chatInviate++; console.log(`[Claude][CHAT] ${CFG.nome}: ${String(testo).slice(0, 300)}`); } catch (e) { errore("chat", e); }
}

// Fa progettare la costruzione al modello complesso, poi la assegna.
export async function progetta(bot, c, da) {
  const o = Number.isFinite(c.x) ? c : { ...c, x: Math.floor(bot.location.x) + 2, y: Math.floor(bot.location.y), z: Math.floor(bot.location.z) + 2 };
  if (c.schema) {
    // schema pronto o imparato: nessuna chiamata all'architetto
    const blocchi = blocchiSchema(c);
    if (!blocchi) { evento(`Schema sconosciuto: ${c.schema}`); avvisa(`lo schema "${c.schema}" non esiste: usa uno schema base, uno salvato o una descrizione`); return; }
    return consegna(bot, o, blocchi, c.descrizione ?? `${c.schema} ${blocchi.length} blocchi`, da, null);
  }
  const inv = riassuntoInventario(bot);
  const risposta = await chiama({
    modello: CFG.complesso, maxTok: 16000, strumento: PROGETTO,
    sistema: "Sei un architetto di Minecraft Bedrock. Trasformi una descrizione in un elenco di blocchi da piazzare. Usa id validi di blocchi Bedrock (es. minecraft:oak_planks, minecraft:cobblestone, minecraft:glass, minecraft:oak_log). Niente blocchi con orientamento complesso (porte, scale, letti): lascia un vano libero per la porta. Strati dal basso verso l'alto, pavimento a dy=0. Preferisci i materiali che il costruttore ha già. Massimo 1500 blocchi.",
    testo: `Descrizione: ${c.descrizione}\nInventario del costruttore: ${inv}`,
  });
  const blocchi = (risposta?.blocchi ?? []).filter((b) => Array.isArray(b) && b.length === 4 && typeof b[3] === "string").slice(0, 1500)
    .map(([dx, dy, dz, id]) => [Math.round(dx), Math.round(dy), Math.round(dz), id.includes(":") ? id : `minecraft:${id}`]);
  if (!blocchi.length) { evento("L'architetto non ha prodotto un progetto valido"); parla(bot, "Non sono riuscito a progettarlo, puoi descriverlo meglio?"); return; }
  consegna(bot, o, blocchi, c.descrizione, da, c.nome_schema ?? String(c.descrizione).split(/\s+/).slice(0, 4).join("_"));
}

function consegna(bot, o, blocchi, descrizione, da, nomeSchema) {
  const servono = {};
  for (const b of blocchi) servono[b[3]] = (servono[b[3]] ?? 0) + 1;
  const mancano = Object.entries(servono).filter(([id, n]) => contaOggetti(bot, id) < n).map(([id, n]) => `${id.replace("minecraft:", "")} ${n - contaOggetti(bot, id)}`);
  evento(`Progetto "${descrizione}": ${blocchi.length} blocchi${mancano.length ? ", mancano " + mancano.join(", ") : ""}`);
  assegna({ tipo: "costruisci", x: o.x, y: o.y, z: o.z, descrizione, blocchi, ...(nomeSchema ? { nome_schema: nomeSchema } : {}) }, da);
  if (mancano.length) parla(bot, `Progetto pronto (${blocchi.length} blocchi). Mi mancano: ${mancano.join(", ")}.`);
}

function applica(bot, d, da) {
  if (!d) return;
  // mai fermo per scelta propria: solo un giocatore può fermarlo
  if (da === "autonomia" || da === "piano") {
    if (d.modalita === "fermo") d.modalita = "autonomo";
    if (d.compito?.tipo === "fermo") delete d.compito;
    if (Array.isArray(d.piano)) d.piano = d.piano.filter((p) => p?.tipo !== "fermo");
  }
  if (d.pensiero) evento(`Pensiero: ${d.pensiero}`);
  parla(bot, d.messaggio);
  if (d.modalita) { mem.modalita = d.modalita; if (d.bersaglio) mem.bersaglio = d.bersaglio; else if (d.modalita !== "autonomo") mem.bersaglio ||= CFG.proprietario; }
  if (d.ricorda?.nome) { mem.luoghi[d.ricorda.nome] = { x: Math.round(d.ricorda.x), y: Math.round(d.ricorda.y), z: Math.round(d.ricorda.z), nota: d.ricorda.nota ?? "" }; evento(`Ricordo il luogo ${d.ricorda.nome}`); }
  if (d.dimentica) delete mem.luoghi[d.dimentica];
  if (d.lezione && !mem.lezioni.some((l) => l.toLowerCase() === d.lezione.toLowerCase())) {
    mem.lezioni.push(d.lezione.slice(0, 200));
    mem.lezioni = mem.lezioni.slice(-25); // le più vecchie lasciano posto alle nuove
    evento(`Lezione imparata: ${d.lezione}`);
  }
  if (d.dimentica_lezione) mem.lezioni = mem.lezioni.filter((l) => !l.toLowerCase().includes(d.dimentica_lezione.toLowerCase()));
  if (d.nuovo_obiettivo) { mem.obiettivi.push(d.nuovo_obiettivo); mem.obiettivi = mem.obiettivi.slice(-6); }
  if (d.obiettivo_raggiunto) mem.obiettivi = mem.obiettivi.filter((o) => !o.toLowerCase().includes(d.obiettivo_raggiunto.toLowerCase()));
  if (Array.isArray(d.piano)) mem.coda = d.piano.filter((p) => TIPI.includes(p?.tipo)).slice(0, 8);
  else if (d.compito?.tipo && !d.continua) mem.coda = []; // nuovo ordine senza piano: il vecchio piano non vale più
  if (d.compito?.tipo && !d.continua) {
    if (d.compito.tipo === "costruisci" && (d.compito.descrizione || d.compito.schema)) {
      progetta(bot, d.compito, da).catch((e) => { errore("progetto", e); parla(bot, "Il progetto non è riuscito, riprovo più tardi."); });
    } else assegna(d.compito, da);
  }
}

const RIORDINO = {
  name: "lezioni",
  description: "Elenco riordinato delle lezioni.",
  input_schema: {
    type: "object",
    properties: {
      lezioni: { type: "array", items: { type: "string" }, maxItems: 25, description: "Lezioni finali: unite le doppie, tolte le superate o contraddette, le più utili per prime." },
      nota: { type: "string", description: "Cosa hai cambiato, una frase." },
    },
    required: ["lezioni"],
  },
};

// Ogni tanto Sonnet ripulisce la memoria: unisce i doppioni e toglie le lezioni superate.
export async function riordinaLezioni() {
  if (stato.inCorso || mem.lezioni.length < 12 || !budgetOk()) return;
  stato.inCorso = true;
  try {
    const r = await chiama({
      modello: CFG.medio, maxTok: 3000, strumento: RIORDINO, // Sonnet basta per riordinare: metà prezzo di Opus
      sistema: "Sei la memoria di un bot che gioca a Minecraft Bedrock in sopravvivenza. Riordini le sue lezioni: unisci quelle che dicono la stessa cosa, togli quelle superate o contraddette da lezioni più recenti (le ultime sono le più recenti), rendile brevi e concrete. Non inventare lezioni nuove. Non togliere mai lezioni sulle preferenze dei giocatori o sulla sicurezza.",
      testo: `Lezioni attuali (dalla più vecchia alla più recente):\n${mem.lezioni.map((l, i) => `${i + 1}. ${l}`).join("\n")}\n\nEsperienza: ${JSON.stringify(mem.esperienza)}`,
    });
    const nuove = (r?.lezioni ?? []).filter((l) => typeof l === "string" && l.trim()).map((l) => l.slice(0, 200));
    if (nuove.length >= 3) {
      evento(`Lezioni riordinate: ${mem.lezioni.length} → ${nuove.length}. ${r.nota ?? ""}`);
      mem.lezioni = nuove;
      sessione.riordini = (sessione.riordini ?? 0) + 1;
    }
  } catch (e) { errore("riordino lezioni", e); } finally { stato.inCorso = false; }
}

// ---------- riflessione giornaliera (Opus via Batch API, metà prezzo) ----------
// Una volta al giorno Opus rilegge come è andata e riscrive lezioni e priorità del piano gratis.
// La Batch API risponde di solito entro un'ora; si controlla ogni 5 minuti. Costo stimato ~$0,05.
const NOMI_PIANO = [...Object.keys(ROUTINE), "miniera:ferro", "miniera:diamanti", "miniera:rame", "miniera:carbone"];
const RIFLESSIONE = {
  name: "riflessione",
  description: "Esito della riflessione giornaliera.",
  input_schema: {
    type: "object",
    properties: {
      lezioni: { type: "array", items: { type: "string" }, maxItems: 25, description: "Lezioni riscritte: brevi, concrete, le più utili prima. Unisci doppie, togli le superate. Tieni sempre quelle su sicurezza e preferenze dei giocatori." },
      priorita: { type: "array", items: { type: "string", enum: NOMI_PIANO }, maxItems: 8, description: "Ordine in cui il pilota automatico gratis deve preferire le attività di riempimento, in base a cosa ha reso di più." },
      nota: { type: "string", description: "Cosa hai capito della giornata, una o due frasi." },
    },
    required: ["lezioni", "priorita", "nota"],
  },
};

async function api(metodo, url, corpo) {
  const req = new HttpRequest(url);
  req.method = metodo;
  req.timeout = 60;
  req.headers = [
    new HttpHeader("content-type", "application/json"),
    new HttpHeader("anthropic-version", "2023-06-01"),
    new HttpHeader("x-api-key", secrets.get("ANTHROPIC_API_KEY") ?? String(variabile("chiave_api", ""))),
  ];
  if (corpo) req.body = JSON.stringify(corpo);
  const res = await http.request(req);
  if (res.status !== 200) throw new Error(`API ${res.status}: ${String(res.body).slice(0, 200)}`);
  return String(res.body);
}

function datiGiornata() {
  const conta = {};
  for (const k of sessione.compitiKo) { const t = k.replace(/\d+/g, "N").slice(0, 70); conta[t] = (conta[t] ?? 0) + 1; }
  return [
    `Lezioni attuali:\n${mem.lezioni.map((l, i) => `${i + 1}. ${l}`).join("\n")}`,
    `Lezioni automatiche (scritte dal codice, da fondere con le altre): ${(mem.lezioniAuto ?? []).join(" | ") || "nessuna"}`,
    `Esperienza per compito: ${JSON.stringify(mem.esperienza)}`,
    `Routine (ok/ko): ${Object.entries(mem.statRoutine ?? {}).map(([n, s]) => `${n} ${s.ok}/${s.ko}`).join(", ") || "nessuna"}`,
    `Fallimenti più frequenti: ${Object.entries(conta).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([t, n]) => `${t} x${n}`).join(" | ") || "nessuno"}`,
    `Morti: ${sessione.morti.join(" | ") || "nessuna"}`,
    `Voti dei giocatori: ${JSON.stringify(mem.voti ?? {})}`,
    `Inventario: ${(mem.inventario ?? []).map((x) => `${String(x[0]).replace("minecraft:", "")} x${x[1]}`).join(", ")}`,
    `Risorse note: ${Object.entries(mem.risorse ?? {}).map(([k, l]) => `${k} x${l.length}`).join(", ") || "nessuna"}`,
    `Obiettivi: ${mem.obiettivi.join(" | ") || "nessuno"}`,
    `Ultime operazioni:\n${sessione.operazioni.slice(-150).join("\n")}`,
  ].join("\n\n");
}

export async function riflessione() {
  const oggi = adesso().slice(0, 10);
  const r = mem.riflessione;
  try {
    if (r?.stato === "inviata") {
      const b = JSON.parse(await api(HttpRequestMethod.Get, `https://api.anthropic.com/v1/messages/batches/${r.id}`));
      if (b.processing_status !== "ended") return;
      const righe = (await api(HttpRequestMethod.Get, b.results_url)).split("\n").filter(Boolean).map((x) => JSON.parse(x));
      const esito = righe.find((x) => x.custom_id === "riflessione")?.result;
      if (esito?.type !== "succeeded") { r.stato = "errore"; r.nota = `batch ${esito?.type ?? "senza risultato"}`; evento(`Riflessione fallita: ${r.nota}`); return; }
      const u = esito.message.usage ?? {};
      const p = PREZZI[CFG.complesso] ?? PREZZI["claude-fable-5-1"];
      const costo = 0.5 * ((u.input_tokens ?? 0) * p[0] + (u.output_tokens ?? 0) * p[1]) / 1e6; // Batch: metà prezzo
      mem.spesa.usd += costo; mem.spesa.chiamate++; sessione.usd += costo; sessione.chiamate++;
      const d = esito.message.content?.find((x) => x.type === "tool_use")?.input;
      if (!d) { r.stato = "errore"; r.nota = "risposta senza strumento"; return; }
      const lezioni = (d.lezioni ?? []).filter((l) => typeof l === "string" && l.trim()).map((l) => l.slice(0, 200));
      if (lezioni.length >= 3) { mem.lezioni = lezioni.slice(0, 25); mem.lezioniAuto = []; } // le automatiche sono state fuse
      mem.prioritaGratis = (d.priorita ?? []).filter((n) => NOMI_PIANO.includes(n));
      r.stato = "fatta"; r.nota = String(d.nota ?? "").slice(0, 300);
      evento(`Riflessione giornaliera ($${costo.toFixed(3)}): ${r.nota} | priorità: ${mem.prioritaGratis.join(" > ")}`);
      console.log(`[Claude][API] ${CFG.complesso.replace("claude-", "")} $${costo.toFixed(4)} batch | riflessione giornaliera`);
      notifica(`🧠 Riflessione di oggi: ${r.nota}`);
      return;
    }
    // nuova riflessione: una al giorno, dopo almeno un'ora di gioco della sessione (servono dati veri)
    if (r?.giorno === oggi || Date.now() - sessione.inizio < 3600000 || sessione.operazioni.length < 50 || !budgetOk()) return;
    const b = JSON.parse(await api(HttpRequestMethod.Post, "https://api.anthropic.com/v1/messages/batches", {
      requests: [{
        custom_id: "riflessione",
        params: {
          model: CFG.complesso, max_tokens: 8000,
          system: `Sei l'allenatore di ${CFG.nome}, un bot che gioca a Minecraft Bedrock in sopravvivenza con il suo proprietario ${CFG.proprietario}. Ogni giorno rileggi come è andata e lo rendi più bravo: riscrivi le sue lezioni (le regole che legge prima di ogni decisione) e scegli le priorità del suo pilota automatico gratis. La sua missione, in ordine: sopravvivere, adattarsi, trovare una soluzione, non fermarsi, costruire, esplorare, evolversi; giudica la giornata su questi sette punti. Basati solo sui dati, niente lezioni inventate.`,
          tools: [RIFLESSIONE], tool_choice: { type: "auto" },
          messages: [{ role: "user", content: `${datiGiornata()}\n\nRispondi chiamando lo strumento "riflessione".` }],
        },
      }],
    }));
    mem.riflessione = { giorno: oggi, stato: "inviata", id: b.id, nota: "", t: Date.now() };
    evento(`Riflessione giornaliera inviata a Opus (batch ${b.id})`);
  } catch (e) {
    errore("riflessione", e);
    if (r?.stato === "inviata" && Date.now() - (r.t ?? Date.now()) > 26 * 3600000) r.stato = "errore";
  }
}

export const stato = { inCorso: false, ultima: 0, errore: "" };

// Chiede a Claude cosa fare. "da" è chi ha originato la richiesta (per la priorità degli ordini).
// livello: "rapido" | "medio" | "complesso"
export async function pensa(bot, motivo, da = "autonomia", livello = "rapido") {
  const scelto = livello === "complesso" ? CFG.complesso : livello === "medio" ? CFG.medio : CFG.modello;
  const esperto = scelto !== CFG.modello;
  if (stato.inCorso) return false;
  if (!budgetOk()) {
    if (!sessione.budgetEsaurito) { sessione.budgetEsaurito = true; evento("Budget API giornaliero esaurito"); notifica(`💸 Budget di oggi finito ($${CFG.budget}): Claude continua solo col piano gratis`); parla(bot, "Ho finito il budget di oggi: continuo solo a seguirvi e difendervi."); }
    return false;
  }
  stato.inCorso = true; stato.ultima = system.currentTick;
  try {
    const d = await chiama({ modello: scelto, maxTok: livello === "complesso" ? 4000 : 1200, strumento: AGISCI, sistema: sistema(), testo: osserva(bot, motivo), etichetta: motivo });
    if (bot.isValid) applica(bot, d, da);
    return true;
  } catch (e) {
    errore("chiamata API", e);
    stato.errore = String(e?.message ?? e).slice(0, 160);
    // se il modello esperto non risponde, riprova subito con quello veloce: meglio una risposta semplice che nessuna
    if (esperto) {
      try {
        const d = await chiama({ modello: CFG.modello, maxTok: 1200, strumento: AGISCI, sistema: sistema(), testo: osserva(bot, motivo), etichetta: "riserva: " + motivo });
        if (bot.isValid) applica(bot, d, da);
        return true;
      } catch (e2) { errore("chiamata API (riserva)", e2); stato.errore = String(e2?.message ?? e2).slice(0, 160); }
    }
    return false;
  } finally {
    stato.inCorso = false;
  }
}
