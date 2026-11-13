# Script di Claude per la Odin (eseguito come root dal modulo v4.27, comando firmato esegui:<impronta>).
# 13/11/2026: terminale a distanza. SSH di Termux sulla porta 8022, raggiungibile da fuori casa con Tailscale.
# La password nuova finisce solo in Odin2_report/ssh_accesso.txt (Drive privato), mai qui.
T=/data/data/com.termux
U=$(stat -c %u $T 2>/dev/null)
P=$T/files/usr; H=$T/files/home
echo "utente Termux: ${U:-non trovato}"
[ -n "$U" ] || exit 1
tx() { su $U -c "export HOME=$H PREFIX=$P PATH=$P/bin:/system/bin TMPDIR=$P/tmp LD_PRELOAD=$P/lib/libtermux-exec.so LANG=en_US.UTF-8; $1" </dev/null 2>&1; }
echo "--- openssh"
if [ -x $P/bin/sshd ]; then echo "già installato"; else tx "yes | pkg install -y openssh" | tail -n 5; fi
[ -x $P/bin/sshd ] || { echo "sshd non installato: mi fermo"; exit 1; }
echo "--- password"
PW=$(head -c 12 /dev/urandom | od -An -tx1 | tr -d ' \n' | cut -c1-16)
tx "printf '%s\n%s\n' '$PW' '$PW' | passwd" | tail -n 2
echo "--- avvio di sshd"
tx "pkill -x sshd; sshd" ; sleep 2
pgrep -f "$P/bin/sshd" >/dev/null 2>&1 && echo "sshd acceso" || echo "sshd NON acceso"
echo "--- avvio automatico (Termux:Boot)"
B=$H/.termux/boot
if [ -d $B ]; then
  if grep -qs "sshd" $B/*; then echo "già presente"; else
    printf '#!/data/data/com.termux/files/usr/bin/sh\ntermux-wake-lock 2>/dev/null\nsshd\n' > $B/00-ssh; chown $U:$U $B/00-ssh; chmod 700 $B/00-ssh; echo "aggiunto $B/00-ssh"; fi
else echo "cartella Termux:Boot assente"; fi
echo "--- indirizzi"
ip -br addr | grep -E "wlan0|tailscale|tun"
TS=$(ip -4 -br addr 2>/dev/null | awk '{for(i=3;i<=NF;i++) if ($i ~ /^100\./) {split($i,a,"/"); print a[1]; exit}}')
pm path com.tailscale.ipn >/dev/null 2>&1 && echo "Tailscale installato" || echo "Tailscale NON installato"
W=$(ip -4 -br addr show wlan0 2>/dev/null | awk '{split($3,a,"/"); print a[1]}')
WHO=$(tx "whoami" | tail -n 1)
R=/sdcard/Download/Odin2_report
{ echo "Terminale della Odin a distanza ($(date '+%d/%m/%Y %H:%M'))"
  echo "utente: $WHO"
  echo "password: $PW"
  echo "da fuori casa (Tailscale): ssh -p 8022 $WHO@${TS:-INDIRIZZO_TAILSCALE_NON_TROVATO}"
  echo "da casa: ssh -p 8022 $WHO@$W"
  echo "dentro, per i comandi da root: su"
} > /data/adb/odin2tweaks/ssh.tmp && mv -f /data/adb/odin2tweaks/ssh.tmp $R/ssh_accesso.txt
echo "accesso scritto in Odin2_report/ssh_accesso.txt (Tailscale: ${TS:-nessun indirizzo 100.x})"
