# SmartFlame — Presentation Pitch Deck Content

> **Purpose:** Slide-by-slide content for your final presentation deck (PowerPoint/Canva/Google Slides). Each slide = one slide. Copy the headline, body bullets, and speaker notes directly. Designed for a 8–12 minute demo presentation.
>
> **Design tip:** Use a dark background (#111210), phosphor-green (#7BD88F) for "safe", ember-amber (#E8A33D) for "warning", alarm red-orange (#FF5A44) for "fire" — matching the app itself. Big numbers, few words, one idea per slide.

---

## Slide 1 — Title

**SMARTFLAME**
*An IoT-Enabled Fire Detection and Mobile Emergency Response System*

- Team members (your names)
- Course / Section / Date
- One line at the bottom: **"Detect. Alert. Respond. — even when nobody's watching."**

**Speaker notes:** Introduce the team in one sentence each. Say the title out loud — it carries the whole pitch: fire detection + mobile + emergency response.

---

## Slide 2 — The Problem

**Fires don't wait for someone to notice.**

- Most residential fires start **unattended** — kitchens, charging appliances, storage rooms
- Traditional smoke alarms only make **local noise** — useless when nobody's home or awake
- By the time a neighbor sees smoke, the fire has spread — **emergency services are called late**
- Gas leaks (LPG) from stoves and tanks are a silent precursor to many of these fires

**Speaker notes:** Open with a question: "How many of you have a smoke alarm at home? Now — how many of you have LEFT home with something cooking?" Pause. That gap is the problem.

---

## Slide 3 — The Community Need (Study Area)

**[FILL IN: your actual barangay / community]**

- Describe the specific site: dense housing / mixed commercial-residential / shared kitchens
- Why this area: [aging electrical wiring, LPG use in tight spaces, no nearby fire station, delayed response times]
- Who benefits: [N households / N small shops / residents + responders]

**Speaker notes:** This slide must be LOCAL and specific — a real street or building type. One photo of the area if possible. Judges score this; vagueness loses points.

---

## Slide 4 — Our Solution

**SMARTFLAME — a fire watchdog that calls for help.**

Three things it does the moment danger appears:

1. 🔊 **Local alarm** — buzzer pattern escalates: warning → emergency
2. 📱 **Remote alert** — live dashboard on any phone, full-screen siren + notification
3. 📞 **Auto-dial** — phone automatically opens the dialer to the emergency number (711)

**Speaker notes:** Emphasize the chain: sense → alarm → notify → call. The user's only job is to tap "call" — the system already did the rest.

---

## Slide 5 — How It Works (Block Diagram)

Use the simplified diagram — redraw cleanly in draw.io/PowerPoint shapes:

```
SENSORS                    BRAIN                 OUTPUTS
MQ-2 gas ──────┐
Flame (IR) ────┤──> ESP32 ──WiFi──> 📱 Expo app
DHT11 temp ────┤    │  │              (dashboard + siren
Buzzer <───────┘    │  │               + auto-dial 711)
LCD 16x2 <──────────┘  │
                       └── Web server :80/81
                           + AP fallback hotspot
```

- **No cloud. No internet needed.** Works on any local WiFi — or its own hotspot if the router dies
- Response time: sensor → phone in **under 1 second**

**Speaker notes:** This is your IoT architecture moment. Name the layers: sensing layer, processing layer, network layer, application layer. The AP fallback is your resilience answer — say it before they ask.

---

## Slide 6 — Hardware (the prototype is real)

| Component | Function |
|---|---|
| ESP32 DevKit | WiFi microcontroller + web server |
| MQ-2 | Gas & smoke concentration (analog) |
| Flame sensor (IR) | Direct flame detection (digital) |
| DHT11 | Temperature + humidity |
| Active buzzer | Two-tone alarm (warning/emergency patterns) |
| 16×2 LCD (I2C) | Standalone status — works with zero phones |

**Real prototype — not a simulation.** Show the breadboard photo here.

**Speaker notes:** Point at the photo: every wire here was placed deliberately. GPIO 34 was chosen because it's ADC1 — ADC2 dies when WiFi is on, a mistake many IoT builds make.

---

## Slide 7 — Firmware Intelligence (it decides, not just reads)

- Sensor fusion: gas % + flame + temperature → single alert level
- **Debounced decisions** (3 samples) — no false alarms from a single glitch
- Two-tier thresholds:
  - ⚠️ **WARNING** — gas ≥ 30% or temp ≥ 45°C
  - 🔥 **EMERGENCY** — flame detected, or gas ≥ 60%, or temp ≥ 60°C
- Escalating buzzer: slow beep (warning) → fast wail (emergency)
- MQ-2 auto-calibration: clean-air baseline → smoke percentage

**Speaker notes:** This slide proves it's *smart*, not just wired. The debounce logic answers the inevitable "what about false alarms?" question before it's asked.

---

## Slide 8 — The Mobile App (Software Component)

Screens (from the actual build):

1. **Dashboard** — live gas dial, flame verdict, temp + humidity gauges, event log, real-time traces
2. **Alert screen** — full-screen siren, CALL 711 button, mute control
3. **Settings** — controller address, emergency number, permission re-check

- Works in any browser (ESP32 serves its own web dashboard too)
- Real-time: WebSocket push up to **4 updates/second**, HTTP fallback at 1/s

**Speaker notes:** Show screenshots — or better, show the LIVE app next to the hardware. If the demo gods allow, live > screenshots every time.

---

## Slide 9 — Emergency Response Flow

```
Flame detected
  ↓ (600ms debounce)
EMERGENCY declared — buzzer wails
  ↓
V2 pushed to phone → full-screen siren
  ↓
Notification banner: "🔥 FIRE EMERGENCY"
  ↓
Dialer opens pre-filled → 711 → user taps CALL
```

- Once per episode — **no spam, no pocket-dial** (re-arms when safe)
- User confirms the call — deliberate safety design, not a limitation

**Speaker notes:** Pre-empt the "why doesn't it just call automatically?" question: Android/iOS block silent dialing by design — pocket-dials to emergency numbers are dangerous. One tap is the industry-standard compromise.

---

## Slide 10 — Live Demonstration

**The moment:** lighter near the sensor →

1. LCD: `EMERGENCY` + fast buzzer
2. Phone: full-screen siren opens automatically
3. Notification banner appears
4. Dialer: 711 pre-filled
5. Remove flame → all clear, system re-arms

Backup plan (if WiFi misbehaves): serial `t` command forces the same EMERGENCY state; AP hotspot mode shows the app works even without a router.

**Speaker notes:** Rehearse this 3×. Have the serial monitor visible on a second screen — it proves the detection is real-time. Have a backup video recording of the demo.

---

## Slide 11 — Why This Design (resilience)

| Scenario | SmartFlame still works? |
|---|---|
| Internet outage | ✅ fully — LAN only by design |
| Router dies | ✅ ESP32 becomes its own WiFi hotspot |
| No phone nearby | ✅ LCD + buzzer alarm locally |
| Power flicker | ✅ auto-reconnects WiFi + cloud-free means instant recovery |

**Design principle: the system that warns you about a fire shouldn't depend on the infrastructure a fire might take down.**

**Speaker notes:** This is your strongest engineering slide. Local-first IoT for life safety is a defensible architecture — say it with confidence.

---

## Slide 12 — Limitations & Future Work (be honest, briefly)

**Current limits:**
- Phone and controller must share a network (LAN range)
- MQ-2 needs burn-in time for accurate baselines
- Auto-dial requires one tap (platform security)

**Next steps:**
- GSM module (SIM800L) → SMS + true auto-call, no WiFi needed at all
- Cloud bridge (optional) → alerts away from home
- Multiple sensor nodes → whole-building mesh coverage
- Rechargeable battery backup → protection during power outages

**Speaker notes:** Judges LOVE honest limitations followed by a roadmap — it shows engineering maturity. The GSM module is the natural "version 2" answer.

---

## Slide 13 — Conclusion

**SmartFlame proves that life-safety IoT doesn't need the cloud to save lives.**

- ✅ Working hardware prototype — real sensors, real alarms, real response
- ✅ Complete mobile app — dashboard, siren, emergency dialing
- ✅ Resilient by design — works when internet doesn't
- ✅ Built for a real community need — unattended fire risk

*The best fire response is the one that starts before you know there's a fire.*

---

## Slide 14 — References

- Espressif ESP32 Documentation — docs.espressif.com
- Blynk & MQTT architecture reference — JuanLiz/smart-parking-mqtt (pattern inspiration)
- MQ-2 Sensor Datasheet — Hanwei Electronics
- DHT11 Datasheet — Aosong Electronics
- Expo Documentation — docs.expo.dev
- React Native Documentation — reactnative.dev
- Bureau of Fire Protection (Philippines) — fire response statistics

*(Adjust references to your actual citation format.)*

---

## Presentation Logistics Checklist

- [ ] Charge laptop + phone; bring power bank
- [ ] Phone + ESP32 on the same hotspot/SSIDs tested **at the venue** if possible
- [ ] Backup: screen-recorded video of the full demo (sensor → siren → dialer)
- [ ] Backup: serial `t` test needs USB connected — or pre-record it
- [ ] Lighter + somewhere safe to use it (check venue rules; gas tap works too)
- [ ] APK pre-installed on the demo phone, settings pre-filled with venue IP
- [ ] Second device (web dashboard) already open as fallback

---

## Timing Guide (10-minute slot)

| Section | Time |
|---|---|
| Slides 1–4 (problem + solution) | 2.5 min |
| Slide 5 (architecture) | 1 min |
| Slides 6–8 (hardware + firmware + app) | 2.5 min |
| **Slide 10 (LIVE DEMO)** | **3 min** |
| Slides 11–13 (resilience + limits + conclusion) | 1.5 min |

The demo is 30% of your time — it's the highest-scoring section. Protect it.
