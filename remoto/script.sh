# Script di Claude per la Odin (eseguito come root dal modulo v4.28, comando firmato esegui:<impronta>).
# 13/11/2026 10:05: registro di sshd delle 09:58: password accettata, poi
#   "chown(/dev/pts/0, 10159, 10159) failed: Operation not permitted"
# sshd acceso da root con su resta nel contesto SELinux "magisk" e non può preparare il terminale.
# Si riaccende dentro l'app Termux (RunCommandService), nel suo contesto, come fa Termux:Boot all'avvio.
# "am" va lanciato con l'uscita in una pipe: verso un file fallisce (Failed transaction).
T=/data/data/com.termux; U=$(stat -c %u $T 2>/dev/null); P=$T/files/usr; H=$T/files/home
grep -n "allow-external-apps" $H/.termux/termux.properties
pkill -x sshd; sleep 1; rm -f $H/sshd.log
am startservice --user 0 -n com.termux/com.termux.app.RunCommandService -a com.termux.RUN_COMMAND \
  --es com.termux.RUN_COMMAND_PATH $P/bin/sshd \
  --esa com.termux.RUN_COMMAND_ARGUMENTS "-E,$H/sshd.log" \
  --ez com.termux.RUN_COMMAND_BACKGROUND true </dev/null 2>&1 | cat
sleep 6
ok=0
for p in $(pgrep -x sshd); do c=$(cat /proc/$p/attr/current 2>/dev/null); echo "sshd $p contesto $c"; case $c in *untrusted_app*) ok=1;; esac; done
if [ $ok = 0 ]; then
  echo "sshd non partito dentro Termux: rimetto quello di prima (accesso solo con ssh -T, senza terminale)"
  pkill -x sshd; su -G 3003 -G 3004 $U -c "export HOME=$H PREFIX=$P PATH=$P/bin:/system/bin TMPDIR=$P/tmp LD_PRELOAD=$P/lib/libtermux-exec.so; sshd -E $H/sshd.log" </dev/null 2>&1; sleep 2
fi
echo "porta 8022: $(echo | timeout 5 nc -w 3 127.0.0.1 8022 2>&1 | head -c 25)"
echo "--- registro"; tail -n 8 $H/sshd.log 2>/dev/null
echo "--- avvio automatico (Termux:Boot, già nel contesto giusto)"; cat $H/.termux/boot/00-ssh
