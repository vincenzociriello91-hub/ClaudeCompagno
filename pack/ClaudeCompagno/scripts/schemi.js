// Schemi di costruzione pronti: generati all'istante, senza chiamare l'architetto (gratis e sempre corretti).
// Coordinate relative all'origine: x verso est, z verso sud, dy=0 è il pavimento. Le porte sono sul lato ovest (dx=0).
// Niente blocchi orientati (porte, scale vere, letti): le salite sono gradini di blocchi pieni.
import { mem } from "./memoria.js";

const ns = (id) => (String(id).includes(":") ? String(id) : `minecraft:${id}`);

export const SCHEMI_BASE = {
  rifugio: "chiuso 3x3 con tetto, nessuna apertura: per sopravvivere alla notte",
  casa: "pavimento, pareti, tetto (piatto o 'gradoni'), porta 1x2 a ovest, finestre vuote",
  casa_due_piani: "casa a due piani con gradini interni per salire (minimo 6x6)",
  magazzino: "casa con una fila di casse lungo la parete est",
  torre: "torre cava con porta, gradini a spirale interni e terrazza in cima (minimo 5x5)",
  torre_guardia: "torre con merli e torce in cima per vedere lontano (minimo 5x5)",
  faro: "pilastro alto con piattaforma e torce in cima, si vede da lontano",
  recinto: "perimetro pieno con varco 1x2 a ovest, senza tetto",
  recinto_animali: "staccionata alta 1 con cancello sul lato nord, per tenere animali",
  muro: "muro dritto verso est",
  muro_difensivo: "muro dritto verso est con merli in cima",
  ponte: "ponte verso est con parapetti (larghezza lato_z, 3 se non indicata)",
  strada: "sentiero verso est sostituendo il terreno (larghezza lato_z, 3 se non indicata)",
  scalinata: "gradini pieni che salgono verso est fino a 'altezza'",
  piattaforma: "piano sollevato a 'altezza' su quattro pilastri",
  tettoia: "quattro pilastri e un tetto, aperta sui lati (portico, riparo per il lavoro)",
  pavimento: "piano pieno",
};

export function genera(nome, { lato_x, lato_z, altezza, materiale, materiale2, tetto } = {}) {
  const X = Math.max(3, Math.min(31, Math.round(lato_x ?? 5)));
  const Z = Math.max(3, Math.min(31, Math.round(lato_z ?? 5)));
  const H = Math.max(2, Math.min(24, Math.round(altezza ?? 3)));
  const m = ns(materiale ?? "oak_planks");
  const m2 = ns(materiale2 ?? materiale ?? "oak_planks");
  const torcia = "minecraft:torch";
  const b = [];
  const occupati = new Set();
  const metti = (x, y, z, id) => { const k = `${x},${y},${z}`; if (!occupati.has(k)) { occupati.add(k); b.push([x, y, z, id]); } };
  const togli = (x, y, z) => { const k = `${x},${y},${z}`; if (occupati.delete(k)) b.splice(b.findIndex((e) => e[0] === x && e[1] === y && e[2] === z), 1); };
  const bordo = (x, z, xx, zz) => x === 0 || z === 0 || x === xx - 1 || z === zz - 1;
  const pieno = (dy, id, xx = X, zz = Z, ox = 0, oz = 0) => { for (let x = 0; x < xx; x++) for (let z = 0; z < zz; z++) metti(x + ox, dy, z + oz, id); };
  const pareti = (da, a, id, buchi = (x, dy, z) => false, xx = X, zz = Z) => {
    for (let dy = da; dy <= a; dy++) for (let x = 0; x < xx; x++) for (let z = 0; z < zz; z++) if (bordo(x, z, xx, zz) && !buchi(x, dy, z)) metti(x, dy, z, id);
  };
  const porta = (base) => (x, dy, z) => x === 0 && z === Math.floor(Z / 2) && (dy === base + 1 || dy === base + 2);
  const finestre = (base) => (x, dy, z) => dy === base + 2 && ((x === X - 1 && z === Math.floor(Z / 2)) || (X >= 5 && (z === 0 || z === Z - 1) && x === Math.floor(X / 2)));
  const tettoGradoni = (dy0, id) => {
    for (let t = 0; X - 2 * t > 0 && Z - 2 * t > 0; t++) {
      const xx = X - 2 * t, zz = Z - 2 * t;
      for (let x = 0; x < xx; x++) for (let z = 0; z < zz; z++) if (bordo(x, z, xx, zz) || xx <= 2 || zz <= 2) metti(x + t, dy0 + t, z + t, id);
    }
  };
  const merli = (dy, id, xx = X, zz = Z) => { for (let x = 0; x < xx; x++) for (let z = 0; z < zz; z++) if (bordo(x, z, xx, zz) && (x + z) % 2 === 0) metti(x, dy, z, id); };
  // gradini a spirale lungo l'anello interno di una torre: ogni passo sale di uno, testa libera per 7 blocchi
  const spirale = (da, a, id) => {
    const anello = [];
    for (let x = 1; x < X - 1; x++) anello.push([x, 1]);
    for (let z = 2; z < Z - 1; z++) anello.push([X - 2, z]);
    for (let x = X - 3; x >= 1; x--) anello.push([x, Z - 2]);
    for (let z = Z - 3; z >= 2; z--) anello.push([1, z]);
    let ultimo = anello[0];
    for (let dy = da; dy <= a; dy++) { ultimo = anello[(dy - da) % anello.length]; metti(ultimo[0], dy, ultimo[1], id); }
    return ultimo;
  };

  switch (nome) {
    case "rifugio": {
      const x = lato_x ? X : 3, z = lato_z ? Z : 3;
      pieno(0, m2, x, z); pareti(1, 2, m, undefined, x, z); pieno(3, m2, x, z);
      break;
    }
    case "casa":
    case "magazzino": {
      pieno(0, m2);
      pareti(1, H, m, (x, dy, z) => porta(0)(x, dy, z) || finestre(0)(x, dy, z), X, Z);
      if (tetto === "gradoni") tettoGradoni(H + 1, m2); else pieno(H + 1, m2);
      if (nome === "magazzino") for (let z = 1; z < Z - 1; z++) metti(X - 2, 1, z, "minecraft:chest");
      break;
    }
    case "casa_due_piani": {
      const XX = Math.max(6, X), ZZ = Math.max(6, Z);
      const h = Math.min(H, ZZ - 3);
      const p1 = (x, dy, z) => (x === 0 && z === Math.floor(ZZ / 2) && (dy === 1 || dy === 2)) || (dy === 2 && x === XX - 1 && z === Math.floor(ZZ / 2));
      pieno(0, m2, XX, ZZ); pareti(1, h, m, p1, XX, ZZ);
      pieno(h + 1, m2, XX, ZZ);
      for (let k = 1; k <= h; k++) metti(1, k, k, m2); // gradini lungo la parete ovest
      togli(1, h + 1, h); togli(1, h + 1, h - 1); // buco nel solaio sopra l'ultimo gradino
      const b2 = h + 1;
      pareti(b2 + 1, b2 + h, m, (x, dy, z) => dy === b2 + 2 && (x === XX - 1 || z === 0) && (z === Math.floor(ZZ / 2) || x === Math.floor(XX / 2)), XX, ZZ);
      if (tetto === "gradoni") tettoGradoni(b2 + h + 1, m2); else pieno(b2 + h + 1, m2, XX, ZZ);
      break;
    }
    case "torre":
    case "torre_guardia": {
      const XX = Math.max(5, X), ZZ = Math.max(5, Z);
      const HH = Math.max(H, 6);
      pieno(0, m2, XX, ZZ);
      pareti(1, HH, m, (x, dy, z) => x === 0 && z === Math.floor(ZZ / 2) && (dy === 1 || dy === 2), XX, ZZ);
      const [ux, uz] = spirale(1, HH, m2);
      pieno(HH + 1, m2, XX, ZZ); togli(ux, HH + 1, uz); // botola d'uscita sopra l'ultimo gradino
      if (nome === "torre") pareti(HH + 2, HH + 2, m2, undefined, XX, ZZ);
      else { merli(HH + 2, m, XX, ZZ); for (const [x, z] of [[0, 0], [XX - 1, 0], [0, ZZ - 1], [XX - 1, ZZ - 1]]) metti(x, HH + 3, z, torcia); }
      break;
    }
    case "faro": {
      const HH = Math.max(H, 8);
      for (let dy = 0; dy < HH; dy++) { metti(1, dy, 1, m); }
      pieno(HH, m2, 3, 3);
      for (const [x, z] of [[0, 0], [2, 0], [0, 2], [2, 2]]) metti(x, HH + 1, z, torcia);
      break;
    }
    case "recinto":
      pareti(1, H, m, porta(0));
      break;
    case "recinto_animali": {
      const staccionata = materiale ? m : "minecraft:oak_fence";
      pareti(1, 1, staccionata, (x, dy, z) => z === 0 && x === Math.floor(X / 2));
      metti(Math.floor(X / 2), 1, 0, "minecraft:oak_fence_gate"); // cancello sul lato nord: orientamento predefinito corretto
      break;
    }
    case "muro":
    case "muro_difensivo":
      for (let dy = 1; dy <= H; dy++) for (let x = 0; x < X; x++) metti(x, dy, 0, m);
      if (nome === "muro_difensivo") for (let x = 0; x < X; x += 2) metti(x, H + 1, 0, m);
      break;
    case "ponte": {
      const z = lato_z ? Z : 3;
      pieno(0, m, X, z);
      for (let x = 0; x < X; x++) { metti(x, 1, 0, m2); metti(x, 1, z - 1, m2); }
      break;
    }
    case "strada": {
      const z = lato_z ? Z : 3;
      pieno(-1, ns(materiale ?? "cobblestone"), X, z);
      break;
    }
    case "scalinata": {
      const z = lato_z ? Z : 1;
      for (let x = 0; x < H; x++) for (let dy = 0; dy <= x; dy++) for (let zz = 0; zz < z; zz++) metti(x, dy, zz, m);
      break;
    }
    case "piattaforma":
    case "tettoia": {
      for (const [x, z] of [[0, 0], [X - 1, 0], [0, Z - 1], [X - 1, Z - 1]]) for (let dy = 0; dy < H; dy++) metti(x, dy, z, m);
      pieno(H, m2);
      if (nome === "piattaforma") for (const [x, z] of [[0, 0], [X - 1, 0], [0, Z - 1], [X - 1, Z - 1]]) metti(x, H + 1, z, torcia);
      break;
    }
    case "pavimento":
      pieno(0, m);
      break;
    default:
      return null;
  }
  return b;
}

// Schemi d'azione: sequenze pronte di compiti, eseguite in fila senza chiamare l'API.
export const ROUTINE = {
  kit_legno: { desc: "legna, assi, banco, piccone, ascia e spada di legno", passi: [
    { tipo: "raccogli", blocco: "legna", quantita: 12 }, { tipo: "crafta", oggetto: "planks", quantita: 24 },
    { tipo: "crafta", oggetto: "wooden_pickaxe" }, { tipo: "crafta", oggetto: "wooden_axe" }, { tipo: "crafta", oggetto: "wooden_sword" }] },
  attrezzi_pietra: { desc: "pietra, attrezzi di pietra completi e fornace", passi: [
    { tipo: "raccogli", blocco: "pietra", quantita: 24 }, { tipo: "crafta", oggetto: "stone_pickaxe" }, { tipo: "crafta", oggetto: "stone_axe" },
    { tipo: "crafta", oggetto: "stone_sword" }, { tipo: "crafta", oggetto: "stone_shovel" }, { tipo: "crafta", oggetto: "furnace" }] },
  torce: { desc: "carbone (o carbonella dai tronchi) e 32 torce", passi: [
    { tipo: "raccogli", blocco: "coal_ore", quantita: 8 }, { tipo: "crafta", oggetto: "stick", quantita: 8 }, { tipo: "crafta", oggetto: "torch", quantita: 32 }] },
  carbonella: { desc: "carbonella dai tronchi quando non c'è carbone, poi torce", passi: [
    { tipo: "raccogli", blocco: "legna", quantita: 10 }, { tipo: "fondi", oggetto: "tronco", quantita: 6 }, { tipo: "crafta", oggetto: "torch", quantita: 16 }] },
  armatura_rame: { desc: "24 rame fusi e armatura di rame completa (indossata da sola): protezione prima del ferro", passi: [
    { tipo: "fondi", oggetto: "raw_copper", quantita: 24 }, { tipo: "crafta", oggetto: "copper_chestplate" }, { tipo: "crafta", oggetto: "copper_leggings" },
    { tipo: "crafta", oggetto: "copper_helmet" }, { tipo: "crafta", oggetto: "copper_boots" }] },
  attrezzi_rame: { desc: "rame, lingotti e attrezzi di rame", passi: [
    { tipo: "raccogli", blocco: "copper_ore", quantita: 10 }, { tipo: "fondi", oggetto: "raw_copper", quantita: 10 },
    { tipo: "crafta", oggetto: "copper_pickaxe" }, { tipo: "crafta", oggetto: "copper_sword" }] },
  attrezzi_ferro: { desc: "ferro, lingotti, piccone, spada e ascia di ferro", passi: [
    { tipo: "raccogli", blocco: "iron_ore", quantita: 10 }, { tipo: "fondi", oggetto: "raw_iron", quantita: 10 },
    { tipo: "crafta", oggetto: "iron_pickaxe" }, { tipo: "crafta", oggetto: "iron_sword" }, { tipo: "crafta", oggetto: "iron_axe" }] },
  armatura_ferro: { desc: "24 ferro fusi e armatura di ferro completa (indossata da sola)", passi: [
    { tipo: "raccogli", blocco: "iron_ore", quantita: 24 }, { tipo: "fondi", oggetto: "raw_iron", quantita: 24 },
    { tipo: "crafta", oggetto: "iron_chestplate" }, { tipo: "crafta", oggetto: "iron_leggings" }, { tipo: "crafta", oggetto: "iron_helmet" }, { tipo: "crafta", oggetto: "iron_boots" }] },
  cibo: { desc: "caccia mucche e maiali e cuoce la carne", passi: [
    { tipo: "caccia", oggetto: "cow", quantita: 3 }, { tipo: "caccia", oggetto: "pig", quantita: 3 },
    { tipo: "fondi", oggetto: "beef", quantita: 6 }, { tipo: "fondi", oggetto: "porkchop", quantita: 6 }] },
  letto: { desc: "trova pecore, prende la lana e fa il letto", passi: [
    { tipo: "esplora", lunghezza: 64 }, { tipo: "caccia", oggetto: "sheep", quantita: 3 }, { tipo: "crafta", oggetto: "white_bed" }] },
  vetro: { desc: "sabbia fusa in vetro", passi: [{ tipo: "raccogli", blocco: "sand", quantita: 16 }, { tipo: "fondi", oggetto: "sand", quantita: 16 }] },
  miniera_diamanti: { desc: "scala fino in fondo e tunnel lungo a caccia di diamanti (servono piccone di ferro, cibo, torce)", passi: [
    { tipo: "miniera_scala", direzione: "nord", profondita: 90 }, { tipo: "tunnel", direzione: "est", lunghezza: 60 }, { tipo: "tunnel", direzione: "sud", lunghezza: 30 }] },
  rifornisci_deposito: { desc: "legna e pietra di scorta, poi le smista nelle casse per categoria", passi: [
    { tipo: "raccogli", blocco: "legna", quantita: 16 }, { tipo: "raccogli", blocco: "pietra", quantita: 32 }, { tipo: "sistema_deposito" }] },
  notte_sicura: { desc: "rifugio dove si trova e torce: per una notte lontano da casa", passi: [
    { tipo: "costruisci", schema: "rifugio", materiale: "cobblestone" }, { tipo: "fondi", oggetto: "tronco", quantita: 2 }, { tipo: "crafta", oggetto: "torch", quantita: 8 }] },
  base_iniziale: { desc: "casa 7x7 di assi col tetto a gradoni e un recinto per animali accanto", passi: [
    { tipo: "raccogli", blocco: "legna", quantita: 40 }, { tipo: "crafta", oggetto: "planks", quantita: 160 },
    { tipo: "costruisci", schema: "casa", lato_x: 7, lato_z: 7, altezza: 3, tetto: "gradoni" },
    { tipo: "crafta", oggetto: "oak_fence", quantita: 30 }, { tipo: "crafta", oggetto: "oak_fence_gate" }] },
};

// Schema richiesto: prima quelli salvati (imparati), poi quelli base.
export function blocchiSchema(c) {
  const salvato = mem.schemi?.[c.schema];
  return salvato ? salvato.map((x) => [...x]) : genera(c.schema, c);
}

// Salva un progetto riuscito per riusarlo gratis. shortcut: max 10 schemi da 800 blocchi, poi si sostituisce il più vecchio.
export function salvaSchema(nome, blocchi) {
  if (!nome || blocchi.length > 800) return false;
  mem.schemi ??= {};
  const chiave = String(nome).toLowerCase().replace(/[^a-z0-9àèéìòù]+/g, "_").replace(/^_|_$/g, "").slice(0, 40);
  if (!chiave || SCHEMI_BASE[chiave]) return false;
  delete mem.schemi[chiave];
  mem.schemi[chiave] = blocchi;
  const nomi = Object.keys(mem.schemi);
  if (nomi.length > 10) delete mem.schemi[nomi[0]];
  return chiave;
}
