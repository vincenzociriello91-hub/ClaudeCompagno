# Manuale di esperienza di Claude Compagno

Che cos'è: l'esperienza che il bot accumula vivendo in Minecraft, ripulita dai dettagli del gioco così da poterla
usare in qualsiasi altra applicazione: app, assistenti, agenti autonomi, tool. Ogni regola nasce da un fatto
successo davvero (morti, blocchi, spese, fallimenti misurati nei rapporti) e dice anche il perché.

Come cresce:
- a ogni versione del bot questo testo viene aggiornato con quello che i rapporti hanno insegnato;
- ogni giorno la riflessione del bot aggiunge in fondo le lezioni universali nuove;
- su Drive si trova sempre aggiornato in `Odin2_report/ClaudeCompagno_esperienza.md`, che in fondo contiene anche
  **tutta l'esperienza grezza del bot**: lezioni attuali, lezioni automatiche, archivio delle lezioni superate,
  tassi di successo per compito con l'ultimo errore, routine, priorità, diario delle riflessioni, voti e zone
  pericolose. Chi usa il manuale per un'altra applicazione sceglie cosa adottare.

Aggiornato alla versione 2.8.37 (9 novembre 2026), dopo circa 30 ore di gioco, 2.200 compiti misurati e 27 rapporti.

---

## 1. La missione, in ordine di priorità

1. **Sopravvivere.** Chi è fuori gioco non produce niente. Prima la salute, poi il lavoro.
2. **Trovare una soluzione.** Ogni ostacolo è un problema da scomporre: che cosa manca, come lo procuro.
3. **Adattarsi.** Se la soluzione non funziona si cambia metodo, luogo o ordine dei passi.
4. **Evolversi.** Strumenti migliori sbloccano tutto il resto: investire prima nella crescita.
5. **Costruire.** Lasciare qualcosa che resta e rende: basi, scorte, sistemi.
6. **Esplorare.** Cercare risorse e opportunità nuove, ma solo quando si è equipaggiati e al sicuro.
7. **Non fermarsi.** Vale sempre, sopra tutto il resto: restare fermi senza motivo è un errore.

## 2. Sopravvivenza e gestione del rischio

- **Il rischio dipende dal contesto, non dall'attività.** Lo stesso compito di giorno è sicuro, di notte è mortale.
  Prima di agire valuta il momento (ora, condizioni, equipaggiamento), non solo il compito.
  _Fatto: 6 morti in 20 minuti camminando di notte senza armatura; con il rifugio sul posto 2 in 34 minuti._
- **Senza protezione non attraversare zone pericolose: fermati al sicuro dove sei.** Un viaggio lungo verso
  "casa" nel momento sbagliato è più pericoloso che restare chiusi sul posto.
- **Memorizza dove ti sei fatto male e non tornarci.** Ogni incidente diventa una zona da evitare con un raggio,
  usata da tutte le attività, non solo da quella che è fallita.
- **Riflessi automatici prima del ragionamento.** Cadute, annegamento, soffocamento e uscita dai limiti si
  gestiscono con regole immediate e gratuite. Il ragionamento costoso arriva dopo, a pericolo passato.
- **Un salvataggio che si ripete è un segnale, non una soluzione.** Se lo stesso riflesso scatta 3 volte in 30
  secondi, è l'attività che ti rimette nel pericolo: cambia attività, non ripetere il salvataggio.
  _Fatto: 9 salvataggi dal soffocamento di fila e poi la morte._
- **Ritirati prima di essere al limite.** Sotto una soglia di salute ci si allontana, ci si cura e poi si torna.
- **Affronta prima la minaccia più grave, non la più vicina.** Le priorità vanno ordinate per danno potenziale.
- **Non intestardirti su un obiettivo irraggiungibile.** Se in un tempo breve (10 secondi) non fai progressi
  concreti, lascialo perdere per un po' e torna al lavoro, e non riprenderlo subito dopo.
  _Fatto: 20 minuti fermi a inseguire un nemico in acqua; dopo la regola, 41 compiti completati in 34 minuti._

- **Se il posto stesso ti uccide, cambia posto, non tattica.** Notte del 9/11: 4 morti in 7 minuti, tutte in palude
  intorno alla base (annegamenti e drowned). Riprovare lì non serviva: quando i pericoli si concentrano intorno alla
  base (4 o più nello stesso raggio), si sposta la base in un luogo sicuro e si ricostruisce lì.
- **Un piano di emergenza non deve avere un solo tentativo.** Il riparo notturno falliva al primo ostacolo ("occupato")
  e il bot restava allo scoperto tutta la notte. Ora prova fino a 9 posti vicini e accetta anche un riparo già chiuso:
  un'azione di sicurezza deve avere alternative pronte, non una sola via.

## 3. Trovare una soluzione e adattarsi

- **Catene di prerequisiti.** Se manca un ingrediente non si fallisce: lo si procura prima, poi si riprende il
  compito (niente lingotti → fondi; niente minerale → scava; niente legna → raccogli). Con un limite di
  tentativi, altrimenti si va in loop.
- **Mai ripetere identico ciò che è appena fallito.** Dopo un fallimento cambia almeno una cosa: posto, metodo,
  ordine, oppure fai un'altra attività per un po'.
  _Fatto: 1.131 fallimenti in 3 ore quando i passi successivi venivano eseguiti anche dopo un passo fallito._
- **Anche gli strumenti sono prerequisiti.** Non solo i materiali: se manca lo strumento per lavorarli (il banco
  da lavoro), va procurato come un ingrediente. _Fatto: 24 lingotti pronti e l'armatura ferma per "serve un banco"._
- **Quando la base si sposta, tutto ciò che dipende dalla base va rifatto lì.** Riferimenti vecchi (deposito a 360
  blocchi) fanno fallire in silenzio ogni compito che li usa.
- **Un passo fallito invalida quelli che dipendono da lui.** In un piano a catena si scartano i passi successivi
  invece di tentarli uno per uno.
- **Statistiche per luogo.** Lo stesso metodo può rendere in un posto e non in un altro: misura il successo per
  zona e salta le zone "povere" (3 fallimenti, nessun successo) finché non cambi posto.
- **Le informazioni ricordate invecchiano.** Un posto dove "c'era" una risorsa può non averla più. Quando lo
  trovi vuoto cancellalo dalla mappa e prova il successivo. Se la mappa è finita, esplora invece di arrenderti.
  _Fatto: caccia all'1% di successo su 678 tentativi, perché si tornava sempre in posti ormai vuoti._
- **Allarga l'obiettivo quando il fine lo permette.** Se serve cibo, va bene qualsiasi fonte di cibo, non solo
  quella prevista dal piano.
- **Un problema durante il viaggio non deve far fallire tutto il compito.** Se una meta porta in un pericolo,
  scarta quella meta e scegli la prossima: il compito continua.
- **Tempo massimo per ogni compito.** Oltre 10 minuti (30 per i lavori lunghi) senza finire si abbandona e si
  cambia strada: così nessun compito può bloccare l'agente per sempre.
- **Risali la catena delle cause fino a ciò che puoi procurarti.** "Manca la fornace" non è il problema vero se
  hai la pietra: manca il banco, e al banco manca il legno. Il compito deve rinviare se stesso e andare a prendere
  la cosa più a monte, invece di fallire ripetendo il sintomo.
  _Fatto: 808 fusioni al 2% di successo con 81 ciottoli in tasca, perché senza banco la fornace non si poteva fare._
- **Prima di cercare intorno a un posto, vai in quel posto.** I dati di una zona lontana possono non essere
  caricati: cercare uno spazio libero vicino a casa da 300 blocchi di distanza dava sempre "nessuno spazio".
- **Muoversi a tappe.** Verso mete lontane si va a passi brevi (16 unità), verificando ogni tappa. Puntare dritto
  alla meta lontana falliva sempre ("percorso bloccato").
  _Fatto: 166 esplorazioni consecutive "niente di speciale" senza mai spostarsi davvero._

## 4. Evolversi: pianificare la crescita

- **Una scala di progressione chiara** (legno → pietra → rame → ferro → diamante) dice sempre qual è il prossimo
  investimento. Ogni gradino sblocca il successivo e riduce il rischio.
- **Proteggersi prima di espandersi.** L'armatura viene prima dell'esplorazione: senza, esplorare è la prima
  causa di morte.
- **Investire prima nelle cose che moltiplicano.** Strumenti migliori, scorte e sistemi automatici (fattoria,
  deposito ordinato) rendono di più del lavoro manuale ripetuto.
- **Ordine delle priorità rivisto ogni giorno sui dati.** Le attività di riempimento si ordinano in base a quanto
  hanno reso davvero, e una revisione giornaliera le riordina.
- **Ritmo giorno e notte:** le attività rischiose nelle fasi sicure, quelle sicure (manutenzione, ordine, scorte)
  nelle fasi pericolose.
- **Rendere vicine e rinnovabili le risorse che servono sempre.** Se ogni ciclo di lavoro richiede di andare
  lontano a prendere la stessa materia prima, conviene "coltivarla" vicino alla base (un bosco accanto a casa)
  invece di ripetere viaggi rischiosi. _Fatto: crafta al 5% su 750 tentativi, quasi sempre per mancanza di legna._
- **Infrastruttura fissa per le operazioni ripetute.** Uno strumento che serve spesso (la fornace) va installato
  una volta in un posto noto e ricordato, non cercato o ricostruito ogni volta.
  _Fatto: fondi all'1% su 804 tentativi per "serve una fornace", con una fornace in tasca._
- **Misurare la maturità con un numero.** Un punteggio unico (equipaggiamento, sopravvivenza, abilità, base,
  sapere) con il suo andamento giornaliero dice se l'agente cresce davvero e quando è pronto per altri compiti.

## 5. Imparare dall'esperienza

- **Ogni azione è un esperimento:** obiettivo, risultato misurato, causa, lezione.
- **Le lezioni si scrivono anche per i successi,** non solo per gli errori: cosa ha funzionato, in che ordine, dove.
- **Lezioni automatiche gratuite.** Molte lezioni le può scrivere il codice dai numeri ("X fallisce spesso vicino
  a Y"), senza pagare un modello per ragionarci.
- **Riflessione periodica con un modello più bravo** (una volta al giorno, a metà prezzo con la Batch API):
  rilegge la giornata, fonde le lezioni doppie, toglie quelle superate, riordina le priorità.
- **Le lezioni devono restare poche e concrete.** Massimo 25: oltre, vengono lette male e si contraddicono.
  Vanno fuse e riscritte, non solo aggiunte.
- **Correggere le lezioni sbagliate.** Una lezione è un'ipotesi: se i dati la smentiscono, va riscritta.
- **Il voto della persona vale più di tutto.** Un "bravo" o un "sbagliato, perché…" è il segnale più forte:
  lo sbaglio va fermato subito e trasformato in lezione.
- **Esercitare le abilità mai provate** quando non c'è niente di urgente: senza tentativi non c'è esperienza.
- **Misurare il progresso per sessione** (successi di oggi contro quelli di prima) per capire se si migliora davvero.
- **Separare "non so farlo" da "mi manca qualcosa".** Un compito fallito per un ingrediente mancante non è
  un'abilità fallita: contarli insieme falsa le statistiche e fa "imparare" la cosa sbagliata.
- **La memoria va salvata fuori dall'agente** (backup periodico su un servizio esterno) e deve poter essere
  ripristinata: l'esperienza è il bene più prezioso e non deve dipendere da un solo dispositivo.

## 6. Lavorare con le persone

- **Il proprietario non deve chiamarti per nome:** ogni suo messaggio è per te. Gli altri devono nominarti.
- **Gli ordini della persona vengono prima del piano dell'agente,** anche di notte e anche se il piano sembrava
  migliore. _Fatto: il bot rifiutava ordini dicendo "è notte"; corretto mettendo l'ordine sopra tutto._
- **Finito l'ordine, torna da solo all'autonomia:** non restare in attesa né bloccato nell'ultimo ruolo
  ("difendi" senza più nessuno da difendere).
- **Aiuto proattivo:** se la persona è in difficoltà (salute bassa, attrezzo mancante, buio) intervieni senza
  aspettare la richiesta, lasciando il lavoro in corso.
- **Quando la persona torna, un riassunto con numeri veri** di cosa hai fatto mentre era via: niente frasi
  generiche. I contatori devono sopravvivere ai riavvii, altrimenti il riassunto mente ("0 blocchi").
- **Non disturbare chi sta usando il sistema:** gli aggiornamenti e i riavvii si fanno quando nessuno è collegato.
- **Rispetta ciò che è della persona:** non distruggere le sue costruzioni, non toccare gli animali con nome,
  lascia sempre una coppia di animali per la riproduzione.
- **Ogni comando per la persona deve funzionare anche nel caso "sbagliato"** (servizio già spento, file mancante)
  e salvare l'esito in un file condivisibile: niente comandi che si bloccano o che obbligano a fare screenshot.

## 7. Costi: fare di più spendendo quasi zero

- **Il modello giusto per ogni lavoro.** Piccolo ed economico per avvisi ed errori; medio per pianificare e
  rispondere alla persona; grande solo per i progetti nuovi e la riflessione giornaliera.
- **Modalità zero:** quando nessuno guarda, le decisioni le prende il codice gratis. L'agente continua a lavorare
  e a imparare (lezioni scritte dal codice) senza nessuna chiamata a pagamento.
  _Fatto: $6 in una notte con chiamate a ogni fallimento; dopo, $0,02 in 40 minuti e $0 per ore senza giocatori._
- **Mai chiamare il modello in un ciclo di fallimenti.** Gli errori ripetuti si raggruppano e si mandano insieme
  (ogni 30-60 secondi), non uno alla volta.
- **Limitare la frequenza della pianificazione costosa** (al massimo ogni 15 minuti) e lasciare al piano gratis
  il resto.
- **Budget giornaliero con degrado elegante:** finito il budget non ci si ferma, si continua con il piano gratis.
- **Prompt in cache:** le istruzioni fisse vanno nella parte in cache (si pagano circa il 10% dalla seconda volta).
- **Lavori non urgenti in batch** a metà prezzo (la riflessione giornaliera).
- **Ogni chiamata registrata con il suo costo,** per sapere sempre dove vanno i soldi.

## 8. Affidabilità tecnica

- **Budget di tempo per ogni calcolo pesante.** Una ricerca che supera il suo tempo (40 ms, 20 ms se il sistema è
  lento) si ferma e riprende dopo. _Fatto: un ciclo senza limite bloccò il server per 36 secondi e lo fece crashare._
- **Limitare i tentativi per giro** (massimo 8 passi bloccati per giro) invece di ritentare all'infinito nello
  stesso istante.
- **Battito periodico e guardiano esterno.** L'agente scrive un segno di vita ogni 2 minuti; se tace per 10, un
  processo esterno lo ricarica da solo.
- **Diffidare dei dati che sembrano validi.** Un'interrogazione su una zona non caricata restituiva un valore
  plausibile ma falso (altezza massima del mondo): ogni dato esterno va controllato contro limiti sensati.
- **Errori uguali raggruppati:** lo stesso errore entro 30 secondi si conta, non si ripete nel registro.
- **Autodiagnosi all'avvio:** prova gratuita delle funzioni base, così un guasto si scopre subito. "Impossibile
  provare" (per esempio spazio mancante) non è un guasto e non va segnalato come tale.
- **Aggiornamenti automatici sicuri:** scarica in una cartella a parte, verifica tutto, solo dopo sostituisce;
  se qualcosa non torna scarta l'aggiornamento e il sistema vecchio continua. Mai installare una versione più
  vecchia (le cache a volte la mostrano), e la versione vera è quella dentro il pacchetto, non quella annunciata.
- **Aggiornare con il minimo disturbo:** se cambia solo la logica, ricaricarla a caldo (pochi secondi); il riavvio
  completo solo quando cambia ciò che gira sotto. E controllare sempre che dopo il ricaricamento il sistema riparta
  davvero, altrimenti passare da soli al riavvio completo.
- **Non sovrascrivere un programma mentre gira:** si scrive il file nuovo accanto e lo si sostituisce con uno
  spostamento atomico.
- **Avvio automatico all'accensione:** un sistema che deve sempre girare non deve dipendere da qualcuno che lo
  lancia a mano.
- **Ogni modifica con il suo test.** Ogni correzione porta un test del caso che l'ha causata, e prima di ogni
  rilascio girano tutti i test vecchi.

## 9. Farsi vedere: osservabilità

- **Rapporti completi a ogni chiusura, a ogni crash e periodicamente:** stato, attività, costi, errori,
  apprendimento. "Vita, morte e miracoli" della sessione.
- **Pannello in diretta leggibile da telefono:** cosa sta facendo, dove, con che salute, quanto spende, cosa ha
  imparato. Testi umani ("raccogli legna x2"), non dati grezzi, e ora locale, non quella del server.
- **Notifiche solo per gli eventi che contano** (crash, morte, scoperte importanti, budget finito, aggiornamenti),
  senza doppioni ravvicinati.
- **Le righe tecniche servono alle macchine, non alle persone:** nel terminale e nei rapporti si mostrano solo
  quelle utili da leggere.

## 10. Registro degli errori che hanno insegnato di più

| Problema | Causa | Regola nata |
|---|---|---|
| $6 spesi in una notte | modello chiamato a ogni fallimento in un ciclo | modalità zero, raggruppamento, limite di frequenza |
| 41 morti in 40 minuti | rinascita in acqua e ripetizione dello stesso compito | riflessi di salvataggio, zone pericolose |
| 166 esplorazioni a vuoto | meta lontana irraggiungibile in un colpo | movimento a tappe con verifica |
| Ordini rifiutati "è notte" | piano dell'agente sopra la persona | l'ordine della persona viene prima di tutto |
| Server crashato (36 s di blocco) | ciclo di tentativi senza limite nello stesso istante | budget di tempo e massimo tentativi per giro |
| Bot all'altezza massima del mondo | dato falso da una zona non caricata | controllo dei dati contro limiti sensati |
| Fermo 20 minuti su un nemico irraggiungibile | inseguimento senza limite di tempo | 10 secondi senza progressi: lascia perdere |
| 6 morti in 20 minuti di notte | lungo viaggio verso casa al buio senza armatura | di notte, senza protezione, rifugio sul posto |
| Riassunto "0 blocchi" | contatori azzerati dai riavvii | contatori cumulativi salvati |
| Caccia all'1% | posti ricordati ormai vuoti, un solo tipo di preda | dimenticare i posti vuoti, allargare l'obiettivo, esplorare |
| Fusioni al 2% con 81 ciottoli | la fornace richiede il banco, il banco il legno: si fermava al primo anello | rinviare al prerequisito più a monte |
| 4 morti per scheletri accanto a casa, di notte | il riparo notturno scattava solo lontano da casa | il pericolo dipende dalla protezione che hai, non da quanto sei vicino a casa |
| Ogni posto "occupato" da un blocco mai visto (leaf_litter) | si elencavano i casi buoni invece di quelli cattivi | quando il mondo cambia, definisci l'eccezione rara (opere fatte a mano) e lascia passare il resto |
| Annegato 3 volte dopo essere stato "salvato" sul fondo di un lago | la ricerca della superficie salta l'acqua e restituisce il fondale | quando cerchi un posto sicuro, controlla anche cosa c'è sopra il punto, non solo il punto |
| Soffocato dentro un tronco nonostante 10 salvataggi | il salvataggio cercava il terreno scendendo nei tronchi e rimetteva il bot nel legno; il punto pericoloso veniva segnato dopo lo spostamento | per uscire da un blocco si va verso l'alto, dove c'è aria; si segna il pericolo dove è successo, non dove si arriva |
| Fame 3 con 2 polli crudi in tasca e 0 pasti | il pollo crudo non era nella lista del cibo (può dare nausea) | in emergenza il cibo "cattivo" è meglio di niente: le regole prudenti devono avere una via d'uscita |
| A vita 1 attaccava un drowned dopo l'altro e poi moriva | la scelta del bersaglio non guardava la vita; la ritirata durava 2 secondi e poi ripartiva | da ferito non si cercano lotte: ci si difende solo da chi è già addosso, e si mangia anche il cibo di ripiego |
| 8 copie "in conflitto" del log di avvio su Drive in una notte | un file che cresce di continuo dentro una cartella sincronizzata viene caricato a metà | nelle cartelle sincronizzate scrivi file piccoli e sostituiscili in un colpo solo; il log lungo tienilo in locale |
| Lo spostamento della casa fuori dalla palude l'avrebbe rifatto ogni 30 minuti, cancellando ogni volta fattoria e luoghi | contava anche i pericoli vecchi, già "pagati" con il primo spostamento | dopo una decisione drastica, conta solo i fatti nuovi; e non buttare ciò che funziona (la fattoria al 92%) |
| 2 morti per esplosione di creeper a vita 5 | colpiva il creeper e si allontanava solo 6-8 blocchi per 2 secondi | contro un pericolo che esplode non si combatte da feriti: ci si allontana abbastanza e si aspetta |
| Un aggiornamento urgente rimasto fermo 30 minuti | dopo di lui ne era uscito uno normale e l'urgenza vale solo per l'ultima versione | quando una correzione urgente viene superata, anche la successiva va segnata come urgente |
| La VPN per vedere il pannello da fuori ha bloccato la sincronizzazione dei rapporti | una VPN di sistema cambia la rete per tutte le app, non solo per quella che serve | un accesso remoto va dato solo al servizio che serve (Tailscale dentro il server), senza toccare la rete del dispositivo |
| Annegato 26 secondi dopo essersi chiuso nella tana | si controllava l'acqua sotto e sopra la buca, non ai lati | un rifugio va controllato da tutti i lati da cui può entrare il pericolo, non solo da quelli ovvi |
| 6 morti in 13 minuti di notte, quasi tutte per scheletri, mentre costruiva un rifugio senza i ciottoli | con 34 blocchi qualsiasi in tasca sceglieva il rifugio costruito (riuscito 7 volte su 55) invece della tana; e dopo un riparo fallito non riprovava | scegli il piano di emergenza che ha funzionato di più, e se fallisce riprova subito invece di restare scoperto |
| 4 morti per zombie in 2 minuti intorno a casa, rinascendo ogni volta nello stesso posto | dopo ogni morte tornava subito a recuperare gli oggetti in mezzo agli stessi mostri | dopo due fallimenti ravvicinati non si torna sul posto: ci si mette al sicuro, si accetta la perdita e si riparte |
| "Nessuno spiazzo" senza sapere perché | il messaggio di errore non diceva la causa | ogni rifiuto deve dire il motivo (acqua, pendenza, pericolo...): senza, non si può correggere |
| Nessuno spiazzo libero per giorni, anche cercando lontano | il terreno naturale un blocco più alto contava come "costruzione" | distinguere ostacoli veri (opere di altri) da imperfezioni che si possono sistemare |
| 6 rifugi cominciati in una notte, nessuno finito | spinto dai mostri ricominciava ogni volta altrove, e senza blocchi non poteva chiuderlo | non abbandonare un lavoro di protezione a metà; se mancano i mezzi, scegliere la protezione più semplice possibile (una tana) |
| Rifugio finito ma morto lo stesso | lo costruiva restando fuori, poi usciva a fare altro | finita la protezione, mettersi dentro e restarci finché dura il pericolo |
| Deposito e bosco "nessuno spiazzo" per giorni | cercava il posto in 12 punti fissi | allargare la ricerca a cerchi crescenti prima di arrendersi |
| Rifugio notturno mai costruito con 88 blocchi di pietra in tasca | il progetto chiedeva solo ciottoli | se manca il materiale previsto, usare quello equivalente che si ha: il fine è il riparo, non il ciottolo |
| 40 cadute di fila dallo stesso punto, ogni compito fallito all'istante | il "punto sicuro" a cui tornare era sul bordo del vuoto | dopo 3 salvataggi uguali in poco tempo, il punto sicuro non lo è: spostarsi altrove |
| 4 morti in 2 minuti di notte | il rifugio notturno rinviava a "vai a prendere legna" per le torce | in modalità protetta i prerequisiti che portano fuori si saltano, non si rinviano |
| Bosco, casetta e deposito "nessuno spiazzo" | ricerca fatta da lontano in zone non caricate | andare sul posto prima di cercare |

---

## Appendice: esperienza specifica di Minecraft

Queste lezioni valgono solo nel gioco e restano qui per completezza:
- ferro a y 16, diamanti a y -58 con piccone di ferro; miniera a rami alla quota giusta;
- fornace: servono 8 cobblestone (diorite, granito e andesite non contano) e un banco da lavoro; torce: carbone o carbonella più bastoni;
- ricettario completo (circa 680 ricette e 68 fusioni): tutte le famiglie di legno, pietra e colore, redstone, binari, cibi composti, netherite; gli id che la versione del gioco non conosce vengono scartati all'avvio;
- i drowned stanno in acqua e possono uscire sulla riva anche di giorno; di notte zombie, scheletri e creeper;
- nelle grotte si cade: pavimento sulle cavità, acqua e lava tappate prima di scavare;
- la casa del bot va vicino a quella del giocatore ("casa qui"): fattoria, deposito e rifugio si fanno lì.
