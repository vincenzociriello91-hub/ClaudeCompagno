# Script di Claude per la Odin (eseguito come root dal modulo v4.28, comando firmato esegui:<impronta>).
# 13/11/2026 09:20: controllo di sshd (Termux, porta 8022). Il controllo di prima cercava il percorso completo,
# ma il processo si chiama solo "sshd": se la porta non risponde lo riaccende con i gruppi di rete (-G 3003 -G 3004).
T=/data/data/com.termux; U=$(stat -c %u $T 2>/dev/null); P=$T/files/usr; H=$T/files/home
ENV="export HOME=$H PREFIX=$P PATH=$P/bin:/system/bin TMPDIR=$P/tmp LD_PRELOAD=$P/lib/libtermux-exec.so LANG=en_US.UTF-8"
porta() { echo | timeout 5 nc -w 3 127.0.0.1 8022 2>&1 | head -c 40; }
echo "processi sshd: $(pgrep -l sshd | tr '\n' ' ')"
b=$(porta); echo "porta 8022 prima: ${b:-nessuna risposta}"
case $b in SSH-*) ;; *)
  su -G 3003 -G 3004 $U -c "$ENV; pkill -x sshd; sshd -E $H/sshd.log" </dev/null 2>&1; sleep 3
  echo "processi sshd: $(pgrep -l sshd | tr '\n' ' ')"
  b=$(porta); echo "porta 8022 dopo: ${b:-nessuna risposta}"
  tail -n 10 $H/sshd.log 2>/dev/null;;
esac
echo "--- in ascolto"; grep -i ":1F56 " /proc/net/tcp /proc/net/tcp6 2>/dev/null | head -n 4
echo "--- avvio automatico"; cat $H/.termux/boot/00-ssh 2>/dev/null
echo "--- doppio Wi-Fi"; ip -br addr | grep wlan
