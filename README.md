# SmartFlame — ESP32 Fire Detection + Expo Companion App

ESP32 (MQ2 + flame + DHT11 + buzzer + LCD) streams sensor JSON on its own web server.
The Expo app connects over **WebSocket** (`ws://<board-ip>:81/`) for realtime ~250 ms
push updates, and automatically falls back to polling `/api/status` every second
when the socket is unavailable.

```
ESP32 ── WiFi router (or its own AP hotspot) ── phone running Expo Go
  │
  ├─ ws://<board-ip>:81/           → JSON pushed ~4×/second (realtime)
  └─ http://<board-ip>/api/status  → JSON fallback poll (1 s + backoff)
```

## Repo layout
- `firmware/SmartFlame/SmartFlame.ino` — the sketch (WiFi + AP fallback + web dashboard + WebSocket push; requires the **WebSockets** library by Markus Sattler from the Arduino Library Manager)
- `src/app/` — expo-router screens: dashboard, alert siren, settings (ESP32 IP entry)
- `src/lib/` — `useEspPoll.ts` (WebSocket-first feed with 1 s poll fallback), `store.ts` (zustand), `persist.ts` (SecureStore), `types.ts` (matches sketch JSON exactly)
- `scripts/esp32-sim.py` — simulates the board (HTTP + optional WebSocket) for app development without hardware

## ESP32 API (already in the sketch)
`GET /api/status` →
```json
{"mq2Raw":412,"gasPercent":0,"temperatureC":28,"humidity":55,"dhtValid":true,
 "flame":false,"alert":"NORMAL","routerConnected":true,"wifiMode":"ROUTER"}
```

## Run the app
```bash
npm install
npx expo start          # scan QR with Expo Go
```
Settings ⚙︎ → enter the board IP (serial command `i` prints it).
Phone must share the ESP32's network — same WiFi, or the `SmartFlame-ESP32` hotspot (then use `http://192.168.4.1`).

## Test without hardware
```bash
python3 scripts/esp32-sim.py 8080        # NORMAL readings
python3 scripts/esp32-sim.py --fire 8080 # EMERGENCY + flame
```
Enter `http://<pc-ip>:8080` in the app (PC and phone on same network).

## Why this design
- No cloud, no broker, no accounts — dashboard works even if the internet is down
- AP fallback: if the router is gone the board hosts `SmartFlame-ESP32` (pass `flame1234`) and the app still reaches it at `192.168.4.1`
- Realtime WebSocket push (~250 ms); 1 s HTTP poll is only a fallback
