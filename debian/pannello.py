#!/usr/bin/env python3
"""Pannello web di Claude Compagno: mostra in diretta tutto quello che fa il bot.

Legge il log del server (righe [Claude][...] scritte dal bot) e i rapporti in Odin2_report.
Comandi a distanza solo con il PIN (scelto la prima volta dal telefono, salvato sulla Odin in impostazioni/pannello_pin,
mai nel repository). Lo avvia avvia.sh:
    python3 pannello.py --log /root/claudemc/log/server_X.log --rep /sdcard/Download/Odin2_report --porta 8080
Prova senza server:  python3 pannello.py --test
"""
import argparse
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

QUI = os.path.dirname(os.path.abspath(__file__))
RIGA = re.compile(r"^\[(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d):\d+ \w+\] \[Scripting\] \[Claude\]\[([A-Z]+)\] (.*)$")
BLOCCO = re.compile(r"^(\S+) (\d+)/(\d+) (.*)$")
NOME_RAPPORTO = re.compile(r"^ClaudeMinecraft_[\w()\- ]+\.(txt|json)$")
CODA_LOG = 6 * 1024 * 1024  # legge solo gli ultimi 6 MB del log: basta per ore di diretta


def leggi_log(percorso):
    """Ultime righe utili del log, come (data, ora, tag, testo)."""
    try:
        with open(percorso, "rb") as f:
            f.seek(0, os.SEEK_END)
            dim = f.tell()
            f.seek(max(0, dim - CODA_LOG))
            dati = f.read().decode("utf-8", "replace")
    except OSError:
        return []
    righe = []
    for r in dati.splitlines():
        m = RIGA.match(r.strip())
        if m:
            righe.append(m.groups())
    return righe


def ultimo_blocco(righe, tag):
    """Ricompone l'ultimo oggetto completo scritto a pezzi ("id i/n pezzo") con quel tag."""
    parti, ultimo = {}, None
    for _, _, t, testo in righe:
        if t != tag:
            continue
        m = BLOCCO.match(testo)
        if not m:
            continue
        ident, i, n, pezzo = m.group(1), int(m.group(2)), int(m.group(3)), m.group(4)
        parti.setdefault(ident, {})[i] = pezzo
        if len(parti[ident]) == n:
            try:
                ultimo = json.loads("".join(parti[ident][k] for k in range(1, n + 1)))
            except (ValueError, KeyError):
                pass
            del parti[ident]
    return ultimo


def tipo_evento(tag, testo):
    if tag == "OPERAZIONE":
        if testo.startswith("Pensiero:"):
            return "pensiero"
        if testo.startswith(("Lezione", "Lezioni riordinate", "Riflessione", "Voto")):
            return "lezione"
        if testo.startswith(("Sono morto", "Salvataggio", "Ritirata", "Attacco")):
            return "pericolo"
        return "azione"
    return {"API": "api", "CHAT": "chat", "ERRORE": "errore", "NOTIFICA": "notifica"}.get(tag, "altro")


def stato(percorso_log):
    righe = leggi_log(percorso_log)
    eventi = [
        {"t": f"{d} {o}", "tipo": tipo_evento(tag, testo), "testo": testo}
        for d, o, tag, testo in righe
        if tag in ("OPERAZIONE", "API", "CHAT", "ERRORE", "NOTIFICA")
    ]
    battito = next((f"{d} {o} {testo}" for d, o, tag, testo in reversed(righe) if tag == "BATTITO"), "")
    return {
        "stato": ultimo_blocco(righe, "STATO"),
        "memoria": ultimo_blocco(righe, "MEMORIA") or ultimo_blocco(righe, "BACKUP"),
        "eventi": eventi[-600:],
        "battito": battito,
        # ora dell'ultimo STATO (ogni 5 secondi): è questa l'ora di "aggiornato", non il battito (ogni 2 minuti)
        "aggiornato": next((f"{d} {o}" for d, o, tag, _ in reversed(righe) if tag == "STATO"), ""),
        "log": os.path.basename(percorso_log),
    }


def elenco_rapporti(cartella):
    try:
        nomi = [n for n in os.listdir(cartella) if NOME_RAPPORTO.match(n)]
    except OSError:
        return []
    nomi.sort(key=lambda n: os.path.getmtime(os.path.join(cartella, n)), reverse=True)
    return [{"nome": n, "kb": round(os.path.getsize(os.path.join(cartella, n)) / 1024)} for n in nomi]


def _leggi(percorso):
    try:
        with open(percorso) as f:
            return f.read().strip()
    except OSError:
        return None


def _num(percorso):
    try:
        return float(_leggi(percorso))
    except (TypeError, ValueError):
        return None


def stato_odin(rep, sys_dir="/sys", proc_dir="/proc"):
    """Stato della Odin letto da sysfs e /proc (solo lettura). Ogni valore può mancare: Android a volte li nasconde."""
    o = {}
    bat = os.path.join(sys_dir, "class/power_supply/battery")
    o["batteria"] = _num(os.path.join(bat, "capacity"))
    o["carica"] = _leggi(os.path.join(bat, "status"))
    t = _num(os.path.join(bat, "temp"))
    o["temp_batteria"] = round(t / 10, 1) if t is not None else None
    i, v = _num(os.path.join(bat, "current_now")), _num(os.path.join(bat, "voltage_now"))
    # µA × µV → W; il segno dipende dal kernel, conta solo il valore (istantaneo, sovrastima: la lettura sveglia la CPU)
    o["watt"] = round(abs(i * v) / 1e12, 2) if i is not None and v is not None else None
    cpu = []
    tz = os.path.join(sys_dir, "class/thermal")
    try:
        zone = [z for z in os.listdir(tz) if z.startswith("thermal_zone")]
    except OSError:
        zone = []
    for z in zone:
        tipo = _leggi(os.path.join(tz, z, "type")) or ""
        if re.search(r"cpu", tipo, re.I):
            g = _num(os.path.join(tz, z, "temp"))
            if g is not None and 0 < g < 150000:
                cpu.append(g / 1000 if g > 1000 else g)
    o["temp_cpu"] = round(max(cpu), 1) if cpu else None
    mem = {}
    for riga in (_leggi(os.path.join(proc_dir, "meminfo")) or "").splitlines():
        k, _, val = riga.partition(":")
        if val.strip().split()[:1]:
            mem[k] = int(val.split()[0])
    o["ram_libera_mb"] = round(mem["MemAvailable"] / 1024) if "MemAvailable" in mem else None
    o["ram_totale_mb"] = round(mem["MemTotal"] / 1024) if "MemTotal" in mem else None
    try:
        st = os.statvfs(rep)
        o["disco_libero_gb"] = round(st.f_bavail * st.f_frsize / 1e9, 1)
    except OSError:
        o["disco_libero_gb"] = None
    up = _leggi(os.path.join(proc_dir, "uptime"))
    o["acceso_da_ore"] = round(float(up.split()[0]) / 3600, 1) if up else None
    la = _leggi(os.path.join(proc_dir, "loadavg"))
    o["carico"] = la.split()[0] if la else None
    zone_g = {}
    for z in zone:
        tipo = (_leggi(os.path.join(tz, z, "type")) or "").lower()
        g = _num(os.path.join(tz, z, "temp"))
        if not tipo or g is None or not 0 < g < 150000:
            continue
        g = g / 1000 if g > 1000 else g
        gruppo = re.split(r"[-_]", tipo)[0] or tipo
        zone_g[gruppo] = max(zone_g.get(gruppo, 0), round(g, 1))
    o["zone"] = dict(sorted(zone_g.items(), key=lambda kv: -kv[1])[:12])
    o["temp_gpu"] = max((v for k, v in zone_g.items() if k.startswith("gpu")), default=None)
    o["swap_totale_mb"] = round(mem["SwapTotal"] / 1024) if "SwapTotal" in mem else None
    o["swap_usato_mb"] = round((mem["SwapTotal"] - mem.get("SwapFree", 0)) / 1024) if "SwapTotal" in mem else None
    o["core"] = os.cpu_count()
    o["ventola"] = o["ventola_max"] = None
    o["pausa_calore"] = o["limite_carica"] = False
    o["consumo_server"] = _leggi(os.path.join(rep, "consumo_server.txt"))
    # Termux non può leggere batteria e uptime veri (SELinux): li scrive ogni 30 s il modulo Magisk (v4.11+)
    mod = {}
    for riga in (_leggi(os.path.join(os.path.dirname(rep.rstrip("/")), ".odin_stato")) or "").splitlines():
        k, _, v = riga.partition("=")
        mod[k.strip()] = v.strip()
    try:
        fresco = time.time() - float(mod.get("ora", 0)) < 180
    except ValueError:
        fresco = False
    if fresco:
        def f(k):
            try:
                return float(mod[k])
            except (KeyError, ValueError):
                return None
        if o["batteria"] is None:
            o["batteria"] = f("batteria")
        if o["carica"] is None:
            o["carica"] = mod.get("stato") or None
        if o["temp_batteria"] is None and f("temp_batteria") is not None:
            o["temp_batteria"] = round(f("temp_batteria") / 10, 1)
        if o["watt"] is None and f("corrente_ua") is not None and f("tensione_uv") is not None:
            i, v = abs(f("corrente_ua")), f("tensione_uv")
            i = i * 1000 if i < 20000 else i  # alcuni kernel danno mA / mV
            v = v * 1000 if v < 20000 else v
            o["watt"] = round(i * v / 1e12, 2)
        if f("temp_cpu") is not None:
            o["temp_cpu"] = f("temp_cpu")
        for k in ("temp_gpu", "ventola", "ventola_max"):
            if f(k) is not None:
                o[k] = f(k)
        o["pausa_calore"] = mod.get("pausa_calore") == "1"
        o["limite_carica"] = mod.get("carica_limite") == "1"
        if f("uptime") is not None:
            o["acceso_da_ore"] = round(f("uptime") / 3600, 1)
    return o


def salute(o, tps=None):
    """Voto 0-100 della salute della Odin, con frase e motivi (dati che mancano non tolgono punti)."""
    voto, motivi = 100, []
    def togli(p, m):
        nonlocal voto
        voto -= p
        motivi.append(m)
    t = o.get("temp_cpu")
    if t is not None:
        if t >= 90: togli(40, f"CPU molto calda ({t:.0f} °C)")
        elif t >= 80: togli(25, f"CPU calda ({t:.0f} °C)")
        elif t >= 70: togli(10, f"CPU tiepida ({t:.0f} °C)")
        elif t >= 60: togli(3, f"CPU sopra i 60 °C ({t:.0f} °C)")
    b = o.get("temp_batteria")
    if b is not None:
        if b >= 45: togli(30, f"batteria molto calda ({b:.0f} °C)")
        elif b >= 40: togli(15, f"batteria calda ({b:.0f} °C)")
        elif b >= 37: togli(5, f"batteria tiepida ({b:.0f} °C)")
    if o.get("pausa_calore"):
        togli(30, "server in pausa per il calore")
    v, vm = o.get("ventola"), o.get("ventola_max")
    if v is not None and t is not None and v == 0 and t >= 65:
        togli(25, f"ventola ferma con CPU a {t:.0f} °C")
    r = o.get("ram_libera_mb")
    if r is not None:
        if r < 300: togli(30, f"RAM quasi finita ({r} MB liberi)")
        elif r < 600: togli(15, f"poca RAM libera ({r} MB)")
        elif r < 1000: togli(5, f"RAM libera sotto 1 GB ({r} MB)")
    d = o.get("disco_libero_gb")
    if d is not None:
        if d < 2: togli(20, f"spazio quasi finito ({d} GB)")
        elif d < 5: togli(5, f"poco spazio libero ({d} GB)")
    c = o.get("batteria")
    if c is not None and o.get("carica") in ("Discharging", "Not charging") and not o.get("limite_carica"):
        if c < 15: togli(20, f"batteria quasi scarica ({c:.0f}%)")
        elif c < 30: togli(5, f"batteria sotto il 30% ({c:.0f}%)")
    if tps is not None:
        if tps < 10: togli(20, f"server molto lento ({tps:.1f} TPS su 20)")
        elif tps < 15: togli(10, f"server lento ({tps:.1f} TPS su 20)")
        elif tps < 18: togli(3, f"server un po' lento ({tps:.1f} TPS su 20)")
    voto = max(0, voto)
    frase = ("La Odin sta bene" if voto >= 85 else "La Odin sta bene, con qualche attenzione" if voto >= 65
             else "La Odin è sotto sforzo" if voto >= 40 else "La Odin sta male: controllala")
    return {"voto": voto, "frase": frase, "motivi": motivi}


TPS_RIGA = re.compile(r"\[BATTITO\] (\S+ \S+) tps ([\d.]+) media ([\d.]+) min ([\d.]+)")


def ultimo_battito(percorso_log):
    """Ultimo battito del bot dal fondo del log: (ora, tps, media, minimo) o None."""
    try:
        with open(percorso_log, "rb") as f:
            f.seek(0, os.SEEK_END)
            f.seek(max(0, f.tell() - 65536))
            coda = f.read().decode("utf-8", "replace")
    except OSError:
        return None
    m = None
    for m in TPS_RIGA.finditer(coda):
        pass
    return (m.group(1), float(m.group(2)), float(m.group(3)), float(m.group(4))) if m else None


_cache_mondo = {"t": 0, "mb": None}


def peso_mondo(base):
    """MB occupati dai mondi (ricalcolato al massimo ogni 10 minuti: contare i file costa)."""
    if time.time() - _cache_mondo["t"] < 600:
        return _cache_mondo["mb"]
    tot = 0
    for radice, _, files in os.walk(os.path.join(base, "server", "worlds")):
        for n in files:
            try:
                tot += os.path.getsize(os.path.join(radice, n))
            except OSError:
                pass
    _cache_mondo.update(t=time.time(), mb=round(tot / 1048576) if tot else None)
    return _cache_mondo["mb"]


def acceso_da(percorso_log):
    """Ore da quando è partito il server, dal nome del log (server_AAAAMMGG_HHMMSS.log)."""
    m = re.search(r"server_(\d{8}_\d{6})\.log$", percorso_log or "")
    if not m:
        return None
    try:
        return round((time.time() - time.mktime(time.strptime(m.group(1), "%Y%m%d_%H%M%S"))) / 3600, 1)
    except (ValueError, OverflowError):
        return None


STORICO = []  # (ora, temp CPU, tps) ogni minuto, ultime 24 ore; si azzera al riavvio del pannello


def campiona(rep, percorso_log):
    o = stato_odin(rep)
    b = ultimo_battito(percorso_log)
    STORICO.append([int(time.time()), o.get("temp_cpu"), b[1] if b else None])
    del STORICO[:-1440]


COMANDI = ("sync_drive", "avvia_server", "ferma_server", "riavvia_server", "rapporto", "libera_ram", "riavvia_odin")


def manda_comando(rep, azione):
    """Assistente remoto del modulo Magisk: una parola della lista in Download/.odin_comando (il modulo la esegue)."""
    if azione not in COMANDI:
        return False
    with open(os.path.join(os.path.dirname(rep.rstrip("/")), ".odin_comando"), "w") as f:
        f.write(azione)
    return True


# 2.8.103: ordini eseguiti da avvia.sh (bot, aggiornamento, copia del mondo, Tailscale) e riavvio del pannello stesso
ORDINI = ("bot_casa", "bot_tana", "bot_pausa", "bot_riprendi", "bot_vieni", "aggiorna", "backup", "tailscale", "riavvia_pannello")
SBAGLIATI = []  # orari dei PIN sbagliati: dopo 5 in 10 minuti i comandi si bloccano (un PIN di 4 cifre si indovina provando)


def file_pin(base):
    return os.path.join(base, "impostazioni", "pannello_pin")


def imposta_pin(base, pin):
    """Solo la prima volta (nessun PIN salvato): 4-8 cifre, salvato come sale:sha256, mai in chiaro."""
    if _leggi(file_pin(base)) or not re.fullmatch(r"\d{4,8}", pin or ""):
        return False
    sale = secrets.token_hex(8)
    os.makedirs(os.path.dirname(file_pin(base)), exist_ok=True)
    with open(file_pin(base), "w") as f:
        f.write(sale + ":" + hashlib.sha256((sale + pin).encode()).hexdigest())
    os.chmod(file_pin(base), 0o600)
    return True


def controlla_pin(base, pin):
    """True giusto, False sbagliato, None bloccato (5 sbagliati negli ultimi 10 minuti)."""
    ora = time.time()
    SBAGLIATI[:] = [t for t in SBAGLIATI if ora - t < 600]
    if len(SBAGLIATI) >= 5:
        return None
    sale, _, h = (_leggi(file_pin(base)) or "").partition(":")
    if h and hmac.compare_digest(hashlib.sha256((sale + (pin or "")).encode()).hexdigest(), h):
        return True
    SBAGLIATI.append(ora)
    return False


def manda_ordine(base, azione):
    """Una parola in .pannello_ordine: la esegue avvia.sh entro 5 secondi."""
    if azione not in ORDINI:
        return False
    if azione == "riavvia_pannello":
        threading.Timer(1, os._exit, [0]).start()  # avvia.sh lo fa ripartire dopo 30 secondi
        return True
    with open(os.path.join(base, ".pannello_ordine"), "w") as f:
        f.write(azione)
    return True


def odin_completo(rep, percorso_log):
    o = stato_odin(rep)
    o["esito_comando"] = _leggi(os.path.join(os.path.dirname(rep.rstrip("/")), ".odin_esito")) or ""
    b = ultimo_battito(percorso_log)
    if b:
        o["tps"], o["tps_media"], o["tps_min"] = b[1], b[2], b[3]
    o["server_acceso_ore"] = acceso_da(percorso_log)
    base = os.path.dirname(os.path.dirname(percorso_log)) if percorso_log else ""
    o["mondo_mb"] = peso_mondo(base) if base else None
    o["salute"] = salute(o, b[2] if b else None)
    o["storico"] = STORICO[-720:]  # ultime 12 ore
    return o


class Gestore(BaseHTTPRequestHandler):
    log_path = ""
    rep = ""

    def _invia(self, codice, corpo, tipo):
        dati = corpo.encode("utf-8") if isinstance(corpo, str) else corpo
        self.send_response(codice)
        self.send_header("Content-Type", tipo)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(dati)))
        self.end_headers()
        self.wfile.write(dati)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path in ("/", "/index.html"):
            with open(os.path.join(QUI, "pannello.html"), "rb") as f:
                return self._invia(200, f.read(), "text/html; charset=utf-8")
        if u.path == "/api/stato":
            return self._invia(200, json.dumps(stato(self.log_path), ensure_ascii=False), "application/json")
        if u.path == "/api/odin":
            return self._invia(200, json.dumps(odin_completo(self.rep, self.log_path), ensure_ascii=False), "application/json")
        if u.path == "/api/novita":
            # pack/NOVITA.md arriva con ogni aggiornamento del bot (anche col reload, senza riavviare il pannello)
            base = os.path.dirname(os.path.dirname(self.log_path)) if self.log_path else QUI
            for f in (os.path.join(base, "pack", "NOVITA.md"), os.path.join(QUI, "..", "pack", "NOVITA.md")):
                testo = _leggi(f)
                if testo:
                    return self._invia(200, testo, "text/plain; charset=utf-8")
            return self._invia(404, "novità non disponibili", "text/plain; charset=utf-8")
        if u.path == "/api/pin":
            return self._invia(200, json.dumps({"impostato": bool(_leggi(file_pin(self.base())))}), "application/json")
        if u.path == "/api/rapporti":
            return self._invia(200, json.dumps(elenco_rapporti(self.rep), ensure_ascii=False), "application/json")
        if u.path == "/api/rapporto":
            nome = parse_qs(u.query).get("f", [""])[0]
            # solo file dei rapporti, niente percorsi: nessuno può leggere altro dalla Odin
            if not NOME_RAPPORTO.match(nome) or "/" in nome or ".." in nome:
                return self._invia(400, "nome non valido", "text/plain; charset=utf-8")
            try:
                with open(os.path.join(self.rep, nome), "rb") as f:
                    return self._invia(200, f.read(), "text/plain; charset=utf-8")
            except OSError:
                return self._invia(404, "rapporto non trovato", "text/plain; charset=utf-8")
        self._invia(404, "non trovato", "text/plain; charset=utf-8")

    def base(self):
        return os.path.dirname(os.path.dirname(self.log_path)) if self.log_path else QUI

    def do_POST(self):
        u = urlparse(self.path)
        testo = "text/plain; charset=utf-8"
        if u.path == "/api/pin":
            if imposta_pin(self.base(), self.headers.get("X-Pin-Nuovo", "")):
                return self._invia(200, "ok", testo)
            return self._invia(400, "PIN già impostato o non valido (4-8 cifre)", testo)
        if u.path == "/api/comando":
            if not _leggi(file_pin(self.base())):
                return self._invia(428, "prima scegli il PIN", testo)
            esito = controlla_pin(self.base(), self.headers.get("X-Pin", ""))
            if esito is None:
                return self._invia(429, "troppi PIN sbagliati: riprova tra 10 minuti", testo)
            if not esito:
                return self._invia(403, "PIN sbagliato", testo)
            azione = parse_qs(u.query).get("a", [""])[0]
            if manda_comando(self.rep, azione) or manda_ordine(self.base(), azione):
                return self._invia(200, "ok", testo)
            return self._invia(400, "comando non permesso", testo)
        self._invia(404, "non trovato", "text/plain; charset=utf-8")

    def log_message(self, *args):  # niente righe nel terminale a ogni richiesta
        pass


def prova():
    """Autoverifica senza server: blocchi a pezzi, tipi di evento, nomi dei rapporti."""
    import tempfile
    obj = {"x": 1, "testo": "a" * 2000, "lista": list(range(50))}
    s = json.dumps(obj)
    n = -(-len(s) // 900)
    righe = [f"[2026-11-08 10:00:00:000 INFO] [Scripting] [Claude][STATO] abc {i // 900 + 1}/{n} {s[i:i + 900]}" for i in range(0, len(s), 900)]
    righe += [
        "[2026-11-08 10:00:01:000 INFO] [Scripting] [Claude][OPERAZIONE] Pensiero: vado a casa",
        "[2026-11-08 10:00:02:000 INFO] [Scripting] [Claude][API] haiku-5-5 $0.0010 in 100+0c out 50 | prova",
        "[2026-11-08 10:00:03:000 WARN] [Scripting] [Claude][ERRORE] ciclo: qualcosa",
        "[2026-11-08 10:00:04:000 INFO] [Scripting] [Claude][BATTITO] 2026-11-08 10:00:04 tps 20.0",
    ]
    with tempfile.NamedTemporaryFile("w", suffix=".log", delete=False) as f:
        f.write("\n".join(righe) + "\n")
        nome = f.name
    st = stato(nome)
    os.unlink(nome)
    assert st["stato"] == obj, "blocco STATO non ricomposto"
    assert [e["tipo"] for e in st["eventi"]] == ["pensiero", "api", "errore"], st["eventi"]
    assert "tps 20.0" in st["battito"]
    assert NOME_RAPPORTO.match("ClaudeMinecraft_20261108_100639.txt")
    assert not NOME_RAPPORTO.match("../../etc/passwd") and not NOME_RAPPORTO.match("ClaudeMinecraft_x/../a.txt")
    # stato della Odin da un sysfs finto
    with tempfile.TemporaryDirectory() as d:
        b = os.path.join(d, "sys/class/power_supply/battery"); os.makedirs(b)
        for k, v in {"capacity": "54", "status": "Discharging", "temp": "251", "current_now": "-400000", "voltage_now": "4000000"}.items():
            open(os.path.join(b, k), "w").write(v)
        for n, (tipo, g) in enumerate([("cpu-0-0-0", "48000"), ("cpu-1-2-0", "54300"), ("battery", "25000")]):
            z = os.path.join(d, f"sys/class/thermal/thermal_zone{n}"); os.makedirs(z)
            open(os.path.join(z, "type"), "w").write(tipo); open(os.path.join(z, "temp"), "w").write(g)
        os.makedirs(os.path.join(d, "proc"))
        open(os.path.join(d, "proc/meminfo"), "w").write("MemTotal:  7800000 kB\nMemAvailable:  2200000 kB\n")
        open(os.path.join(d, "proc/uptime"), "w").write("37800.5 1000.0")
        open(os.path.join(d, "consumo_server.txt"), "w").write("=== CONSUMO ===")
        od = stato_odin(d, os.path.join(d, "sys"), os.path.join(d, "proc"))
        assert od["batteria"] == 54 and od["carica"] == "Discharging" and od["temp_batteria"] == 25.1, od
        assert od["watt"] == 1.6 and od["temp_cpu"] == 54.3 and od["ram_libera_mb"] == 2148 and od["acceso_da_ore"] == 10.5, od
        assert od["consumo_server"] == "=== CONSUMO ===" and od["carico"] is None
        # comandi remoti: solo quelli della lista arrivano al modulo
        rc = os.path.join(d, "Download/Odin2_report"); os.makedirs(rc, exist_ok=True)
        assert manda_comando(rc, "sync_drive") and _leggi(os.path.join(d, "Download/.odin_comando")) == "sync_drive"
        assert not manda_comando(rc, "rm -rf /")
        # sysfs nascosto (come su Termux): valori dal file del modulo
        r2 = os.path.join(d, "Download/Odin2_report"); os.makedirs(r2, exist_ok=True)
        open(os.path.join(d, "Download/.odin_stato"), "w").write(f"batteria=77\nstato=Charging\ntemp_batteria=312\ncorrente_ua=-500000\ntensione_uv=4000000\ntemp_cpu=61\nuptime=36000\nora={int(time.time())}\n")
        m = stato_odin(r2, os.path.join(d, "manca"), os.path.join(d, "manca"))
        assert m["batteria"] == 77 and m["carica"] == "Charging" and m["temp_batteria"] == 31.2 and m["watt"] == 2.0, m
        assert m["temp_cpu"] == 61 and m["acceso_da_ore"] == 10.0, m
        open(os.path.join(d, "Download/.odin_stato"), "w").write("batteria=10\nora=1\n")  # vecchio: ignorato
        assert stato_odin(r2, os.path.join(d, "manca"), os.path.join(d, "manca"))["batteria"] is None
        sano = salute({"temp_cpu": 45, "ram_libera_mb": 2300, "disco_libero_gb": 40}, 19.9)
        assert sano["voto"] == 100 and sano["frase"] == "La Odin sta bene", sano
        caldo = salute({"temp_cpu": 85, "ventola": 0, "ram_libera_mb": 500, "pausa_calore": True}, 9)
        assert caldo["voto"] < 40 and len(caldo["motivi"]) == 5 and "sta male" in caldo["frase"], caldo
        lg = os.path.join(d, "server_20261109_065227.log")
        open(lg, "w").write("x [Scripting] [Claude][BATTITO] 2026-11-09 07:10:00 tps 19.9 media 16.6 min 8.8 | ok\n")
        assert ultimo_battito(lg) == ("2026-11-09 07:10:00", 19.9, 16.6, 8.8)
        assert acceso_da(lg) is not None and acceso_da("x.log") is None
        oc = odin_completo(r2, lg)
        assert oc["tps_media"] == 16.6 and "salute" in oc and isinstance(oc["storico"], list)
        campiona(r2, lg); assert STORICO and STORICO[-1][2] == 19.9
        # PIN: solo la prima volta, mai in chiaro, 5 sbagliati = blocco
        assert not imposta_pin(d, "12a4") and imposta_pin(d, "1234") and not imposta_pin(d, "9999")
        assert "1234" not in _leggi(file_pin(d))
        assert controlla_pin(d, "1234") is True and controlla_pin(d, "0000") is False
        for _ in range(4):
            controlla_pin(d, "0000")
        assert controlla_pin(d, "1234") is None, "dopo 5 PIN sbagliati doveva bloccare"
        SBAGLIATI.clear()
        assert manda_ordine(d, "bot_casa") and _leggi(os.path.join(d, ".pannello_ordine")) == "bot_casa"
        assert not manda_ordine(d, "rm -rf /")
        vuoto = stato_odin(os.path.join(d, "manca"), os.path.join(d, "manca"), os.path.join(d, "manca"))
        assert all(v in (None, {}, False) for k, v in vuoto.items() if k != "core"), vuoto
    print("prova pannello ok")


if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("--log", default="")
    a.add_argument("--rep", default="/sdcard/Download/Odin2_report")
    a.add_argument("--porta", type=int, default=8080)
    a.add_argument("--test", action="store_true")
    arg = a.parse_args()
    if arg.test:
        prova()
    else:
        Gestore.log_path, Gestore.rep = arg.log, arg.rep
        import threading

        def campionatore():
            while True:
                try:
                    campiona(arg.rep, arg.log)
                except Exception:  # un campione perso non deve fermare il pannello
                    pass
                time.sleep(60)
        threading.Thread(target=campionatore, daemon=True).start()
        ThreadingHTTPServer(("0.0.0.0", arg.porta), Gestore).serve_forever()
