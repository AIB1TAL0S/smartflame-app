#!/usr/bin/env bash
# Simulates the ESP32: writes sensor values to a Blynk device via external API.
# Usage: TOKEN=xxx REGION=blynk.cloud ./scripts/fake-device.sh [--fire]
set -euo pipefail
TOKEN="${TOKEN:?need device token}"
REGION="${REGION:-blynk.cloud}"
FIRE="${1:-}"
IS_FIRE=false
[ "$FIRE" = "--fire" ] && IS_FIRE=true
if $IS_FIRE; then
  GAS=$((80 + RANDOM % 20)); FLAME=1; ALARM=1
else
  GAS=$((5 + RANDOM % 20)); FLAME=0; ALARM=0
fi
TEMP=$(python3 -c "import random;print(round(random.uniform(24,32),1))")
HUM=$(python3 -c "import random;print(round(random.uniform(40,70),0))")

base="https://blynk.cloud/external/api/update?token=${TOKEN}"
for pair in "V1=${GAS}" "V2=${FLAME}" "V3=${TEMP}" "V4=${HUM}" "V5=${ALARM}"; do
  code=$(curl -sL -o /dev/null -w "%{http_code}" "${base}&${pair}")
  echo "${pair} -> HTTP ${code}"
done
