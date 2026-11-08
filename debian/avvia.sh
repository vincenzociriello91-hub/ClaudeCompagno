#!/bin/bash
# Avvia il server Minecraft Bedrock con Claude Compagno (dentro Debian su Termux).
# Ogni avvio: aggiorna il server alla versione del Play Store, reinstalla il pacchetto,
# attiva le API beta nel mondo, avvia, scrive i rapporti in Download/Odin2_report.
# Uso: avvia.sh            avvia il server (Ctrl+C o mc-ferma per fermarlo)
#      avvia.sh --prepara  scarica server e crea il mondo senza avviarlo
set -uo pipefail

BASE=/root/claudemc
SRV=$BASE/server
IMP=$BASE/impostazioni
REP=/sdcard/Download/Odin2_report
LOGDIR=$BASE/log
FIFO=$BASE/console
API="https://net-secondary.web.minecraft-services.net/api/v1.0/download/links"
PACK_UUID=474e90cf-a18d-47a6-8238-eb23d909064a
MOD_UUID=a0cc125d-961a-4e16-ad35-3716ead16d1f

mkdir -p "$LOGDIR" "$REP" "$BASE/backup"
INIZIO=$(date '+%Y-%m-%d %H:%M:%S')
LOG="$LOGDIR/server_$(date +%Y%m%d_%H%M%S).log"
LEVEL=""
CODICE=0
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

# Aggiornamento automatico gratuito: le versioni nuove del bot escono su GitHub (repository pubblico, nessun segreto
# dentro: chiave e impostazioni restano qui). Scarica, controlla e installa; ritorna 0 se ha installato una versione nuova.
# Per disattivarlo: touch /root/claudemc/impostazioni/no_aggiornamenti
REPO=vincenzociriello91-hub/ClaudeCompagno
# vero se $1 è una versione più alta di $2 (mai tornare indietro: la cache di GitHub a volte mostra la precedente)
piu_nuova() { [ -n "$1" ] && [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$2" "$1" | sort -V | tail -1)" = "$1" ]; }
nuova_disponibile() {
  [ -f "$IMP/no_aggiornamenti" ] && return 1
  piu_nuova "$(curl -fsS -m 20 "https://raw.githubusercontent.com/$REPO/main/VERSIONE" 2>/dev/null | tr -cd '0-9.')" "$(cat "$BASE/.versione" 2>/dev/null)"
}
# giocatori veri collegati ora (il bot non conta: entra come "Player Spawned", non "Player connected")
# (contati dall'ultimo "Server started": dopo un crash mancano le righe di uscita)
giocatori_online() { awk '/Server started/{n=0} /Player connected:/{n++} /Player disconnected:/{n--} END{print (n>0?n:0)}' "$LOG"; }
aggiorna_bot() {
  nuova_disponibile || return 1
  local nuova attuale tmp f
  attuale=$(cat "$BASE/.versione" 2>/dev/null)
  tmp=$(mktemp -d)
  # prima si controlla tutto in una cartella a parte: un download rotto non tocca il bot che funziona
  if ! curl -fsSL -m 180 "https://codeload.github.com/$REPO/tar.gz/refs/heads/main" | tar -xz -C "$tmp" --strip-components=1 2>/dev/null \
     || [ ! -f "$tmp/pack/ClaudeCompagno/manifest.json" ] || ! bash -n "$tmp/debian/avvia.sh" 2>/dev/null \
     || ! python3 -I "$tmp/debian/pannello.py" --test >/dev/null 2>&1; then
    log "Aggiornamento scartato: download incompleto o file non validi"
    rm -rf "$tmp"; return 1
  fi
  # la versione vera è quella dentro il pacchetto scaricato, non quella annunciata
  nuova=$(tr -cd '0-9.' < "$tmp/VERSIONE" 2>/dev/null)
  if ! piu_nuova "$nuova" "$attuale"; then rm -rf "$tmp"; return 1; fi
  rm -rf "$BASE/pack.nuovo" && cp -r "$tmp/pack" "$BASE/pack.nuovo" && rm -rf "$BASE/pack" && mv "$BASE/pack.nuovo" "$BASE/pack"
  # mv e non cp: avvia.sh è in esecuzione e bash lo legge a pezzi, sovrascriverlo sul posto lo romperebbe
  for f in avvia.sh patch_level.py pannello.py pannello.html; do cp "$tmp/debian/$f" "$BASE/$f.nuovo" && mv -f "$BASE/$f.nuovo" "$BASE/$f"; done
  chmod +x "$BASE/avvia.sh"
  cp "$tmp/MANUALE_ESPERIENZA.md" "$BASE/MANUALE_ESPERIENZA.md" 2>/dev/null || true
  echo "$nuova" > "$BASE/.versione"
  rm -rf "$tmp"
  log "Bot aggiornato alla versione $nuova (da GitHub)"
  return 0
}

# certificati per l'accesso Xbox e per le chiamate all'API di Claude
export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt SSL_CERT_DIR=/etc/ssl/certs

prop() { grep -E "^$1=" "$SRV/server.properties" | cut -d= -f2-; }
imposta_prop() {
  if grep -qE "^$1=" "$SRV/server.properties"; then sed -i "s|^$1=.*|$1=$2|" "$SRV/server.properties"
  else echo "$1=$2" >> "$SRV/server.properties"; fi
}

aggiorna_server() {
  local url nome tmp=$BASE/tmp_agg
  url=$(curl -fsS --max-time 30 "$API" | jq -r '.result.links[] | select(.downloadType=="serverBedrockLinux") | .downloadUrl' 2>/dev/null) || url=""
  if [ -z "$url" ] || [ "$url" = "null" ]; then
    log "Controllo aggiornamenti non riuscito: uso il server già installato"
    [ -x "$SRV/bedrock_server" ]; return
  fi
  nome=$(basename "$url")
  if [ "$(cat "$SRV/.versione" 2>/dev/null)" = "$nome" ]; then log "Server già aggiornato ($nome)"; return 0; fi
  log "Nuova versione del server: $nome. Scarico..."
  rm -rf "$tmp"; mkdir -p "$tmp"
  # minecraft.net chiude le connessioni HTTP/2 di curl: HTTP/1.1, user agent da browser, tentativi ripetuti
  if ! curl -fSL --http1.1 --retry 3 --retry-delay 5 --retry-all-errors -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" \
       --max-time 900 -o "$tmp/server.zip" "$url" || ! unzip -qo "$tmp/server.zip" -d "$tmp/nuovo"; then
    log "ERRORE: download o estrazione falliti"
    rm -rf "$tmp"; [ -x "$SRV/bedrock_server" ]; return
  fi
  if [ -d "$SRV/worlds" ]; then
    log "Backup dei mondi prima dell'aggiornamento..."
    tar -czf "$BASE/backup/mondi_$(date +%Y%m%d_%H%M%S).tar.gz" -C "$SRV" worlds
    ls -1t "$BASE"/backup/mondi_*.tar.gz | tail -n +6 | xargs -r rm -f
  fi
  mkdir -p "$SRV"
  # mondi e impostazioni dell'utente non si toccano
  rsync -a --exclude 'worlds/' --exclude 'server.properties' --exclude 'allowlist.json' --exclude 'permissions.json' --exclude 'config/' "$tmp/nuovo/" "$SRV/"
  for f in server.properties allowlist.json permissions.json; do [ -f "$SRV/$f" ] || cp "$tmp/nuovo/$f" "$SRV/" 2>/dev/null; done
  echo "$nome" > "$SRV/.versione"
  chmod +x "$SRV/bedrock_server"
  rm -rf "$tmp"
  log "Server aggiornato a $nome"
}

configura() {
  if [ ! -f "$SRV/.configurato" ]; then
    imposta_prop server-name "Claude Compagno"
    imposta_prop level-name "ClaudeMondo"
    imposta_prop gamemode survival
    imposta_prop difficulty normal
    imposta_prop view-distance 10
    imposta_prop tick-distance 4
    imposta_prop max-threads 6
    touch "$SRV/.configurato"
  fi
  # sempre: il bot non va espulso per inattività, gli errori degli script vanno nel log
  imposta_prop player-idle-timeout 0
  # Box64 emula x86 sulla Odin: con distanza 10 il server generava e spediva troppi chunk e laggava
  imposta_prop view-distance 6
  imposta_prop allow-list false # gli amici devono poter entrare senza essere aggiunti a mano
  imposta_prop content-log-file-enabled true
  imposta_prop content-log-console-output-enabled true
  local perm='{"allowed_modules":["@minecraft/server","@minecraft/server-ui","@minecraft/server-gametest","@minecraft/server-admin","@minecraft/server-net","@minecraft/server-editor"]}'
  # shortcut: non è documentato se la cartella usa l'UUID del pacchetto o del modulo, quindi scrivo in entrambe
  for d in default "$PACK_UUID" "$MOD_UUID"; do
    mkdir -p "$SRV/config/$d"
    echo "$perm" > "$SRV/config/$d/permissions.json"
    [ "$d" = default ] && continue
    cp "$IMP/variables.json" "$SRV/config/$d/variables.json"
    (umask 077; cp "$IMP/secrets.json" "$SRV/config/$d/secrets.json")
    # ripristino della memoria del bot: solo se l'utente ha preparato ClaudeMinecraft_ripristina.json (vale per questo avvio)
    if [ -s "$REP/ClaudeMinecraft_ripristina.json" ] && jq -e .lezioni "$REP/ClaudeMinecraft_ripristina.json" >/dev/null 2>&1; then
      jq --slurpfile r "$REP/ClaudeMinecraft_ripristina.json" '. + {ripristino_memoria: $r[0]}' "$SRV/config/$d/variables.json" > "$SRV/config/$d/v.tmp" && mv "$SRV/config/$d/v.tmp" "$SRV/config/$d/variables.json"
      RIPRISTINO=1
    fi
  done
  if [ "${RIPRISTINO:-0}" = 1 ]; then
    mv "$REP/ClaudeMinecraft_ripristina.json" "$REP/ClaudeMinecraft_ripristina_usato_$(date +%Y%m%d_%H%M%S).json"
    log "Memoria del bot ripristinata dal backup"
  fi
}

installa_pacchetto() {
  local dest="$SRV/behavior_packs/ClaudeCompagno" v modulo
  mkdir -p "$dest"
  rsync -a --delete "$BASE/pack/ClaudeCompagno/" "$dest/"
  # La versione beta di @minecraft/server cambia a ogni aggiornamento del gioco: la cerco su npm.
  v=$(sed -E 's/.*bedrock-server-([0-9]+)\.([0-9]+)\.([0-9]+).*/\1.\2.\3/' "$SRV/.versione")
  case "$v" in 1.*) ;; *) v="1.$v" ;; esac
  modulo=$(curl -fsS --max-time 60 https://registry.npmjs.org/@minecraft/server 2>/dev/null | jq -r '.versions | keys[]' 2>/dev/null \
    | grep -E "^[0-9]+\.[0-9]+\.[0-9]+-beta\.${v//./\\.}-stable$" | sort -V | tail -1)
  if [ -n "$modulo" ]; then
    jq --arg m "${modulo%%-beta*}-beta" '(.dependencies[] | select(.module_name=="@minecraft/server") | .version) = $m' \
      "$dest/manifest.json" > "$dest/manifest.tmp" && mv "$dest/manifest.tmp" "$dest/manifest.json"
    log "Modulo script per il gioco $v: @minecraft/server ${modulo%%-beta*}-beta"
  else
    log "Versione del modulo per il gioco $v non trovata: uso quella del pacchetto"
  fi
}

avvia_bds() { # $1 = "genera": si ferma appena il mondo è pronto
  cd "$SRV" || return 1
  rm -f "$FIFO"; mkfifo "$FIFO"
  exec 3<>"$FIFO"
  export LD_LIBRARY_PATH=".:/usr/lib/aarch64-linux-gnu:/lib/aarch64-linux-gnu"
  export BOX64_LOG=0 BOX64_MMAP32=1 BOX64_NOSIGSEGV=1 BOX64_DYNAREC_WAIT=1 BOX64_DYNAREC_STRONGMEM=1
  export BOX64_PAGESIZE="$(getconf PAGESIZE 2>/dev/null || echo 4096)"
  if [ "${1:-}" = genera ]; then
    local segno; segno=$(wc -l < "$LOG")
    box64 ./bedrock_server <&3 2>&1 | grep -av 'Box64 with Dynarec' >> "$LOG" &
    local pid=$!
    for _ in $(seq 1 300); do tail -n +"$segno" "$LOG" | grep -q "Server started" && break; sleep 1; done
    echo stop >&3
    wait "$pid"
  else
    # nel log va tutto (il pannello lo legge da lì); nel terminale niente righe tecniche del pannello
    box64 ./bedrock_server <&3 2>&1 | grep --line-buffered -av 'Box64 with Dynarec' | tee -a "$LOG" \
      | grep --line-buffered -avE '\[Claude\]\[(STATO|MEMORIA|BACKUP|API)\]'
    CODICE=${PIPESTATUS[0]}
  fi
  exec 3>&-
  cd "$BASE" || true
}

prepara_mondo() {
  LEVEL=$(prop level-name)
  local mondo="$SRV/worlds/$LEVEL" wbp
  if [ ! -f "$mondo/level.dat" ]; then
    log "Creo il mondo \"$LEVEL\"..."
    avvia_bds genera
    [ -f "$mondo/level.dat" ] || { log "ERRORE: il mondo non è stato creato"; return 1; }
  fi
  wbp="$mondo/world_behavior_packs.json"
  [ -s "$wbp" ] || echo '[]' > "$wbp"
  jq --arg id "$PACK_UUID" 'if any(.[]; .pack_id == $id) then . else . + [{pack_id: $id, version: [1,0,0]}] end' "$wbp" > "$wbp.tmp" && mv "$wbp.tmp" "$wbp"
  python3 -I "$BASE/patch_level.py" "$mondo/level.dat" 2>&1 | tee -a "$LOG"
  return "${PIPESTATUS[0]}"
}

esporta() { # $1 file di destinazione, $2 esito
  {
    echo "RAPPORTO SERVER MINECRAFT + CLAUDE COMPAGNO"
    echo "Inizio sessione: $INIZIO"
    echo "Scritto: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "Esito: $2"
    echo "Versione server: $(cat "$SRV/.versione" 2>/dev/null || echo sconosciuta)"
    echo "Mondo: ${LEVEL:-?} | RAM disponibile: $(free -m 2>/dev/null | awk '/Mem:/{print $7" MB"}') | spazio libero: $(df -h "$BASE" | awk 'NR==2{print $4}')"
    echo "Indirizzi del server in casa: $(hostname -I 2>/dev/null) porta 19132"
    echo "Pannello dal telefono (stessa Wi-Fi): http://$(hostname -I 2>/dev/null | awk '{print $1}'):8080"
    echo "Notifiche: app ntfy, iscriviti all'argomento $(cat "$IMP/ntfy_topic" 2>/dev/null || echo '(non ancora creato)')"
    echo "Tunnel playit: $(pgrep -x playit >/dev/null && echo attivo || echo 'non attivo (configuralo una volta con mc-tunnel)')"
    echo
    echo "===== ULTIMO RAPPORTO DI CLAUDE ====="
    awk '/\[Claude\]\[R\] =====RAPPORTO_INIZIO=====/{buf=""; on=1}
         on{line=$0; sub(/.*\[Claude\]\[R\] /, "", line); buf=buf line "\n"}
         /\[Claude\]\[R\] =====RAPPORTO_FINE=====/{on=0; ultimo=buf}
         END{printf "%s", (ultimo != "" ? ultimo : "(nessun rapporto di Claude: il pacchetto potrebbe non essersi caricato, vedi errori)\n")}' "$LOG"
    echo
    echo "===== BATTITO (ultimo segno di vita del bot) ====="
    grep -a '\[Claude\]\[BATTITO\]' "$LOG" | tail -n 1 | sed 's/.*\[Claude\]\[BATTITO\] //'
    echo
    echo "===== OPERAZIONI DI CLAUDE IN QUESTA SESSIONE ====="
    grep -a '\[Claude\]\[OPERAZIONE\]' "$LOG" | sed 's/.*\[Claude\]\[OPERAZIONE\] //' | tail -n 400
    echo
    echo "===== ERRORI E AVVISI ====="
    grep -a -iE 'error|errore|exception|warn|fail|crash' "$LOG" | grep -avE '\[Claude\]\[(R|OPERAZIONE|STATO|MEMORIA|BACKUP|API|CHAT|NOTIFICA)\]' | tail -n 200
    echo
    echo "===== ULTIME 150 RIGHE DEL SERVER ====="
    grep -avE '\[Claude\]\[(R|STATO|MEMORIA|BACKUP|API|NOTIFICA)\]' "$LOG" | tail -n 150
  } > "$1.tmp" 2>&1 && mv "$1.tmp" "$1"
  salva_backup
}

# Backup della memoria del bot: ricompone l'ultimo backup completo scritto a pezzi nel log.
salva_backup() {
  awk '/\[Claude\]\[BACKUP\] /{
         line=$0; sub(/.*\[Claude\]\[BACKUP\] /, "", line)
         split(line, a, " "); id=a[1]; split(a[2], q, "/"); i=q[1]; n=q[2]
         pezzo=substr(line, length(a[1]) + length(a[2]) + 3)
         sub(/\r$/, "", pezzo)
         parti[id, i]=pezzo; tot[id]=n; conta[id]++
         if (conta[id] == n) { s=""; for (k=1; k<=n; k++) s=s parti[id, k]; ultimo=s }
       }
       END{ if (ultimo != "") print ultimo }' "$LOG" > "$REP/ClaudeMinecraft_memoria.json.tmp" 2>/dev/null
  if jq -e .lezioni "$REP/ClaudeMinecraft_memoria.json.tmp" >/dev/null 2>&1; then
    mv "$REP/ClaudeMinecraft_memoria.json.tmp" "$REP/ClaudeMinecraft_memoria.json"
  else
    rm -f "$REP/ClaudeMinecraft_memoria.json.tmp"
  fi
  salva_manuale
}

# Manuale di esperienza su Drive: la parte scritta a ogni versione (MANUALE_ESPERIENZA.md, da GitHub)
# più le lezioni universali che il bot ricava ogni giorno con la riflessione di Opus.
salva_manuale() {
  [ -f "$BASE/MANUALE_ESPERIENZA.md" ] || return 0
  {
    cat "$BASE/MANUALE_ESPERIENZA.md"
    echo
    echo "## Lezioni universali ricavate dal gioco (riflessione giornaliera, ultime in fondo)"
    echo
    jq -r '(.universali // [])[] | "- \(.t)  _(\(.g))_"' "$REP/ClaudeMinecraft_memoria.json" 2>/dev/null || echo "- (ancora nessuna)"
    echo
    echo "---"
    echo
    echo "# Tutta l'esperienza del bot (dati grezzi dal gioco, aggiornati a ogni rapporto)"
    echo
    echo "Chi usa il manuale sceglie cosa adottare: qui c'è tutto, anche ciò che vale solo in Minecraft."
    echo
    jq -r '
      def pct(o): if ((o.ok // 0) + (o.ko // 0)) > 0 then "\((100 * (o.ok // 0) / ((o.ok // 0) + (o.ko // 0)) | floor))% su \((o.ok // 0) + (o.ko // 0))" else "mai provato" end;
      "## Lezioni attuali del bot\n", ((.lezioni // [])[] | "- \(.)"),
      "\n## Lezioni automatiche scritte dal codice\n", ((.lezioniAuto // [])[] | "- \(.)"),
      "\n## Archivio delle lezioni superate o fuse (più vecchie in alto)\n", ((.lezioniArchivio // [])[] | "- \(.t)  _(\(.g))_"),
      "\n## Esperienza per tipo di compito (tasso di successo)\n", ((.esperienza // {}) | to_entries | sort_by(-((.value.ok // 0) + (.value.ko // 0)))[] | "- \(.key): \(pct(.value))\(if .value.ultimoErrore then " — ultimo errore: \(.value.ultimoErrore)" else "" end)"),
      "\n## Routine (successi/fallimenti)\n", ((.statRoutine // {}) | to_entries[] | "- \(.key): \(.value.ok // 0) ok / \(.value.ko // 0) ko"),
      "\n## Priorità attuali del pilota automatico\n", "- \((.prioritaGratis // []) | join(" > "))",
      "\n## Diario delle riflessioni giornaliere\n", ((.diario // [])[] | "- \(.g): \(.nota)"), (if .riflessione.nota then "- ultima: \(.riflessione.nota)" else empty end),
      "\n## Voti dei giocatori\n", "- \(.voti // "nessuno" | tostring)",
      "\n## Andamento del livello di maturazione (0-100)\n", ((.maturita // [])[] | "- \(.g): \(.v)"),
      "\n## Zone pericolose imparate\n", ((.pericoli // [])[] | "- \(.x),\(.y),\(.z) raggio \(.r): \(.motivo)")
    ' "$REP/ClaudeMinecraft_memoria.json" 2>/dev/null
  } > "$REP/ClaudeCompagno_esperienza.md.tmp" && mv "$REP/ClaudeCompagno_esperienza.md.tmp" "$REP/ClaudeCompagno_esperienza.md"
}

# ---------- flusso principale ----------
ls -1t "$LOGDIR"/server_*.log 2>/dev/null | tail -n +21 | xargs -r rm -f
log "=== Claude Compagno: avvio $(date '+%Y-%m-%d %H:%M:%S') ==="
if [ "${1:-}" != "--prepara" ] && aggiorna_bot; then exec bash "$BASE/avvia.sh" "$@"; fi
if ! aggiorna_server; then
  esporta "$REP/ClaudeMinecraft_$(date +%Y%m%d_%H%M%S).txt" "ERRORE: server Bedrock non disponibile"
  exit 1
fi
configura
installa_pacchetto
if ! prepara_mondo; then
  esporta "$REP/ClaudeMinecraft_$(date +%Y%m%d_%H%M%S).txt" "ERRORE: preparazione del mondo fallita"
  exit 1
fi
if [ "${1:-}" = "--prepara" ]; then log "Preparazione completata"; exit 0; fi

rm -f "$BASE/.stop_richiesto"
trap 'touch "$BASE/.stop_richiesto"; echo stop > "$FIFO"' INT TERM
( while sleep 60; do esporta "$REP/ClaudeMinecraft_in_corso.txt" "server in esecuzione"; done ) &
ESPORTATORE=$!
# Richieste di amministratore fatte dal proprietario in chat: il bot le scrive nel log, la console le esegue.
( tail -n0 -F "$LOG" 2>/dev/null | grep --line-buffered -a '\[Claude\]\[OP\] ' | while read -r riga; do
    nome=$(echo "$riga" | sed 's/.*\[Claude\]\[OP\] //' | tr -d '\r')
    [[ "$nome" =~ ^[A-Za-z0-9\ _-]{1,32}$ ]] && echo "op \"$nome\"" > "$FIFO" && echo "[$(date +%H:%M:%S)] $nome nominato amministratore" >> "$LOG"
  done ) &
OPERATORE=$!
# Battito: il bot scrive [Claude][BATTITO] ogni 2 minuti. Se tace per 10 minuti a server acceso, lo script si è
# bloccato: "reload" lo ricarica senza fermare il server (al massimo una volta ogni 15 minuti).
rm -f "$BASE/.battito"
( tail -n0 -F "$LOG" 2>/dev/null | grep --line-buffered -a '\[Claude\]\[BATTITO\]' | while read -r _; do touch "$BASE/.battito"; done ) &
BATTITO=$!
( while sleep 60; do
    [ -f "$BASE/.battito" ] || continue
    if [ $(( $(date +%s) - $(stat -c %Y "$BASE/.battito") )) -gt 600 ]; then
      echo "reload" > "$FIFO"; touch "$BASE/.battito"
      echo "[$(date +%H:%M:%S)] Il bot non dava segni di vita da 10 minuti: script ricaricato (reload)" >> "$LOG"
      sleep 840
    fi
  done ) &
GUARDIANO=$!

# Pannello web: dal telefono http://<indirizzo-odin>:8080 mostra in diretta tutto quello che fa il bot (solo lettura).
python3 -I "$BASE/pannello.py" --log "$LOG" --rep "$REP" --porta 8080 >> "$LOGDIR/pannello.log" 2>&1 &
PANNELLO=$!

# Notifiche push gratuite con ntfy.sh: argomento casuale (chi non lo conosce non le legge), creato una volta sola.
[ -s "$IMP/ntfy_topic" ] || echo "claude-mc-$(head -c 8 /dev/urandom | od -An -tx1 | tr -d ' \n')" > "$IMP/ntfy_topic"
TOPIC=$(cat "$IMP/ntfy_topic")
notifica() { curl -s -m 10 -H "Title: Claude Compagno" -d "$1" "https://ntfy.sh/$TOPIC" >/dev/null 2>&1 || true; }
( ultimo=""; quando=0
  tail -n0 -F "$LOG" 2>/dev/null | grep --line-buffered -aE '\[Claude\]\[NOTIFICA\]|script ricaricato|CRASH' | while read -r riga; do
    msg=$(echo "$riga" | sed 's/.*\[Claude\]\[NOTIFICA\] //; s/^\[[0-9:]*\] //' | tr -d '\r' | cut -c1-200)
    ora=$(date +%s)
    # stessa notifica entro 60 secondi: una sola
    if [ "$msg" != "$ultimo" ] || [ $((ora - quando)) -gt 60 ]; then notifica "$msg"; ultimo=$msg; quando=$ora; fi
  done ) &
NOTIFICHE=$!

# Ogni 30 minuti controlla se su GitHub c'è una versione nuova; la installa (riavvio di circa 1 minuto)
# solo quando non c'è nessun giocatore online, così non butta fuori chi sta giocando
( while sleep 1800; do
    nuova_disponibile || continue
    while [ "$(giocatori_online)" -gt 0 ]; do sleep 300; done
    if aggiorna_bot; then
      notifica "⬆️ Bot aggiornato alla versione $(cat "$BASE/.versione"): riavvio di un minuto"
      touch "$BASE/.riavvia" "$BASE/.stop_richiesto"; echo stop > "$FIFO"; break
    fi
  done ) &
AGGIORNATORE=$!

# Tunnel per gli amici fuori casa: parte da solo se è già stato collegato una volta con mc-tunnel.
PLAYIT=""
if command -v playit >/dev/null && { [ -f /root/.config/playit_gg/playit.toml ] || [ -f /etc/playit/playit.toml ]; }; then
  playit > "$LOGDIR/playit.log" 2>&1 &
  PLAYIT=$!
  log "Tunnel playit avviato"
else
  log "Tunnel playit non configurato: per gli amici fuori casa lancia una volta mc-tunnel"
fi
notifica "▶️ Server avviato. Pannello: http://$(hostname -I 2>/dev/null | awk '{print $1}'):8080"

log "Avvio del server. Dal telefono: Server > Aggiungi server, indirizzo $(hostname -I 2>/dev/null | awk '{print $1}') porta 19132"
crash=0
while true; do
  avvia_bds
  if [ -f "$BASE/.stop_richiesto" ] || [ "$CODICE" = 0 ]; then ESITO="chiusura normale"; break; fi
  crash=$((crash + 1))
  ESITO="CRASH del server (codice $CODICE), tentativo $crash di 5"
  log "$ESITO"
  esporta "$REP/ClaudeMinecraft_crash_$(date +%Y%m%d_%H%M%S).txt" "$ESITO"
  [ "$crash" -ge 5 ] && { ESITO="CRASH ripetuti: server fermato dopo 5 tentativi (codice $CODICE)"; break; }
  log "Riavvio tra 10 secondi..."
  sleep 10
done
kill "$ESPORTATORE" "$OPERATORE" "$BATTITO" "$GUARDIANO" "$PANNELLO" "$NOTIFICHE" "$AGGIORNATORE" $PLAYIT 2>/dev/null
notifica "⏹️ Server fermato: $ESITO"
pkill -f "tail -n0 -F $LOG" 2>/dev/null
rm -f "$BASE/.stop_richiesto" "$REP/ClaudeMinecraft_in_corso.txt"
log "=== Fine sessione: $ESITO ==="
esporta "$REP/ClaudeMinecraft_$(date +%Y%m%d_%H%M%S).txt" "$ESITO"
# versione nuova installata mentre girava: riparte con quella
if [ -f "$BASE/.riavvia" ]; then rm -f "$BASE/.riavvia"; exec bash "$BASE/avvia.sh"; fi
