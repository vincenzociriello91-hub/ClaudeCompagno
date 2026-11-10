# Novità di Claude Compagno

## 2.8.79 — attuale (10/11/2026)
- **Basta fughe infinite dal creeper**: stasera il bot è rimasto 28 minuti a "scappare" da un creeper con la vita piena, senza spostarsi davvero e senza fare altro; la notte l'ha passata all'aperto. Ora la fuga dura al massimo 10 secondi: se il creeper è ancora vicino, il bot si chiude in una tana lì dov'è e quel creeper lo riguarda solo se arriva a 4 blocchi.
- **La tana viene sempre scavata**: mentre il bot combatteva o scappava, nessun compito andava avanti, nemmeno la tana della notte. Ora con la tana da scavare non combatte e non scappa: scava e si chiude.
- **"Al riparo" vuol dire dentro**: se di notte il riparo è fatto ma il bot è fuori (era rimasto sul tetto della tana), rientra; se la tana è lontana o non c'è più, ne scava un'altra.

## 2.8.78 — precedente (10/11/2026)
- **Via i "fantasmi" del bot**: a ogni aggiornamento il bot vecchio restava nel mondo, fermo e senza comandi, e quello nuovo nasceva con un numero accanto al nome (fino a "Claude(6)"). Questi doppioni attirano i mostri, impediscono di chiudere la tana nel punto in cui stanno e, quando muoiono, lasciano a terra copie degli oggetti. Ora, prima di far nascere il bot nuovo, vengono tolti tutti. Era anche la causa dell'errore "non riesco a chiudere la tana" visto dopo gli aggiornamenti.

## In programma
- Armatura di ferro: il banco da lavoro c'è, ora servono legna e fornace per armatura e attrezzi.
- Accesso al mondo solo per te e gli amici scelti (sicurezza del tunnel).
- Meno morti di notte senza armatura, fino a passare più notti di fila senza morire (primo criterio per fare da maestro).
