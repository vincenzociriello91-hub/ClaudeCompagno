#!/usr/bin/env python3
"""Attiva l'esperimento "API beta" (gametest) nel level.dat di un mondo Bedrock.

Il server dedicato non ha un'opzione per gli esperimenti: si scrivono nel level.dat.
Formato: 4 byte versione + 4 byte lunghezza (little-endian), poi NBT little-endian.
Uso: patch_level.py <level.dat>   |   patch_level.py --test
"""
import shutil
import struct
import sys

FLAG = ["gametest", "experiments_ever_used", "saved_with_toggled_experiments"]
FORMATI = {1: "<b", 2: "<h", 3: "<i", 4: "<q", 5: "<f", 6: "<d"}


def leggi(buf, pos, tipo):
    if tipo in FORMATI:
        f = FORMATI[tipo]
        return struct.unpack_from(f, buf, pos)[0], pos + struct.calcsize(f)
    if tipo == 7:
        n = struct.unpack_from("<i", buf, pos)[0]
        return bytes(buf[pos + 4:pos + 4 + n]), pos + 4 + n
    if tipo == 8:
        n = struct.unpack_from("<H", buf, pos)[0]
        return bytes(buf[pos + 2:pos + 2 + n]).decode("utf-8"), pos + 2 + n
    if tipo == 9:
        sotto, n = struct.unpack_from("<bi", buf, pos)
        pos += 5
        voci = []
        for _ in range(n):
            v, pos = leggi(buf, pos, sotto)
            voci.append(v)
        return (sotto, voci), pos
    if tipo == 10:
        voci = []
        while True:
            t = buf[pos]
            pos += 1
            if t == 0:
                return voci, pos
            nome, pos = leggi(buf, pos, 8)
            v, pos = leggi(buf, pos, t)
            voci.append([t, nome, v])
    if tipo in (11, 12):
        n = struct.unpack_from("<i", buf, pos)[0]
        f = "<" + ("i" if tipo == 11 else "q") * n
        return list(struct.unpack_from(f, buf, pos + 4)), pos + 4 + struct.calcsize(f)
    raise ValueError(f"tag NBT sconosciuto {tipo} alla posizione {pos}")


def scrivi(tipo, v):
    if tipo in FORMATI:
        return struct.pack(FORMATI[tipo], v)
    if tipo == 7:
        return struct.pack("<i", len(v)) + v
    if tipo == 8:
        b = v.encode("utf-8")
        return struct.pack("<H", len(b)) + b
    if tipo == 9:
        sotto, voci = v
        return struct.pack("<bi", sotto, len(voci)) + b"".join(scrivi(sotto, x) for x in voci)
    if tipo == 10:
        return b"".join(bytes([t]) + scrivi(8, n) + scrivi(t, x) for t, n, x in v) + b"\x00"
    if tipo in (11, 12):
        return struct.pack("<i", len(v)) + struct.pack("<" + ("i" if tipo == 11 else "q") * len(v), *v)
    raise ValueError(tipo)


def imposta(radice):
    """Restituisce True se ha cambiato qualcosa."""
    esp = next((x for x in radice if x[1] == "experiments" and x[0] == 10), None)
    if esp is None:
        esp = [10, "experiments", []]
        radice.append(esp)
    cambiato = False
    for flag in FLAG:
        voce = next((x for x in esp[2] if x[1] == flag), None)
        if voce is None:
            esp[2].append([1, flag, 1])
            cambiato = True
        elif voce[0] != 1 or voce[2] != 1:
            voce[0], voce[2] = 1, 1
            cambiato = True
    return cambiato


def patch(dati):
    versione, lunghezza = struct.unpack_from("<ii", dati, 0)
    corpo = dati[8:8 + lunghezza]
    if corpo[0] != 10:
        raise ValueError("level.dat non valido: la radice non è un compound")
    nome, pos = leggi(corpo, 1, 8)
    radice, _ = leggi(corpo, pos, 10)
    cambiato = imposta(radice)
    nuovo = bytes([10]) + scrivi(8, nome) + scrivi(10, radice)
    return struct.pack("<ii", versione, len(nuovo)) + nuovo, cambiato


def test():
    radice = [[8, "LevelName", "Prova"], [3, "GameType", 0], [4, "RandomSeed", 123456789012],
              [9, "lastOpenedWithVersion", (3, [1, 26, 63, 1, 0])],
              [10, "abilities", [[1, "mayfly", 0], [5, "flySpeed", 0.5]]],
              [10, "experiments", [[1, "data_driven_items", 1]]]]
    corpo = bytes([10]) + scrivi(8, "") + scrivi(10, radice)
    originale = struct.pack("<ii", 10, len(corpo)) + corpo
    nuovo, cambiato = patch(originale)
    assert cambiato
    assert struct.unpack_from("<ii", nuovo, 0) == (10, len(nuovo) - 8)
    r, _ = leggi(nuovo[8:], 1 + 2, 10)
    esp = {n: v for _, n, v in next(x for x in r if x[1] == "experiments")[2]}
    assert esp == {"data_driven_items": 1, "gametest": 1, "experiments_ever_used": 1, "saved_with_toggled_experiments": 1}, esp
    assert [x for x in r if x[1] != "experiments"] == radice[:-1], "gli altri campi sono cambiati"
    assert patch(nuovo) == (nuovo, False), "una seconda esecuzione deve lasciare il file identico"
    print("test ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["--test"]:
        test()
        sys.exit(0)
    percorso = sys.argv[1]
    with open(percorso, "rb") as f:
        dati = f.read()
    nuovo, cambiato = patch(dati)
    if cambiato:
        shutil.copyfile(percorso, percorso + ".bak")
        with open(percorso, "wb") as f:
            f.write(nuovo)
        print("API beta attivate nel mondo")
    else:
        print("API beta già attive")
