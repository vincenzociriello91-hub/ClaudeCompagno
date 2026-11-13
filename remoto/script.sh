# Script di Claude per la Odin (eseguito come root dal modulo v4.28, comando firmato esegui:<impronta>).
# 13/11/2026 10:20: "chown(/dev/pts/0, 10159, 10159) failed" all'accesso. Con "su UTENTE" il gruppo resta 0 (root):
# il terminale nasce col gruppo sbagliato e sshd prova a cambiarlo. Si riaccende con "-g UTENTE" e si prova da qui
# un accesso con terminale (chiave temporanea, cancellata alla fine).
T=/data/data/com.termux; U=$(stat -c %u $T 2>/dev/null); P=$T/files/usr; H=$T/files/home
ENV="export HOME=$H PREFIX=$P PATH=$P/bin:/system/bin TMPDIR=$P/tmp LD_PRELOAD=$P/lib/libtermux-exec.so"
SU="su -g $U -G 3003 -G 3004 $U"
echo "identità con -g: $($SU -c id </dev/null 2>&1)"
pkill -x sshd; sleep 1; rm -f $H/sshd.log
$SU -c "$ENV; sshd -E $H/sshd.log" </dev/null 2>&1; sleep 2
echo "porta 8022: $(echo | timeout 5 nc -w 3 127.0.0.1 8022 2>&1 | head -c 25)"
echo "--- prova di accesso con terminale"
K=$H/.ssh/claude_prova
$SU -c "$ENV; mkdir -p $H/.ssh; chmod 700 $H/.ssh; rm -f $K $K.pub; ssh-keygen -q -t ed25519 -N '' -f $K; cat $K.pub >> $H/.ssh/authorized_keys; chmod 600 $H/.ssh/authorized_keys" </dev/null 2>&1
r=$($SU -c "$ENV; timeout 20 ssh -tt -i $K -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o BatchMode=yes -p 8022 127.0.0.1 'tty; echo TERMINALE_OK'" </dev/null 2>&1)
echo "$r" | tail -n 4
# chiave temporanea tolta
$SU -c "$ENV; grep -v claude_prova $H/.ssh/authorized_keys > $H/.ssh/ak.tmp; grep -vF \"\$(cat $K.pub)\" $H/.ssh/ak.tmp > $H/.ssh/authorized_keys; rm -f $H/.ssh/ak.tmp $K $K.pub" </dev/null 2>&1
echo "chiavi rimaste in authorized_keys: $(grep -c . $H/.ssh/authorized_keys 2>/dev/null)"
case $r in *TERMINALE_OK*) echo "ESITO: accesso con terminale FUNZIONA";; *) echo "ESITO: ancora no"; tail -n 12 $H/sshd.log;; esac
