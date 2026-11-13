# Script di Claude per la Odin (eseguito come root dal modulo, comando firmato esegui:<impronta>).
# 13/11/2026: controllo del ponte veloce dopo l'installazione della v4.29.
CFG=/data/adb/odin2tweaks; RUN=/dev/odin2tweaks
echo "modulo: $(grep '^version=' /data/adb/modules/odin2tweaks/module.prop)"
echo "acceso da: $(awk '{printf "%.0f min", $1/60}' /proc/uptime)"
p=$(cat $RUN/ponte.pid 2>/dev/null); echo "processo del ponte: ${p:-nessuno} $( [ -n "$p" ] && [ -d /proc/$p ] && echo vivo)"
echo "ultima risposta del worker: $(cat $RUN/ponte_ultimo 2>/dev/null)"
ls $RUN/ponte_fermo $CFG/ponte_no 2>/dev/null
echo "--- registro"; grep -i "ponte\|wi-fi" $CFG/log.txt | tail -n 8
echo "--- prova diretta (gettone)"
k=$(cat $CFG/remoto.key); T=$(printf 'ponte|%s' "$k" | sha256sum | cut -c1-64)
curl -sS -m 10 -o /dev/null -w "worker: %{http_code}\n" https://odin-ponte.vincenzociriello91.workers.dev/ 2>&1
echo "--- doppio Wi-Fi"; ip -br addr | grep wlan
