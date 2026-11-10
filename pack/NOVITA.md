# Novità di Claude Compagno

## 2.8.76 — attuale (10/11/2026)
- **Niente giri a vuoto alla fattoria**: con il campo vuoto e senza semi il bot ci tornava di continuo (6 volte di fila, "raccolti 0, piantati 0"), perdendo mezza giornata di gioco. Ora, dopo una visita a vuoto, aspetta 15 minuti prima di tornarci.
- La 2.8.75 nel gioco: 45 minuti senza morti, maturità 55/100 (massimo), elmo di rame fatto e indossato.

## 2.8.75 — precedente (10/11/2026)
Quattro morti in 8 minuti con l'armatura di rame addosso. Quattro cause, quattro correzioni:
- **Notte controllata sempre**: "è notte, riparati" veniva controllato solo al tramonto. Ora ogni 5 secondi per tutta la notte: se un lavoro lo porta fuori al buio, lo molla e si ripara.
- **Il rame non rende forti**: con la corazza di rame il bot tornava a inseguire i mostri e non usava più il riparo d'emergenza. Ora resta prudente finché non ha la corazza di ferro.
- **Sotto tiro si ripara**: se uno scheletro che non riesce a raggiungere continua a colpirlo e la vita è a metà, si chiude in tana. Dai creeper non distoglie più lo sguardo finché sono vicini.
- **All'alba guarda fuori**: se intorno all'uscita della tana ci sono ancora mostri, aspetta dentro (al massimo fino a metà mattina).

## In programma
- Armatura di ferro: il banco da lavoro c'è, ora servono legna e fornace per armatura e attrezzi.
- Accesso al mondo solo per te e gli amici scelti (sicurezza del tunnel).
- Meno morti di notte senza armatura, fino a passare più notti di fila senza morire (primo criterio per fare da maestro).
