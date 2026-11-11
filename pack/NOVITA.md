# Novità di Claude Compagno

## 2.8.80 — attuale (11/11/2026)
- **Creeper a pochi passi: subito sotto terra**: stamattina il bot è morto per un creeper mentre "scappava" con la vita quasi piena: su terreno accidentato non si allontanava abbastanza in fretta. Ora, senza armatura di ferro, se il creeper è entro 8 blocchi il bot non scappa: si chiude subito in una tana (la scava in meno di un secondo) e ci resta un minuto e mezzo. Più lontano continua ad allontanarsi come prima; se lì la tana non si può scavare (acqua, roccia) scappa.

## 2.8.79 — precedente (10/11/2026)
- **Basta fughe infinite dal creeper**: stasera il bot è rimasto 28 minuti a "scappare" da un creeper con la vita piena, senza spostarsi davvero e senza fare altro; la notte l'ha passata all'aperto. Ora la fuga dura al massimo 10 secondi: se il creeper è ancora vicino, il bot si chiude in una tana lì dov'è e quel creeper lo riguarda solo se arriva a 4 blocchi.
- **La tana viene sempre scavata**: mentre il bot combatteva o scappava, nessun compito andava avanti, nemmeno la tana della notte. Ora con la tana da scavare non combatte e non scappa: scava e si chiude.
- **"Al riparo" vuol dire dentro**: se di notte il riparo è fatto ma il bot è fuori (era rimasto sul tetto della tana), rientra; se la tana è lontana o non c'è più, ne scava un'altra.

## In programma
- Armatura di ferro: il banco da lavoro c'è, ora servono legna e fornace per armatura e attrezzi.
- Accesso al mondo solo per te e gli amici scelti (sicurezza del tunnel).
- Meno morti di notte senza armatura, fino a passare più notti di fila senza morire (primo criterio per fare da maestro).
