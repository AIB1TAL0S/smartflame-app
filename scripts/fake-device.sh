#!/usr/bin/env bash
# Simulates the ESP32: writes sensor values to a Blynk device via external API.
# Usage: TOKEN=xxx REGION=blynk.cloud ./scripts/fake-device.sh [--fire]
set -euo pipefail
TOKEN="${TOKEN:?need device token}"
REGION="${REGION:-blynk.cloud}"
FIRE="${1:-}"
GAS=$(( FIRE == "--fire" ? 3800 + RANDOM % 300 : 200 + RANDOM % 400 ))
FLAME=$(( FIRE == "--fire" ? 1 : 0 ))
TEMP=$(python3 -c "import random;print(round(random.uniform(24,32),1))")
HUM=$(python3 -c "import random;print(round(random.uniform(40,70),0))")
ALARM=$(( FIRE == "--fire" ? 1 : 0 ))
base="https://${REGION}.blynk.cloud/external/api/update?token=${TOKEN}"
for pair in "V0=${GAS}" "V1=${FLAME}" "V2=${TEMP}" "V3=${HUM}" "V4=${ALARM}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "${base}&${pair}")
  echo "${pair} -> HTTP ${code}"
done
