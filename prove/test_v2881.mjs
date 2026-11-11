import assert from "node:assert/strict";
import { system, world } from "@minecraft/server";
import { gestisciFame, esciDalRiparo } from "./scripts/azioni.js";
import { mem } from "./scripts/memoria.js";
// 2.8.81 — 11/11 mattina: fame 16-17 per ore e 0 pasti. In Minecraft sotto 18 di fame la vita non risale: ogni colpo è
// rimasto e la vita è scesa da 20 a 1. Poi è uscito dalla tana d'emergenza con vita 7 tra una strega e uno zombie.
function finto(fame, vita, items) {
  const slots = Array(36).fill(null); items.forEach((it, i) => (slots[i] = it));
  const c = { size: 36, getItem: (i) => slots[i], setItem: (i, v) => (slots[i] = v), swapItems: (a, b) => { const t = slots[a]; slots[a] = slots[b]; slots[b] = t; } };
  const b = { usati: 0, selectedSlotIndex: 0, getComponent: (n) => n === "minecraft:player.hunger" ? { currentValue: fame } : n === "minecraft:health" ? { currentValue: vita } : n === "minecraft:inventory" ? { container: c } : null,
    useItemInSlot: () => b.usati++, stopUsingItem() {}, addEffect() {} };
  return b;
}
// vita 15, fame 16, carne cotta in tasca: deve mangiare (prima aspettava fame 14 o vita sotto 14)
const b1 = finto(16, 15, [{ typeId: "minecraft:cooked_beef", amount: 3 }]);
assert.equal(gestisciFame(b1, false), true, "con vita 15 e fame 16 non ha mangiato: la vita non risale");
assert.equal(b1.usati, 1);
system.currentTick += 50; gestisciFame(b1, false); // chiude il pasto in corso
// vita piena e fame 16: non spreca il cibo
const b2 = finto(16, 20, [{ typeId: "minecraft:cooked_beef", amount: 3 }]);
assert.equal(gestisciFame(b2, false), false);
// fame 18: la vita risale da sola, non mangia
const b3 = finto(18, 15, [{ typeId: "minecraft:cooked_beef", amount: 3 }]);
assert.equal(gestisciFame(b3, false), false);
// uscita dal riparo a mezzogiorno con vita 6 e uno zombie vicino: aspetta; senza mostri esce
let mostri = [{ isValid: true, id: "z", typeId: "minecraft:zombie", location: { x: 13.5, y: 64, z: 10.5 } }], vita = 6;
const dim = { id: "minecraft:overworld", heightRange: { min: -64, max: 320 }, getEntities: () => mostri,
  getBlock: (p) => ({ typeId: p.y <= 63 ? "minecraft:dirt" : "minecraft:air", isAir: p.y > 63, isLiquid: false, location: p }),
  getTopmostBlock: (q) => ({ location: { x: q.x, y: 63, z: q.z } }) };
const bot = { location: { x: 10.5, y: 60, z: 10.5 }, dimension: dim, teleport(p) { this.location = p; }, getComponent: (n) => (/health/.test(n) ? { currentValue: vita } : null) };
world.getTimeOfDay = () => 6000; mem.rifugio = { x: 10, y: 60, z: 10, ok: true };
assert.equal(esciDalRiparo(bot), "aspetta", "a mezzogiorno con vita 6 e uno zombie fuori è uscito");
mostri = [];
assert.equal(esciDalRiparo(bot), true, "senza mostri deve uscire anche con poca vita (deve procurarsi cibo)");
delete world.getTimeOfDay;
console.log("test v2.8.81 ok");
