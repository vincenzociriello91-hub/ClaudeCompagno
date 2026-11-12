# Novità di Claude Compagno

## 2.8.103 — attuale (12/11/2026)
- **Nuovi comandi a distanza nel pannello** (scheda Odin, "Ordini al bot e al server"): torna a casa, chiuditi in tana, vieni da me, pausa, riprendi, aggiorna il bot adesso, copia del mondo su Drive (cartella backup_mondo, restano le ultime 2), ricollega Tailscale, riavvia il pannello.
- **PIN per tutti i comandi**: la prima volta il telefono chiede di scegliere il PIN e poi lo ricorda. Sulla Odin resta solo in forma cifrata, mai su GitHub. Dopo 5 PIN sbagliati i comandi si bloccano per 10 minuti.

## 2.8.102 — precedente (12/11/2026)
- **Il pannello riparte da solo**: stamattina la pagina non si apriva. Prima il telefono era scollegato da Tailscale, poi, con Tailscale acceso, la Odin rispondeva "connessione rifiutata": il pannello si era fermato e nessuno lo faceva ripartire. Ora, se si ferma, riparte da solo dopo 30 secondi, e il motivo finisce su Drive (pannello_errore.txt). Questo aggiornamento riavvia il server una volta (un paio di minuti).

## In programma
- Armatura di ferro: il banco da lavoro c'è, ora servono legna e fornace per armatura e attrezzi.
- Accesso al mondo solo per te e gli amici scelti (sicurezza del tunnel).
- Meno morti di notte senza armatura, fino a passare più notti di fila senza morire (primo criterio per fare da maestro).
