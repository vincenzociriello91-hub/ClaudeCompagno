# Novità di Claude Compagno

## 2.8.106 — attuale (12/11/2026)
- **Trovata la causa di Tailscale scollegato**: al riavvio del server il vecchio programma di Tailscale restava bloccato a metà chiusura. Sembrava ancora acceso, quindi quello nuovo non partiva mai. Ora, se dopo 5 secondi non si è chiuso, viene chiuso per forza e ne parte uno nuovo.

## 2.8.105 — precedente (12/11/2026)
- **Tailscale si ricollega da solo**: dopo il riavvio del server di stamattina la Odin restava "Not connected" e da fuori casa la pagina non si apriva. Ora, se per 3 controlli di fila Tailscale non ha un indirizzo, il programma di Tailscale sulla Odin viene riavviato da capo. Il file tailscale_stato.txt su Drive non arriva più vuoto.

## In programma
- Armatura di ferro: il banco da lavoro c'è, ora servono legna e fornace per armatura e attrezzi.
- Accesso al mondo solo per te e gli amici scelti (sicurezza del tunnel).
- Meno morti di notte senza armatura, fino a passare più notti di fila senza morire (primo criterio per fare da maestro).
