#!/data/data/com.termux/files/usr/bin/bash
# Installa il server Minecraft Bedrock con Claude Compagno sulla Odin (Termux).
# Uso: bash installa.sh            prima installazione (fa 3 domande)
#      bash installa.sh --aggiorna  copia solo pacchetto e script nuovi
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DEBIAN_LOGIN=(proot-distro login debian --bind "$DIR:/mnt/claudemc" --bind /storage/emulated/0:/sdcard --)

if [ ! -w /sdcard/Download ]; then
  echo "Concedi l'accesso alla memoria a Termux e poi rilancia lo script."
  termux-setup-storage
  exit 1
fi
LOG=/sdcard/Download/ClaudeMinecraft_installazione.txt
exec > >(tee "$LOG") 2>&1
echo "== Claude Compagno per Minecraft — installazione $(date '+%Y-%m-%d %H:%M:%S')"

crea_comandi() {
echo "[*] Creo i comandi mc-avvia, mc-ferma, mc-tunnel, mc-chiave..."
cat > "$PREFIX/bin/mc-avvia" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# tiene sveglia la Odin finché il server è acceso
termux-wake-lock
proot-distro login debian --bind /storage/emulated/0:/sdcard -- bash /root/claudemc/avvia.sh "$@"
termux-wake-unlock
EOF
cat > "$PREFIX/bin/mc-ferma" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# con il server spento nessuno legge la console: senza timeout restava bloccato per sempre
if proot-distro login debian -- timeout 5 bash -c '[ -p /root/claudemc/console ] && echo stop > /root/claudemc/console'; then
  proot-distro login debian -- touch /root/claudemc/.stop_richiesto
  echo "Server in chiusura: il rapporto arriva in Download/Odin2_report"
else
  echo "Il server non è acceso: niente da fermare"
fi
EOF
cat > "$PREFIX/bin/mc-tunnel" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# indirizzo pubblico per gli amici fuori casa: al primo avvio apri il link che compare
proot-distro login debian -- playit
EOF
cat > "$PREFIX/bin/mc-chiave" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
read -rsp "Nuova chiave API di Claude: " K; echo
proot-distro login debian -- env K="$K" bash -c 'umask 077; jq -n --arg k "$K" "{ANTHROPIC_API_KEY: \$k}" > /root/claudemc/impostazioni/secrets.json' && echo "Chiave aggiornata: vale dal prossimo mc-avvia"
EOF
chmod +x "$PREFIX/bin/mc-avvia" "$PREFIX/bin/mc-ferma" "$PREFIX/bin/mc-tunnel" "$PREFIX/bin/mc-chiave"
}

if [ "${1:-}" = "--aggiorna" ]; then
  "${DEBIAN_LOGIN[@]}" env AGGIORNA=1 bash /mnt/claudemc/debian/setup.sh
  crea_comandi
  echo "[✓] Aggiornamento copiato: al prossimo mc-avvia il bot usa la versione nuova."
  exit 0
fi

read -rp "Il tuo nome in Minecraft (gamertag, esatto): " GAMERTAG
read -rsp "Chiave API di Claude (non viene mostrata): " APIKEY; echo
read -rp "Budget massimo al giorno in dollari [1]: " BUDGET
BUDGET=${BUDGET:-1}
[[ "$BUDGET" =~ ^[0-9]+([.][0-9]+)?$ ]] || { echo "[✗] Budget non valido: $BUDGET"; exit 1; }
[ -n "$GAMERTAG" ] || { echo "[✗] Il gamertag serve per sapere chi è il proprietario"; exit 1; }
[[ "$APIKEY" == sk-ant-* ]] || echo "[!] La chiave non inizia con sk-ant-: controlla di averla copiata tutta"

echo "[*] Aggiorno Termux e installo proot-distro..."
pkg update -y && pkg upgrade -y
pkg install -y proot-distro
if ! proot-distro login debian -- true 2>/dev/null; then
  echo "[*] Installo Debian (qualche minuto)..."
  proot-distro install debian
fi

echo "[*] Configuro Debian, scarico il server e creo il mondo..."
"${DEBIAN_LOGIN[@]}" env GAMERTAG="$GAMERTAG" APIKEY="$APIKEY" BUDGET="$BUDGET" bash /mnt/claudemc/debian/setup.sh
unset APIKEY

crea_comandi

echo
echo "[✓] Installazione completata."
echo "    Avvia il server con:  mc-avvia"
echo "    Fermalo con:          mc-ferma   (da una seconda sessione di Termux)"
echo "    Amici fuori casa:     mc-tunnel  (in un'altra sessione)"
echo "    Cambia chiave API:    mc-chiave"
