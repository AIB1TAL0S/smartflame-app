# SmartFlame — IoT Fire Detection & Mobile Emergency Response

ESP32 + MQ2 + flame sensor + DHT11 + buzzer + LCD → Blynk Cloud → Expo mobile app with push alerts.

```
Sensors → ESP32 (Arduino, Blynk lib) → Blynk Cloud ── webhook → Expo Push → 📱
                                            │
                                            └── HTTPS getAll ← poll 3s ← 📱 app
```

## Repo layout
- `SPEC_PLAN.md` — full design: datastreams, webhook payload, acceptance criteria
- `src/app/` — expo-router screens: `index` (dashboard), `alert` (siren), `settings` (token, region, poll, test push)
- `src/lib/` — `blynk.ts` (external API URLs + getAll parsing), `useBlynkPoll.ts` (3s poll + backoff), `store.ts` (zustand), `notifications.ts` (channel + token), `persist.ts` (SecureStore)
- `scripts/fake-device.sh` — simulates ESP32 writes; `--fire` flag triggers alert path

## Blynk datastreams
| Pin | Name | Type | Meaning |
|---|---|---|---|
| V1 | gas | Integer | MQ2 ppm (0–4095) |
| V2 | flame | Integer | 0/1 flame detected |
| V3 | temp | Double | DHT11 °C |
| V4 | hum | Double | DHT11 % |
| V5 | alarm | Integer | buzzer 0/1 — writable from app (mute) |

## Run
```bash
npm install
npx expo start          # scan QR with Expo Go
```

## Simulate device (no hardware needed)
```bash
TOKEN=<device token> ./scripts/fake-device.sh          # normal readings
TOKEN=<device token> ./scripts/fake-device.sh --fire   # fire event → push alert
```

## Firmware side (ESP32)
Use Blynk library with template `SmartFlame`, device token from Blynk Console.
Write sensors to V1-V5 (on change + 5s heartbeat), buzzer state to V5,
and react to V4 writes (app mute) via `BLYNK_WRITE(V5)`.
