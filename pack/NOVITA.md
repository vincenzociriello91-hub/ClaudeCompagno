# Novità di Claude Compagno

## 2.8.60 — attuale (10/11/2026)
- **Inventario**: butta gli archi doppi (ne aveva 7, uno per casella) e tiene al massimo 16 tra ghiaia, ossa e frecce. Se restano meno di 4 posti liberi butta anche le cose che non usa (conchiglie, guinzagli, polvere da sparo, piume...). Ferro, rame, carbone, terra e tridente non si toccano.
- **Caccia e costruzioni**: trovato un guasto comune. Quando il bot restava bloccato un attimo, il segnale "strada bloccata" restava acceso: la caccia cancellava dalla mappa un posto di animali ogni frazione di secondo (16 posti in 2 secondi) e le costruzioni saltavano tutti i blocchi rimasti. Ora il segnale vale una volta sola.
- **Piano**: non va più a prendere quello che ha già (sabbia con 31 in tasca, carbone con 54). Una raccolta lunga non scade più a 10 minuti finché continua a raccogliere (pietra x100 per la casetta). All'alba aspetta ancora un minuto nella tana: i mostri sono ancora in giro.

## 2.8.59 — precedente (10/11/2026)
- **Legna**: trovata la causa del "trovati 0 blocchi di legna". Quando la strada verso un albero era bloccata il bot veniva portato *dentro il tronco*: soffocava, veniva salvato in cima all'albero, cadeva, e l'albero finiva segnato come "zona pericolosa" e dimenticato. Ora arriva a terra accanto all'albero.
- Le zone pericolose nate da un salvataggio (caduta, soffocamento) scadono dopo 3 ore: quelle vecchie nascondevano i boschi vicino a casa. Le zone dove è morto restano.

## In programma
- Armatura di ferro: il banco da lavoro c'è, ora servono legna e fornace per armatura e attrezzi.
- Accesso al mondo solo per te e gli amici scelti (sicurezza del tunnel).
- Meno morti di notte senza armatura, fino a passare più notti di fila senza morire (primo criterio per fare da maestro).
