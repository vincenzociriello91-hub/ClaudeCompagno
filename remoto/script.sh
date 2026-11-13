# Script di Claude per la Odin (eseguito come root dal modulo v4.28, comando firmato esegui:<impronta>).
# 13/11/2026 10:00: legge il registro di sshd dopo i tentativi delle 09:58 (password accettata,
# connessione chiusa subito). Non cambia niente.
H=/data/data/com.termux/files/home
echo "processi sshd: $(pgrep -l -x sshd | tr '\n' ' ')"
echo "--- registro sshd"; grep -v "rexec_argv\|host key" $H/sshd.log 2>/dev/null | tail -n 60
echo "--- /etc/ssh/sshd_config"; grep -v "^#\|^$" /data/data/com.termux/files/usr/etc/ssh/sshd_config 2>/dev/null
