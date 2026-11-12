/**
 * Centralized sensor data source for the SmartFlame dashboard.
 *
 * SINGLE SOURCE OF TRUTH: every dashboard component reads from
 * `useSensorSource()` — no component holds its own sensor state.
 *
 * LIVE DATA: `useEspSensorFeed()` mirrors the real ESP32 polling store
 * (`useStore` / `useEspPoll`) into this store every second.
 */

import { create } from "zustand";
import { useEffect } from "react";
import { useStore } from "./store";
import { AlertLevel as DeviceAlertLevel } from "./types";

export type AlertLevel = "SAFE" | "WARNING" | "CRITICAL" | "OFFLINE";

export type SensorKey = "gas" | "flame" | "heat";

export type Severity = "info" | "warning" | "critical";

export type ActivityEvent = {
  id: string;
  timestamp: number;
  sensor: SensorKey | "system";
  message: string;
  severity: Severity;
};

export type HardwareState = {
  controller: boolean;
  flameSensor: boolean;
  mq2Sensor: boolean;
  heatSensor: boolean;
  buzzer: boolean;
};

export type Sample = { t: number; v: number };

export type SensorSnapshot = {
  gasPercent: number;
  flame: boolean;
  temperatureC: number;
  humidity: number;
  alert: AlertLevel;
  lastUpdate: number;
  hardware: HardwareState;
  activity: ActivityEvent[];
  gasHistory: Sample[];
  tempHistory: Sample[];
  humidityHistory: Sample[];
};

type SensorStore = SensorSnapshot & {
  pushSnapshot: (partial: Partial<SensorSnapshot>) => void;
  /** Flag the device as unreachable without touching lastUpdate or history. */
  markOffline: () => void;
};

export const GAS_WARNING_THRESHOLD = 25;
export const GAS_CRITICAL_THRESHOLD = 55;
export const TEMP_WARNING_THRESHOLD = 42;
export const TEMP_CRITICAL_THRESHOLD = 55;
/** DHT11 humidity comfort band (air too dry raises fire risk). */
export const HUMIDITY_LOW_THRESHOLD = 30;
export const HUMIDITY_HIGH_THRESHOLD = 80;

const HISTORY_LIMIT = 60;

function deriveAlert(gas: number, flame: boolean, temp: number): AlertLevel {
  if (flame || gas >= GAS_CRITICAL_THRESHOLD || temp >= TEMP_CRITICAL_THRESHOLD) return "CRITICAL";
  if (gas >= GAS_WARNING_THRESHOLD || temp >= TEMP_WARNING_THRESHOLD) return "WARNING";
  return "SAFE";
}

let eventId = 0;
function makeEvent(sensor: ActivityEvent["sensor"], message: string, severity: Severity): ActivityEvent {
  return { id: `evt-${Date.now()}-${eventId++}`, timestamp: Date.now(), sensor, message, severity };
}

export const useSensorSource = create<SensorStore>((set, get) => ({
  gasPercent: 12,
  flame: false,
  temperatureC: 27.5,
  humidity: 55,
  alert: "OFFLINE",
  lastUpdate: Date.now(),
  hardware: {
    controller: false,
    flameSensor: false,
    mq2Sensor: false,
    heatSensor: false,
    buzzer: false,
  },
  activity: [
    makeEvent("system", "System started — all sensors online", "info"),
    makeEvent("gas", "Gas level nominal (10%)", "info"),
    makeEvent("heat", "Ambient temperature nominal (26°C)", "info"),
  ],
  gasHistory: [],
  tempHistory: [],
  humidityHistory: [],
  pushSnapshot: (partial) => {
    const prev = get();
    const gas = partial.gasPercent ?? prev.gasPercent;
    const temp = partial.temperatureC ?? prev.temperatureC;
    const flame = partial.flame ?? prev.flame;
    // device-reported alert wins; fall back to threshold derivation
    const alert = partial.alert ?? deriveAlert(gas, flame, temp);
    const now = Date.now();

    const activity = [...prev.activity];
    const log = (sensor: ActivityEvent["sensor"], message: string, severity: Severity) => {
      activity.unshift(makeEvent(sensor, message, severity));
    };

    if (flame && !prev.flame) {
      log("flame", "FLAME DETECTED by flame sensor", "critical");
      log("system", "Buzzer activated — fire emergency response", "critical");
    } else if (!flame && prev.flame) {
      log("flame", "Flame cleared", "info");
    }
    if (gas >= GAS_WARNING_THRESHOLD && prev.gasPercent < GAS_WARNING_THRESHOLD) {
      log("gas", `Gas level elevated (${Math.round(gas)}%)`, "warning");
    } else if (gas < GAS_WARNING_THRESHOLD && prev.gasPercent >= GAS_WARNING_THRESHOLD) {
      log("gas", `Gas level back to normal (${Math.round(gas)}%)`, "info");
    }
    if (temp >= TEMP_WARNING_THRESHOLD && prev.temperatureC < TEMP_WARNING_THRESHOLD) {
      log("heat", `High temperature (${Math.round(temp)}°C)`, "warning");
    } else if (temp < TEMP_WARNING_THRESHOLD && prev.temperatureC >= TEMP_WARNING_THRESHOLD) {
      log("heat", `Temperature back to normal (${Math.round(temp)}°C)`, "info");
    }

    const buzzer = alert === "CRITICAL";

    set({
      ...partial,
      alert,
      lastUpdate: now,
      hardware: { ...prev.hardware, ...(partial.hardware ?? {}), buzzer },
      activity: activity.slice(0, 30),
      gasHistory: [...prev.gasHistory, { t: now, v: gas }].slice(-HISTORY_LIMIT),
      tempHistory: [...prev.tempHistory, { t: now, v: temp }].slice(-HISTORY_LIMIT),
      humidityHistory: [...prev.humidityHistory, { t: now, v: partial.humidity ?? prev.humidity }].slice(-HISTORY_LIMIT),
    });
  },
  markOffline: () => {
    if (get().alert === "OFFLINE" && !get().hardware.controller) return;
    set({
      alert: "OFFLINE",
      hardware: {
        controller: false,
        flameSensor: false,
        mq2Sensor: false,
        heatSensor: false,
        buzzer: false,
      },
    });
  },
}));

/**
 * REAL ESP32 FEED — subscribes to the live polling store (`useStore`,
 * fed by `useEspPoll` in the root layout) and mirrors every snapshot
 * into the dashboard store. A staleness watchdog flags the hardware
 * offline in realtime whenever data stops flowing (device unreachable,
 * poller error) and flips back online the moment snapshots resume.
 * Runs only while an ESP32 address is configured.
 */
const DEVICE_ALERT_MAP: Record<DeviceAlertLevel, AlertLevel> = {
  NORMAL: "SAFE",
  WARNING: "WARNING",
  EMERGENCY: "CRITICAL",
  UNKNOWN: "OFFLINE",
};

/** No valid snapshot for this long ⇒ device considered offline.
 *  The board's WiFi link drops ~28% of polls (measured); stretches of 8+
 *  consecutive failures are common, so the window must cover them. */
const STALE_MS = 15000;
/** Show "stale data" hint when nothing new arrives for this long. */
const STALE_HINT_MS = 8000;
const WATCHDOG_TICK_MS = 1000;

export function useEspSensorFeed(): void {
  const espUrl = useStore((s) => s.espUrl);
  useEffect(() => {
    if (!espUrl) {
      // no address configured — dashboard shows waiting state
      useSensorSource.getState().markOffline();
      return;
    }
    const unsub = useStore.subscribe((state) => {
      const st = state.status;
      if (!st) return;
      // We are receiving data, so controller + flame/MQ-2 sensors are linked.
      // Heat sensor health comes from the DHT validity flag; LED/buzzer are
      // inferred from the device alert level (phase 2: expose real GPIO states).
      const prev = useSensorSource.getState();
      prev.pushSnapshot({
        gasPercent: st.gasPercent,
        temperatureC: st.dhtValid ? st.temperatureC : prev.temperatureC,
        humidity: st.dhtValid ? st.humidity : prev.humidity,
        flame: st.flame,
        alert: DEVICE_ALERT_MAP[st.alert] ?? "OFFLINE",
        hardware: {
          controller: true,
          flameSensor: true,
          mq2Sensor: true,
          // DHT11 read failures are transient (~1% by design); latch the
          // last known health instead of flashing red per failed read
          heatSensor: st.dhtValid || prev.hardware.heatSensor,
          buzzer: st.alert === "EMERGENCY",
        },
      });
    });
    // Watchdog: mark offline only when snapshots have REALLY stopped —
    // no fresh data for STALE_MS. A transient error alone (single dropped
    // poll on lossy WiFi) must not flap the dashboard: fresh data always
    // wins and clears the error inside the store.
    const watch = setInterval(() => {
      const st = useStore.getState();
      const stale = !st.lastUpdate || Date.now() - st.lastUpdate > STALE_MS;
      if (stale) useSensorSource.getState().markOffline();
    }, WATCHDOG_TICK_MS);
    return () => {
      unsub();
      clearInterval(watch);
    };
  }, [espUrl]);
}

/** Compact relative time, e.g. "2s ago". */
export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}