#!/usr/bin/env python3
"""Pannello web di Claude Compagno: mostra in diretta tutto quello che fa il bot.

Legge il log del server (righe [Claude][...] scritte dal bot) e i rapporti in Odin2_report.
Solo lettura: non comanda il bot e non tocca il mondo. Lo avvia avvia.sh:
    python3 pannello.py --log /root/claudemc/log/server_X.log --rep /sdcard/Download/Odin2_report --porta 8080
Prova senza server:  python3 pannello.py --test
"""
import argparse
import json
import os
import re
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
        if f("uptime") is not None:
            o["acceso_da_ore"] = round(f("uptime") / 3600, 1)
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
            return self._invia(200, json.dumps(stato_odin(self.rep), ensure_ascii=False), "application/json")
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
        # sysfs nascosto (come su Termux): valori dal file del modulo
        r2 = os.path.join(d, "Download/Odin2_report"); os.makedirs(r2)
        open(os.path.join(d, "Download/.odin_stato"), "w").write(f"batteria=77\nstato=Charging\ntemp_batteria=312\ncorrente_ua=-500000\ntensione_uv=4000000\ntemp_cpu=61\nuptime=36000\nora={int(time.time())}\n")
        m = stato_odin(r2, os.path.join(d, "manca"), os.path.join(d, "manca"))
        assert m["batteria"] == 77 and m["carica"] == "Charging" and m["temp_batteria"] == 31.2 and m["watt"] == 2.0, m
        assert m["temp_cpu"] == 61 and m["acceso_da_ore"] == 10.0, m
        open(os.path.join(d, "Download/.odin_stato"), "w").write("batteria=10\nora=1\n")  # vecchio: ignorato
        assert stato_odin(r2, os.path.join(d, "manca"), os.path.join(d, "manca"))["batteria"] is None
        vuoto = stato_odin(os.path.join(d, "manca"), os.path.join(d, "manca"), os.path.join(d, "manca"))
        assert all(v is None for v in vuoto.values()), vuoto
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
        ThreadingHTTPServer(("0.0.0.0", arg.porta), Gestore).serve_forever()
