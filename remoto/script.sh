# Script di Claude per la Odin (eseguito come root dal modulo v4.28, comando firmato esegui:<impronta>).
# 13/11/2026 10:35: da SSH "tee: /sdcard/...: Permission denied". sshd era stato acceso con i soli gruppi
# 3003/3004: manca quello della memoria condivisa. Si riaccende con gli stessi gruppi del processo dell'app Termux.
# Si ferma solo il processo che ascolta (dal file pid): le sessioni già aperte restano.
T=/data/data/com.termux; U=$(stat -c %u $T 2>/dev/null); P=$T/files/usr; H=$T/files/home
TP=$(pidof com.termux | cut -d' ' -f1)
G=$(awk '/^Groups:/{for(i=2;i<=NF;i++) printf "-G %s ", $i}' /proc/$TP/status 2>/dev/null)
echo "app Termux $TP, gruppi: $G"
[ -n "$G" ] || G="-G 3003 -G 3004 -G 9997"
L=$(cat $P/var/run/sshd.pid 2>/dev/null); echo "sshd in ascolto: ${L:-?}"
[ -n "$L" ] && kill $L; sleep 1
su -g $U $G $U -c "export HOME=$H PREFIX=$P PATH=$P/bin:/system/bin TMPDIR=$P/tmp LD_PRELOAD=$P/lib/libtermux-exec.so; sshd -E $H/sshd.log" </dev/null 2>&1; sleep 2
L=$(cat $P/var/run/sshd.pid 2>/dev/null)
echo "sshd nuovo: $L gruppi $(awk '/^Groups:/' /proc/$L/status 2>/dev/null)"
echo "porta 8022: $(echo | timeout 5 nc -w 3 127.0.0.1 8022 2>&1 | head -c 25)"
echo "sessioni ancora aperte: $(pgrep -x sshd | tr '\n' ' ')"
su -g $U $G $U -c "echo prova > /sdcard/Download/Odin2_report/.prova_ssh && echo scrittura in sdcard: OK && rm /sdcard/Download/Odin2_report/.prova_ssh" </dev/null 2>&1
