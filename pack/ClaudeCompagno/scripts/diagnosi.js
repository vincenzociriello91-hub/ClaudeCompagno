import { world, EquipmentSlot } from "@minecraft/server";
import { sessione, evento, protetti, chiaveBlocco, notifica } from "./memoria.js";
import { aggiungi, togli, contaOggetti, piazza, scava, fabbrica, suolo, inv } from "./azioni.js";

// Autodiagnosi all'avvio: prova in pochi istanti le abilità del bot, senza consumare nulla di suo e senza
// chiamare l'IA (gratis). Il risultato va nel rapporto: così si scopre subito se una funzione non va nel gioco vero.
export function autodiagnosi(bot) {
  const esiti = [];
  const prova = (nome, f) => {
    try {
      const r = f();
      esiti.push([nome, r === true || (Array.isArray(r) && r[0] === true), Array.isArray(r) ? r[1] : r === true ? "" : String(r ?? "")]);
    } catch (e) { esiti.push([nome, false, `errore: ${String(e?.message ?? e).slice(0, 80)}`]); }
  };
  const l = bot.location, dim = bot.dimension;
  const f = { x: Math.floor(l.x), y: Math.floor(l.y), z: Math.floor(l.z) };

  prova("inventario (aggiungi/togli)", () => {
    const prima = contaOggetti(bot, "minecraft:stick");
    aggiungi(bot, "minecraft:stick", 2);
    const dopo = contaOggetti(bot, "minecraft:stick");
    togli(bot, "minecraft:stick", 2);
    return dopo === prima + 2 && contaOggetti(bot, "minecraft:stick") === prima ? true : `da ${prima} a ${dopo}`;
  });

  prova("crafting (assi -> bastoni)", () => {
    const assi = contaOggetti(bot, "#assi"), bastoni = contaOggetti(bot, "minecraft:stick");
    aggiungi(bot, "minecraft:oak_planks", 2);
    const [ok, msg] = fabbrica(bot, "minecraft:stick", 4);
    const fatti = contaOggetti(bot, "minecraft:stick") - bastoni;
    if (fatti > 0) togli(bot, "minecraft:stick", fatti);
    const avanzo = contaOggetti(bot, "#assi") - assi;
    if (avanzo > 0) togli(bot, "#assi", avanzo);
    return ok && fatti === 4 ? true : `${msg} (fatti ${fatti})`;
  });

  prova("piazzare e scavare un blocco", () => {
    for (const [dx, dz] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2]]) {
      const p = { x: f.x + dx, y: f.y, z: f.z + dz };
      const b = dim.getBlock(p), sotto = dim.getBlock({ x: p.x, y: p.y - 1, z: p.z });
      if (!b?.isAir || !sotto || sotto.isAir || sotto.isLiquid) continue;
      const terra = contaOggetti(bot, "minecraft:dirt");
      aggiungi(bot, "minecraft:dirt", 1);
      const messo = piazza(bot, p, "minecraft:dirt");
      // i blocchi piazzati dal bot sono protetti (le sue costruzioni restano intatte): per la prova si toglie la protezione
      if (messo === "ok") protetti.delete(chiaveBlocco(dim, p));
      const tolto = messo === "ok" ? scava(bot, p) : "-";
      const avanzo = contaOggetti(bot, "minecraft:dirt") - terra;
      if (avanzo > 0) togli(bot, "minecraft:dirt", avanzo);
      return messo === "ok" && tolto === "ok" && dim.getBlock(p)?.isAir ? true : `piazza ${messo}, scava ${tolto}`;
    }
    return [true, "saltata: nessuna cella libera intorno"];
  });

  prova("terreno sicuro (getTopmostBlock)", () => (suolo(dim, f.x, f.z) ? true : "nessun terreno trovato"));

  prova("luce (getLightLevel)", () => { const v = dim.getLightLevel({ x: f.x, y: f.y + 1, z: f.z }); return Number.isFinite(v) ? true : `valore ${v}`; });

  prova("accovacciarsi (scudo)", () => {
    bot.isSneaking = true; const su = bot.isSneaking; bot.isSneaking = false;
    return su === true && bot.isSneaking === false ? true : "isSneaking non cambia";
  });

  prova("mano sinistra (scudo)", () => { bot.getComponent("minecraft:equippable").getEquipment(EquipmentSlot.Offhand); return true; });

  prova("dare da mangiare agli animali (interactWithEntity)", () => (typeof bot.interactWithEntity === "function" ? true : "funzione assente"));

  prova("navigazione", () => {
    const r = bot.navigateToLocation({ x: l.x + 2, y: l.y, z: l.z });
    bot.stopMoving();
    return r ? true : "nessun risultato";
  });

  prova("animali e mostri visibili (getEntities)", () => { dim.getEntities({ location: l, maxDistance: 16 }); return true; });

  prova("giocatori (getAllPlayers)", () => (world.getAllPlayers().length >= 1 ? true : "nessun giocatore"));

  prova("inventario dei giocatori (aiuto attivo)", () => {
    const p = world.getAllPlayers().find((x) => x.id !== bot.id);
    if (!p) return true;
    return p.getComponent("minecraft:inventory")?.container ? true : "inventario del giocatore non leggibile";
  });

  prova("posti liberi in inventario", () => { const c = inv(bot); let vuoti = 0; for (let i = 0; i < c.size; i++) if (!c.getItem(i)) vuoti++; return vuoti > 0 ? true : "inventario pieno"; });

  sessione.diagnosi = esiti;
  const ko = esiti.filter((e) => !e[1]);
  if (ko.length) notifica(`🩺 Autodiagnosi: ${ko.length} prove fallite (${ko.map((e) => e[0]).join(", ")})`);
  evento(`Autodiagnosi: ${esiti.length - ko.length}/${esiti.length} OK${ko.length ? " | KO: " + ko.map((e) => `${e[0]} (${e[2]})`).join("; ") : ""}`);
  return esiti;
}
