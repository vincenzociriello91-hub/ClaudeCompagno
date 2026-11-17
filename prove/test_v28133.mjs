import assert from "node:assert/strict";
import { fuoriTiro, ARCIERI } from "./scripts/azioni.js";
// 2.8.133 — 17/11 09:51 e 12:12 UTC: "Lascio perdere skeleton: non riesco a raggiungerlo", poi morto per le frecce restando
// sotto tiro. Contro un arciere irraggiungibile ci si allontana a 20 blocchi, dalla parte opposta.
assert.ok(ARCIERI.test("minecraft:skeleton") && ARCIERI.test("minecraft:stray") && !ARCIERI.test("minecraft:zombie"));
const io = { x: 5, y: 64, z: 0 }, scheletro = { x: 0, y: 70, z: 0 };
const p = fuoriTiro(io, scheletro);
assert.ok(Math.hypot(p.x - scheletro.x, p.z - scheletro.z) >= 16, "fuori dal tiro dello scheletro (16 blocchi)");
assert.ok(p.x > io.x, "dalla parte opposta allo scheletro");
console.log("test v2.8.133 ok");
