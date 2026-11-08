#!/bin/bash
# Prepara Debian (dentro Termux) per il server Bedrock con Claude Compagno.
# Lo lancia installa.sh. Variabili: GAMERTAG, APIKEY, BUDGET; AGGIORNA=1 copia solo i file nuovi.
set -euo pipefail
SRC=/mnt/claudemc
BASE=/root/claudemc
IMP=$BASE/impostazioni

echo "[*] Copio pacchetto e script..."
mkdir -p "$BASE" "$IMP"
rm -rf "$BASE/pack"
cp -r "$SRC/pack" "$BASE/pack"
cp "$SRC/debian/avvia.sh" "$SRC/debian/patch_level.py" "$SRC/debian/pannello.py" "$SRC/debian/pannello.html" "$BASE/"
chmod +x "$BASE/avvia.sh"
# versione installata: l'aggiornamento automatico da GitHub scarica solo se ne esce una più nuova
cp "$SRC/VERSIONE" "$BASE/.versione" 2>/dev/null || true
cp "$SRC/MANUALE_ESPERIENZA.md" "$BASE/" 2>/dev/null || true

if [ "${AGGIORNA:-0}" = 1 ]; then
  echo "[✓] File aggiornati. Le impostazioni restano quelle di prima."
  exit 0
fi

echo "[*] Installo i pacchetti Debian (box64, jq, python3...)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y box64 jq unzip curl ca-certificates python3 rsync procps

python3 -I "$BASE/patch_level.py" --test

echo "[*] Installo playit (tunnel per gli amici fuori casa)..."
curl -fsSL -o /usr/local/bin/playit https://github.com/playit-cloud/playit-agent/releases/latest/download/playit-linux-aarch64 \
  && chmod +x /usr/local/bin/playit || echo "[!] playit non installato: serve solo per giocare da fuori casa"

echo "[*] Salvo le impostazioni..."
jq -n --arg p "$GAMERTAG" --argjson b "${BUDGET:-1}" '{
  proprietario: $p, nome_bot: "Claude",
  modello_rapido: "claude-haiku-5-5", modello_medio: "claude-sonnet-5-5", modello_complesso: "claude-opus-5-5",
  budget_giornaliero_usd: $b, attivo_senza_giocatori: true }' > "$IMP/variables.json"
umask 077
jq -n --arg k "$APIKEY" '{ANTHROPIC_API_KEY: $k}' > "$IMP/secrets.json"
chmod 600 "$IMP/secrets.json"

echo "[*] Scarico il server e creo il mondo (alcuni minuti)..."
bash "$BASE/avvia.sh" --prepara
echo "[✓] Debian pronto."
