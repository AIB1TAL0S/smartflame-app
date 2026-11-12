# SmartFlame — Project Fact Sheet for Documentation

> **Purpose of this file:** Feed this document to an AI assistant (ChatGPT/Claude) along with the assignment requirements to generate the final written documentation (A4, Times New Roman/Arial 11pt, sections in the required order). Every fact below is taken from the actual working code and hardware — no invented specs.

---

## 1. Project Identity

- **Project name:** SmartFlame
- **Full title:** SmartFlame: An IoT-Enabled Fire Detection and Mobile Emergency Response System Using Arduino and ESP32
- **Problem addressed (community need):** Early detection of fire and gas leaks in homes, small shops, and shared-community spaces where fires often start unattended (kitchens, storage rooms, electrical corners). Current practice relies on smoke alarms that sound locally only — nobody is warned if no one is home or nearby, and emergency services are called late. SmartFlame adds remote monitoring (any phone on the local network) plus an automated emergency-dialing flow.
- **Target users/community:** Households, boarding houses, sari-sari stores / small eateries, and barangay halls — any shared building where an unattended fire could spread before discovery.
- **Repository:** https://github.com/AIB1TAL0S/smartflame-app

---

## 2. System Architecture (for the Block Diagram)

```
[MQ-2 gas sensor]──┐
[Flame IR sensor]──┤
[DHT11 temp/hum]───┤──> [ESP32 DevKit V1] ──WiFi (2.4GHz router)──> [Phone / PC]
[Buzzer]  <────────┤        │  WebServer :80      1) Browser dashboard
[16x2 LCD I2C] <───┘        │  WebSocket :81     2) Expo mobile app
                                     │                     (poll 1s / WS push 250ms)
                                     └─ HTTP JSON /api/status
```

- **No cloud service is used.** All communication is local-area: the ESP32 hosts its own web server and WebSocket push server. This is deliberate — the system keeps working during internet outages, which is when fire risk is highest (unattended appliances).
- **Fallback:** if the configured router is unreachable, the ESP32 automatically starts its own WiFi Access Point (SSID `SmartFlame-ESP32`, password `flame1234`, IP `192.168.4.1`). Users connect to this hotspot and open the same dashboard/app.

---

## 3. Hardware Component (actual, working prototype)

### 3.1 Components list

| # | Component | Role | ESP32 pin |
|---|-----------|------|-----------|
| 1 | ESP32 DevKit V1 (30-pin) | Main microcontroller; WiFi + web/WS server | — |
| 2 | MQ-2 gas/smoke sensor | Detects combustible gas & smoke; analog output through 10k/20k divider | GPIO 34 (ADC1, input-only) |
| 3 | Flame sensor module (IR) | Detects open flame; digital output, **active-LOW** | GPIO 27 |
| 4 | DHT11 temperature/humidity sensor | Ambient heat + humidity (dry air = fire risk indicator) | GPIO 33 |
| 5 | Active buzzer (piezo) | Local audible alarm; two patterns (warning/emergency) | GPIO 25 |
| 6 | 16x2 LCD with I2C backpack (PCF8574, addr 0x27) | On-device status display (works without phone) | GPIO 21 (SDA), GPIO 22 (SCL) |
| 7 | Breadboard + jumper wires | Prototyping | — |
| 8 | Micro-USB power (5V) | Power from USB adapter/powerbank | VIN |

### 3.2 Key behaviors (from source code `firmware/SmartFlame/SmartFlame.ino`, 977 lines)

- **Sampling:** flame every 20 ms (debounced 80 ms), gas every 200 ms, DHT11 every 2 s, alert decision every 200 ms with 3-sample debounce.
- **Calibration:** MQ-2 raw ADC 0–4095 mapped to percent: clean air = 400, heavy smoke = 3000.
- **Alert levels (debounced):**
  - WARNING: gas ≥ 30% or temperature ≥ 45°C, or flame alone detected
  - EMERGENCY: gas ≥ 60% or temperature ≥ 60°C, or (flame AND (gas high OR temp high))
- **Buzzer patterns:** WARNING = 2700 Hz, 400 ms beep / 800 ms silence; EMERGENCY = 3200 Hz, 300 ms beep / 100 ms silence. Uses LEDC PWM tone (compatible with ESP32 Arduino core 2.x and 3.x).
- **LCD lines:** `G:xxx% T:xxC F:Y/N` + `LEVEL     H:xx%` — refreshed every 500 ms.
- **Manual test:** serial commands `t` (5 s forced emergency test), `r` (reset), `i` (print IPs).

### 3.3 Network interfaces served by the ESP32

| Interface | Port | Purpose |
|---|---|---|
| HTTP web dashboard | 80 | Self-contained HTML page (embedded in firmware, PROGMEM): live gauges, 1 s refresh |
| HTTP JSON API | 80 (`/api/status`) | Machine-readable snapshot, polled by the mobile app |
| WebSocket push | 81 | Same JSON pushed automatically ~4×/second (realtime) |
| WiFi Access Point | — | `SmartFlame-ESP32` / `flame1234` @ `192.168.4.1` when router fails |

**`/api/status` response (exact contract used by the app):**
```json
{
  "mq2Raw": 220, "gasPercent": 0, "temperatureC": 29, "humidity": 67,
  "dhtValid": true, "flame": false, "alert": "NORMAL",
  "routerConnected": true, "wifiMode": "ROUTER"
}
```
- CORS headers (`Access-Control-Allow-Origin: *`) are sent so browsers may fetch cross-origin.

---

## 4. Software Component (the interface being documented)

### 4.1 Tech stack (already implemented; for mockup documentation present it as the UI design)

- **Framework:** React Native (Expo SDK 58) + expo-router, TypeScript
- **State:** Zustand store fed by a 1-second HTTP poller with exponential backoff, plus WebSocket live feed when available
- **Persistence:** expo-secure-store (native) / localStorage (web)
- **Charts:** react-native-svg (custom strip charts)

### 4.2 Screens (matches the required mockup screens)

1. **Dashboard (home)** — the main screen:
   - Masthead: SMARTFLAME wordmark, live clock, "ALL SYSTEMS LINKED / LINK FAULT" pill, settings gear
   - Verdict strip: overall status (SAFE / WARNING / EMERGENCY / OFFLINE) with trigger detail and OPEN ALERT button during emergencies
   - Gas dial (MQ-2) with 25%/55% threshold ticks, % LEL
   - Flame verdict line (FLAME DETECTED / NO FLAME) with pulsing status dot
   - Twin temperature + humidity gauges with threshold markers (42 warn / 55 crit; 30 dry / 80 wet)
   - Hardware status list (controller, 3 sensors LINKED/OFFLINE; buzzer SOUNDING/IDLE)
   - Event log (timestamped, severity-tagged: GAS/FLAME/HEAT/SYS)
   - Traces: gas % and temperature strip charts with dashed threshold reference lines, 15/30/60-min range selector
2. **Alert screen** — full-screen red modal, auto-opens on EMERGENCY:
   - Flashing siren animation
   - 📞 CALL 711 button (emergency dialer) + MUTE BUZZER action
   - Auto-dismisses only when the alert clears
3. **Settings** — modal:
   - ESP32 address entry (persisted)
   - Emergency number entry (default 711, persisted)
   - Connection status (linked / last update Ns ago)

### 4.3 Emergency response flow

1. Alert level becomes EMERGENCY →
2. Phone notification (system dialog on Android; browser Notification API on web)
3. **Auto-dial `tel:711`** — opens the phone dialer pre-filled; user confirms the call (Android requires CALL_PHONE runtime permission; the app requests it at first launch)
4. Full-screen siren with CALL 711 and MUTE BUZZER actions
5. Episode latches (no repeat dialing) and re-arms automatically when the alert clears

### 4.4 Permissions requested on the APK (declared + runtime dialogs)

- `CALL_PHONE` — emergency auto-dial
- `POST_NOTIFICATIONS` — fire alert banners (Android 13+)
- `INTERNET`, `ACCESS_NETWORK_STATE`

---

## 5. Prototype Photos (checklist for the documentation shoot)

Suggested shots to take:
- [ ] Full breadboard assembly (top-down)
- [ ] Close-up: ESP32 pin wiring (34/27/33/25/21/22)
- [ ] LCD displaying NORMAL reading
- [ ] LCD displaying EMERGENCY during the serial `t` test
- [ ] Flame sensor with lighter ~10 cm away (demonstration pose)
- [ ] Serial Monitor showing `[DATA]` lines and `[ALERT] State changed -> EMERGENCY`
- [ ] Phone dashboard next to the hardware (live values visible on both LCD and app)
- [ ] Phone alert screen + dialer showing 711 pre-filled
- [ ] Browser dashboard on laptop (web version)

---

## 6. Source Code Map (for the "Source Code of the Prototype" section)

| File | Lines | Role |
|---|---|---|
| `firmware/SmartFlame/SmartFlame.ino` | 977 | Complete ESP32 sketch: sensors, alert logic, buzzer, LCD, web server, WebSocket, AP fallback |
| `src/app/index.tsx` | ~100 | Dashboard screen (instrument-panel layout) |
| `src/app/alert.tsx` | ~70 | Emergency siren + CALL button |
| `src/app/settings.tsx` | ~90 | ESP32 address + emergency number config |
| `src/lib/useEspPoll.ts` | ~150 | 1 s poller + WebSocket client, backoff, offline watchdog |
| `src/lib/sensorSource.ts` | ~250 | Central sensor store, thresholds, activity log, history buffers |
| `src/lib/emergency.ts` + `useEmergencyWatch.ts` | ~60 | Auto-dial latch + episode tracking |
| `src/lib/permissions.ts` | ~70 | Android runtime permission dialogs |
| `scripts/esp32-sim.py` | ~75 | ESP32 simulator for app testing without hardware |

Libraries used (Arduino): WiFi, WebServer, WebSocketsServer (Markus Sattler "WebSockets"), DHT sensor library (Adafruit), LiquidCrystal_I2C, Wire. Libraries (app): expo-router, zustand, expo-secure-store, expo-linking, react-native-svg.

---

## 7. Demo Script (for the live presentation)

1. Show LCD booting: `SmartFlame → Starting WiFi → connected`
2. Show dashboard on laptop browser AND phone side by side — same values
3. `t` over serial → EMERGENCY: buzzer pattern changes, LCD updates, phone siren opens, dialer shows 711
4. `r` → system returns to SAFE; siren dismissable
5. Lighter test: unlit gas tap near MQ-2 → gas % climbs → WARNING at 30%
6. Unplug router → board starts `SmartFlame-ESP32` hotspot → phone connects → app still live (resilience story)

---

## 8. Notes for the AI writing the documentation

- Paper: **A4, portrait, 1-inch margins, Times New Roman or Arial 11 pt**
- Section order must be exactly: Cover Page → (optional TOC) → Project Overview → Study Area & Justification → Objectives and Proposed Solution → Block Diagram → Hardware Components (schematic + list) → Software Interface Mockups → Prototype Photos → Source Code → Conclusion → References
- Study area: fill in your actual barangay/community (the fact sheet intentionally leaves the specific site to the student)
- The block diagram should show: sensors → ESP32 → (a) LCD/buzzer locally, (b) WiFi → phone dashboard + emergency dialer; include the AP-fallback path
- Schematic: refer to the wiring table in §3.1 (MQ-2 AO→GPIO34 via divider, flame D0→GPIO27 active-LOW, DHT11→GPIO33, buzzer→GPIO25, LCD I2C 0x27→GPIO21/22)
- Code listings: the sketch is the primary artifact; include key excerpts (alert logic §3.2, `/api/status` contract §3.3) rather than all 977 lines
- Do **not** invent features not listed here (no cloud dashboard, no SMS gateway, no AI prediction) — the system is intentionally LAN-only for resilience
