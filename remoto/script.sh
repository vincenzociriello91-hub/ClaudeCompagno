# Script di Claude per la Odin (eseguito come root dal modulo v4.28, comando firmato esegui:<impronta>).
# 13/11/2026 09:40: la password viene accettata ma la connessione si chiude subito ("Connection closed").
# sshd era stato acceso da root con "su": si riaccende dentro l'app Termux (RunCommandService), come Termux:Boot,
# con un registro dettagliato in ~/sshd.log da leggere qui sotto dopo il prossimo tentativo.
T=/data/data/com.termux; U=$(stat -c %u $T 2>/dev/null); P=$T/files/usr; H=$T/files/home
PR=$H/.termux/termux.properties
echo "--- termux.properties prima"; grep -n "allow-external-apps" $PR 2>&1
if ! grep -qs "^allow-external-apps *= *true" $PR; then
  mkdir -p $H/.termux; echo "allow-external-apps = true" >> $PR; chown $U:$U $H/.termux $PR; echo "aggiunto allow-external-apps = true"
fi
echo "--- registro precedente"; tail -n 30 $H/sshd.log 2>/dev/null
pkill -x sshd; sleep 1
rm -f $H/sshd.log
am startservice --user 0 -n com.termux/com.termux.app.RunCommandService -a com.termux.RUN_COMMAND \
  --es com.termux.RUN_COMMAND_PATH $P/bin/sshd \
  --esa com.termux.RUN_COMMAND_ARGUMENTS "-E,$H/sshd.log,-o,LogLevel=DEBUG1" \
  --ez com.termux.RUN_COMMAND_BACKGROUND true 2>&1
sleep 5
echo "processi sshd: $(pgrep -l -x sshd | tr '\n' ' ')"
for p in $(pgrep -x sshd); do echo "  $p contesto $(cat /proc/$p/attr/current 2>/dev/null) uid $(awk '/^Uid/{print $2}' /proc/$p/status)"; done
echo "porta 8022: $(echo | timeout 5 nc -w 3 127.0.0.1 8022 2>&1 | head -c 30)"
if ! pgrep -x sshd >/dev/null; then
  echo "RunCommandService non ha acceso sshd: lo riaccendo con su e registro"
  su -G 3003 -G 3004 $U -c "export HOME=$H PREFIX=$P PATH=$P/bin:/system/bin TMPDIR=$P/tmp LD_PRELOAD=$P/lib/libtermux-exec.so; sshd -E $H/sshd.log -o LogLevel=DEBUG1" </dev/null 2>&1; sleep 2
  echo "processi sshd: $(pgrep -l -x sshd | tr '\n' ' ')"
fi
echo "--- shell di login dell'utente"; ls -la $H/.termux/shell 2>&1; ls -la $P/bin/login $P/bin/bash 2>&1
echo "--- registro adesso"; cat $H/sshd.log 2>/dev/null | tail -n 15
