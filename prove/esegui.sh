#!/bin/bash
# Prove del bot senza Minecraft (moduli @minecraft finti in node_modules).
# Uso: bash prove/esegui.sh   -> stampa "fail=0" se tutto va
cd "$(dirname "$0")" || exit 1
mkdir -p scripts && cp ../pack/ClaudeCompagno/scripts/*.js scripts/
fail=0
for t in test*.mjs; do
  out=$(timeout 120 node "$t" 2>&1) || { fail=1; echo "FAIL $t"; echo "$out" | grep -v "^    at" | tail -6; }
done
echo "fail=$fail"
exit $fail
