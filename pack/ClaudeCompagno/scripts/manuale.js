// Manuale di sopravvivenza per Minecraft Bedrock, scritto apposta per il bot (sintesi propria, non copiato da wiki).
// Aggiornato a Bedrock 26.60-26.63 (novembre 2026), dati verificati su minecraft.wiki e sui changelog ufficiali.
// Sta nel prompt di sistema, che è in cache: costa pochissimo leggerlo a ogni decisione.
export const MANUALE = `MANUALE DI SOPRAVVIVENZA — Minecraft Bedrock 26.6x (novembre 2026)
Valori di Bedrock, a difficoltà Normale. Dove Bedrock differisce da Java vale Bedrock.

REGOLE D'ORO
- Luce: in Bedrock i mostri nascono SOLO dove la luce dei blocchi è 0. Una torcia (luce 14) protegge circa 12 blocchi intorno: base, miniere e recinti illuminati = nessun mostro.
- Diamanti, redstone e oro: piccone di FERRO o meglio. Con pietra o rame il blocco si rompe ma non lascia niente.
- Mai scavare dritto in giù (lava, cadute) né dritto in su sotto sabbia o ghiaia (soffocamento): scala o tunnel.
- Dormire ogni notte: dopo 3 notti senza dormire arrivano i phantom (in Bedrock fanno 6 danni, anche di giorno sotto il cielo aperto).
- Gli oggetti di chi muore restano a terra 5 minuti: si recuperano subito, se è sicuro.

TEMPO, LUCE E SONNO
- Un giorno = 24000 tick = 20 minuti. 0 alba, 6000 mezzogiorno, 12000 tramonto, ~13000 notte piena, 18000 mezzanotte, ~23000 alba.
- Si può dormire da circa il tick 12540 (12010 con la pioggia). Non si dorme con mostri entro 8 blocchi.
- Il letto imposta il punto di rinascita. Nel Nether e nell'End il letto ESPLODE.
- Zombie e scheletri bruciano al sole (non se hanno l'elmo o stanno all'ombra o in acqua). Husk, stray, parched e drowned non bruciano.
- Nessun mostro nasce su vetro, lastre inferiori o tappeti, né entro 24 blocchi da un giocatore.

MOSTRI: COME AFFRONTARLI (vita, danno)
- Zombie (20 vita, 3 danno): in gruppo, i piccoli sono velocissimi. Colpisci e arretra.
- Husk: zombie del deserto, dà Fame. Tieni cibo extra.
- Drowned: acqua, fiumi, oceani, anche di giorno; alcuni lanciano tridenti (fino a ~9). Attirali fuori dall'acqua, scudo.
- Scheletro (frecce 3-5): tiene la distanza. Avvicinati a zig-zag o con lo scudo, oppure riparati dietro un blocco.
- Stray (freddo): frecce di Lentezza. Bogged (paludi, Trial Chambers): frecce di Veleno. Parched (deserto, spesso in sella a un camel husk): frecce di Debolezza, non brucia al sole.
- Ragno (16 vita): di giorno neutrale, di notte attacca; scavalca i muri. Ragno delle caverne (12 vita): veleno; spawner nelle miniere abbandonate e nascita naturale nelle Sulfur Caves. Il latte toglie il veleno.
- Creeper (20 vita): miccia ~1,5 s, esplosione fino a 27 danni, rompe blocchi. Colpisci e arretra subito; mai vicino a costruzioni. I gatti lo spaventano.
- Enderman (40 vita, 7 danno): neutrale. Non guardarlo negli occhi. Se attacca: sotto un tetto alto 2 blocchi o in acqua.
- Strega (26 vita): pozioni di veleno, lentezza, danno; si cura. Assalto rapido.
- Slime: in paludi di notte e sotto y 40 in certe zone. I piccolissimi sono innocui.
- Silverfish: blocchi infestati in montagna e nelle stronghold; chiamano rinforzi.
- Phantom (20 vita, 6 danno): solo se non si dorme da 3 notti. Un tetto sopra la base aiuta.
- Pillager (balestra), vindicator (ascia, 13 danno), evoker (zanne, vex, lascia il totem dell'immortalità), ravager (100 vita): avamposti, magioni, raid. Scudo e distanza.
- Warden (500 vita, 30 danno, ignora l'armatura con il soffio sonico): Deep Dark e Ancient City. NON combatterlo mai: è cieco e sente le vibrazioni, muoviti piano o vattene.
- Breeze (30 vita): solo nelle Trial Chambers, respinge le frecce: corpo a corpo.
- Creaking: Pale Garden di notte, invulnerabile; si muove solo se nessuno lo guarda. Si ferma distruggendo il suo creaking heart nel tronco di pale oak vicino.
- Di notte deserti e pianure sono pericolosi: cavalli zombie con cavaliere e camel husk con husk armato di lancia e parched.
- Mai 3 o più mostri insieme senza armatura: prima ripararsi o arretrare verso i giocatori.
- Neutrali da NON provocare: golem di ferro (protegge i villici e uccide), lupi, api, lama, orsi polari con cuccioli, capre (spingono giù), pesci palla, zombie piglin (attaccano in gruppo).
- Combattimento in Bedrock: niente ricarica tra i colpi, ogni colpo fa danno pieno; colpo critico cadendo. Un colpo d'ascia disabilita lo scudo per 5 secondi.

SALUTE E CIBO
- La vita si rigenera solo con la fame a 18 o più (circa 1 cuore ogni 4 s). Sotto 18 non si guarisce: mangia prima di combattere.
- Cibi migliori: bistecca o braciola cotta 8 (saturazione 12,8), carota d'oro 6 (14,4), montone o salmone cotti 6, pollo cotto 6, zuppa di coniglio 10, pane 5, patata al forno 5, merluzzo cotto 5, torta di zucca 8.
- Scarsi o rischiosi: mela 4, carota 3, fetta d'anguria 2, alga secca 1, carne marcia 4 (80% Fame), pollo crudo 2 (30% Fame). La carne cruda va cotta.
- Mela d'oro: Rigenerazione e Assorbimento (emergenze). Miele: cura il veleno. Latte: toglie tutti gli effetti.
- Regola: mangia sotto 18 di fame, tieni almeno 16 pezzi di carne cotta o pane, dai il cibo migliore ai giocatori.

ATTREZZI (durabilità, danno spada, velocità)
- Legno 60, spada 5, x2. Pietra 132, spada 6, x4. Rame 191, spada 6, x5. Ferro 251, spada 7, x6. Diamante 1562, spada 8, x8. Netherite 2032, spada 9, x9. Oro 33 (inutile).
- Il RAME scava come la pietra (ferro, rame, lapislazzuli sì; oro, diamante, redstone, smeraldo, ossidiana NO) ma dura di più ed è più veloce: ottimo tra pietra e ferro.
- Ossidiana e ancient debris: piccone di diamante.
- Riparare: incudine con lingotti (25% a lingotto) o due attrezzi uguali uniti.

ARMATURE (punti: elmo/corpetto/gambali/stivali = totale)
- Cuoio 1/3/2/1 = 7. Rame 2/4/3/1 = 10 (ripiego economico prima del ferro). Oro 2/5/3/1 = 11 (i piglin non attaccano chi ne porta un pezzo). Ferro 2/6/5/2 = 15. Diamante 3/8/6/3 = 20. Netherite 20 più resistenza al contraccolpo.
- Ogni punto riduce il danno del 4%. Prima il corpetto, poi i gambali. Lo scudo para quasi tutto davanti (tranne l'ascia).

MINERALI: DOVE E CON COSA
- Carbone: y 0-320, meglio y 96 e in montagna. Legno.
- Rame: y -16 a 112, meglio y 48 (abbondante nelle dripstone caves). Pietra.
- Ferro: y 16 sottoterra, oppure y 232 in montagna (giacimenti enormi). Pietra o rame.
- Lapislazzuli: intorno a y 0. Pietra.
- Oro: intorno a y -16; molto comune nelle badlands. Ferro.
- Redstone: y -64 a 15, meglio y -59. Ferro.
- Diamante: y -64 a 16, meglio y -58/-59 (sopra la bedrock irregolare, y -64...-60). I filoni a contatto con l'aria sono più rari: si trovano scavando. Ferro.
- Smeraldo: solo nelle montagne, più in alto è meglio. Ferro.
- Sotto y 0 c'è la deepslate: più lenta da scavare.

MINING SICURO
- Branch mining: tunnel principale alto 2 a y -58, rami laterali ogni 3 blocchi (2 blocchi di parete tra i rami), torce ogni 8-10 blocchi.
- Per il ferro: tunnel a y 16 o scavare a strati una montagna.
- Lava: sotto y -55 molte cavità sono piene di lava. Se la vedi o la senti, tappa subito con un blocco. Un secchio d'acqua spegne il fuoco e trasforma la lava ferma in ossidiana.
- Ghiaia e sabbia cadono: mai scavare sotto di loro stando sotto.
- Danno da caduta = blocchi di caduta - 3.
- In acqua l'aria dura circa 15 s, poi 2 danni al secondo: esci subito verso riva.
- Nelle grotte illumina dietro di te e chiudi le gallerie laterali pericolose.
- Inventario ideale per scendere: 2 picconi, spada, scudo, 64 torce, blocchi di pietra, secchio d'acqua, cibo.

AGRICOLTURA E ANIMALI
- Grano: semi dall'erba alta, su terra arata con la zappa entro 4 blocchi dall'acqua, luce 9 o più. Farina d'ossa accelera.
- Carote e patate dai villaggi; zucche e angurie hanno bisogno di un blocco libero accanto; canna da zucchero vicino all'acqua.
- Allevare: grano per mucche, pecore e capre; carote, patate o barbabietole per maiali; semi per galline; carote o denti di leone per conigli; carne per lupi domati (si domano con le ossa); pesce crudo per gatti. Dopo l'accoppiamento 5 minuti di attesa, i cuccioli crescono in 20 minuti.
- Le pecore tosate con le cesoie danno 1-3 lane e la lana ricresce: per il letto servono 3 lane dello stesso colore.
- Lascia sempre almeno due animali per specie e tieni i recinti chiusi.

RICETTE UTILI
- Tronco = 4 assi; 2 assi = 4 bastoni; banco = 4 assi; cassa = 8 assi; fornace = 8 ciottoli; torcia = carbone o carbonella + bastone (4 torce).
- Attrezzi: piccone e ascia 3 materiali + 2 bastoni; spada 2 + 1; pala 1 + 2; zappa 2 + 2. Armature: elmo 5, corpetto 8, gambali 7, stivali 4 (24 in tutto).
- Scudo: 6 assi + 1 ferro. Secchio: 3 ferro. Cesoie: 2 ferro. Arco: 3 bastoni + 3 fili. Frecce: selce + bastone + piuma (4). Letto: 3 lane + 3 assi.
- Staccionata: 4 assi + 2 bastoni (3). Cancello: 4 bastoni + 2 assi. Scala a pioli: 7 bastoni. Falò: 3 bastoni + carbone + 3 tronchi.
- Lanterna: torcia + 8 pepite di ferro. Name tag: carta + 1 pepita (ferro, oro o rame). Carota d'oro: carota + 8 pepite d'oro.
- Affumicatore (cibo, 2 volte più veloce): fornace + 4 tronchi. Altoforno (minerali): fornace + 5 ferro + 3 pietra liscia.
- Fornace: minerali grezzi in lingotti, sabbia in vetro, ciottolo in pietra, argilla in mattone, tronco in carbonella, carne cruda in cotta. 10 s a pezzo. Combustibile: carbone 8 pezzi, tronco o asse circa 1,5, secchio di lava 100.

STRUTTURE DEL MONDO
- Villaggi: letti, cibo, casse. Professioni: bibliotecario (libri incantati, Mending), corazzaio e attrezzaio (equipaggiamento di ferro e diamante), contadino e frecciaio (smeraldi facili). Non colpire mai villici o golem di ferro.
- Miniere abbandonate: casse nei carrelli, ragnatele (spada o cesoie), spawner di ragni delle caverne: rompilo o mettici torce intorno.
- Dungeon: stanza di pietra muschiosa con spawner e casse (selle, mele d'oro). Torce sullo spawner lo spengono.
- Trial Chambers (rame e tufo, y -40...0): spawner che danno chiavi per i vault; breeze e bogged. Andarci con scudo e armatura.
- Ancient City (Deep Dark, circa y -51): ottimo bottino ma c'è il warden. Solo accovacciati, mai correre, meglio evitarla.
- Piramide del deserto: NON calpestare la piastra al centro (TNT sotto). Tempio della giungla: trappole a filo.
- Relitti e portali in rovina: oro, ferro, mappe del tesoro. Abandoned Camp (foreste, novità 2026): casse e mappe esploratore.
- Sulfur springs e Sulfur Caves (novità 2026): pozze di zolfo con gas che dà Nausea, geyser che lanciano in aria, ragni delle caverne. Lo sulfur cube è innocuo (assorbe blocchi; con il TNT diventa esplosivo, con il magma scotta).
- Avamposti e magioni: pericolosi senza armatura di ferro.

NOVITÀ DEL GIOCO 2025-2026 (già nel gioco normale)
- Rame: attrezzi, armatura (10 punti), copper golem (blocco di rame + zucca intagliata: smista gli oggetti dal copper chest alle casse).
- Happy ghast: da un dried ghast messo in acqua; con l'imbracatura porta fino a 4 giocatori in volo. Sella craftabile.
- Lancia, nautilus cavalcabili, cavalli zombie e camel husk con cavalieri (pericolosi di notte).
- Name tag craftabile; golden dandelion (ferma la crescita dei cuccioli).
- Sulfur Caves e sulfur cube; dappled forest con pioppi e Abandoned Camp; letti di paglia, lastre e scale di lana.
- Solo SPERIMENTALI (non nei mondi normali): Ice Caves, Frostbite, effetto Freezing.

INCANTESIMI E POZIONI (per più avanti)
- Tavolo per incantesimi: 1 libro + 2 diamanti + 4 ossidiana; 15 librerie intorno per il livello 30; costa lapislazzuli. Mending non esce dal tavolo: si prende dai bibliotecari.
- Priorità: armatura Protezione IV, Indistruttibilità III, Mending; piccone Efficienza V, Fortuna III; spada Affilatezza V; stivali Caduta piuma IV.
- Pozioni: servono verruca e polvere di blaze (dal Nether). Utili: guarigione, rigenerazione, resistenza al fuoco, visione notturna.

NETHER ED END (solo dopo armatura di ferro o diamante)
- Nether: portale di ossidiana almeno 4x5 acceso con l'acciarino; 1 blocco nel Nether = 8 nell'Overworld. Lava ovunque, ghast, piglin (porta un pezzo d'oro), hoglin, blaze e wither skeleton nelle fortezze. L'acqua evapora, i letti esplodono.
- End: si trova la stronghold con gli occhi di ender; il drago va affrontato distruggendo prima i cristalli. Endermen ovunque.

PROGRESSIONE CONSIGLIATA PER IL COMPAGNO
- Giorno 1: tronchi, banco, attrezzi di legno, poi di pietra; carbone e torce; cibo (animali) e fornace per cuocere; riparo illuminato o letto prima del tick 12000.
- Giorni 2-3: rame (y 48) per armatura e attrezzi di ripiego; ferro (y 16) per piccone, scudo, secchio, cesoie e armatura (24 lingotti). Recinto con 2 mucche e 2 pecore, campo di grano.
- Giorni 4-7: branch mining a y -58 per diamanti (piccone 3, spada 2, armatura 24, tavolo per incantesimi 2). Villaggio e scambi.
- Da compagno: resta entro circa 10 blocchi dai giocatori quando c'è pericolo, affronta i creeper prima che si avvicinino, illumina la base, dai cibo e armatura in più, ricorda ai giocatori di dormire.

ERRORI DA NON FARE
- Scavare diamanti, oro o redstone con piccone di pietra o di rame (si perdono).
- Scavare in verticale; camminare su ghiaia sopra la lava; restare in acqua.
- Lasciare avvicinare un creeper; guardare o colpire un enderman; colpire golem, villici, lupi o zombie piglin.
- Non dormire per 3 notti; mettere il letto nel Nether.
- Esplorare di notte deserti e pianure, o entrare nell'Ancient City facendo rumore.
- Lasciare oggetti a terra dopo una morte: spariscono in 5 minuti.`;
