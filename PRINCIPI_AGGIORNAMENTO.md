# Principi per ogni aggiornamento del bot

Voluti da Vincenzo il 14/11/2026. Valgono per chi modifica il bot (la chat del bot o qualsiasi altra).
`PRINCIPI_BOT.md` dice **come gioca** il bot (regole fisse, missione in ordine, "non fermarsi" come modo di applicarla).
Questi principi dicono **come si decide e si pubblica** un aggiornamento. Prima di pubblicare, ogni punto deve avere
risposta "sì". Se uno è "no", non si pubblica.

Ordine quando due cose si scontrano: **la salute della Odin**, poi **i principi del bot**, poi questi.

## Decidere

1. **Nasce da un fatto.** Ogni modifica parte da qualcosa visto nei rapporti (una morte, un blocco, un compito che
   fallisce, una spesa), non da un'ipotesi. Nel commit c'è il fatto che l'ha causata.
2. **Serve un principio del bot senza tradirne uno più in alto.** Si dice quale principio di `PRINCIPI_BOT.md`
   migliora. Mai a spese di uno che sta sopra (niente esplorazione che espone la sopravvivenza) e mai rendendo il
   bot fermo: più prudenza sì, ma il bot deve continuare a fare lavoro utile.
3. **Prima si guarda cosa cambia di conseguenza.** Quando il bot ottiene qualcosa di nuovo (armatura, arma, casa,
   base) si cercano nel codice tutte le regole che dipendono da quella cosa e si sistemano nella stessa modifica.
   Il 14/11 la corazza di ferro ha spento la prudenza con i creeper e il riparo di notte: 5 morti.
4. **Una cosa per volta.** Un aggiornamento corregge un problema solo, così si capisce se ha funzionato. Vale anche
   nelle emergenze.

## Pubblicare

5. **Provato prima.** Una prova automatica che fallisce senza la correzione e passa con la correzione; tutte le altre
   prove passano.
6. **Ritmo.** Al massimo un aggiornamento ogni 2 ore, e il successivo solo dopo aver visto in gioco che il precedente
   funziona. Eccezioni, sempre dichiarate a Vincenzo:
   - emergenza: il bot è morto 2 o più volte in un'ora, oppure Odin o pannello sono irraggiungibili;
   - la correzione serve proprio a rendere verificabile quella precedente (esempio: la 2.8.112 che sbloccava la 2.8.111).
7. **Niente si perde.** Memoria, manuale, esperienza e mondo del bot sopravvivono a ogni aggiornamento.
8. **Costo zero.** Nessuna spesa in più (chiamate a pagamento, modelli più cari) senza il via libera di Vincenzo.
9. **La Odin prima di tutto.** Nessun aggiornamento che la faccia scaldare, consumare di più o rischiare.

## Verificare

10. **Si misura il risultato, non l'intenzione.** Un aggiornamento è buono se, a parità di tempo, il bot muore meno
    **e** fa almeno le stesse cose (costruito, raccolto, esplorato, imparato). Meno morti ma bot fermo è un
    peggioramento.
11. **Se peggiora, si torna indietro.** Se i rapporti dopo l'aggiornamento sono peggiori di prima, si rimette la
    versione precedente invece di aggiungere altre correzioni sopra. Si corregge in avanti solo se tornare indietro
    non annulla il danno (esempio: la corazza è già stata fatta).
12. **Mai lo stesso errore due volte.** Ogni errore corretto diventa una regola scritta nel manuale di esperienza, con
    il fatto che l'ha insegnata.

## Raccontare

13. **Vincenzo sa sempre cosa è successo.** A ogni versione: cosa cambia e perché, costo online/offline/totale,
    tabella "Dove è bravo / dove no", percentuale verso maestro, cosa non è stato verificato. Tra una versione e
    l'altra lo si disturba solo per novità importanti (morti, maestro pronto, Odin o server fermi).
