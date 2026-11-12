/**
 * Global status bar — one clear system state, always visible at the top.
 *
 * Maps the dashboard AlertLevel onto the public-facing states:
 *   SAFE → NORMAL, WARNING → WARNING, CRITICAL → ALARM, OFFLINE → OFFLINE.
 *
 * ALARM is intentionally loud: large high-contrast red band, subtle pulse,
 * and a prominent "Silence buzzer" action (UI placeholder — the firmware
 * currently exposes no mute endpoint, see the TODO in the handler).
 */

import { Pressable, StyleSheet, Text, View, Animated, Easing } from "react-native";
import { useEffect, useMemo } from "react";
import { useSensorSource, AlertLevel } from "@/lib/sensorSource";
import { COLORS } from "./ui";

export type GlobalState = "NORMAL" | "WARNING" | "ALARM" | "OFFLINE";

function toGlobalState(alert: AlertLevel): GlobalState {
  switch (alert) {
    case "SAFE":
      return "NORMAL";
    case "WARNING":
      return "WARNING";
    case "CRITICAL":
      return "ALARM";
    default:
      return "OFFLINE";
  }
}

const STATE_STYLE: Record<
  GlobalState,
  { label: string; glyph: string; color: string; bg: string; border: string; text: string }
> = {
  NORMAL: {
    label: "NORMAL",
    glyph: "✓",
    color: COLORS.ok,
    bg: COLORS.ok + "14",
    border: COLORS.ok + "40",
    text: COLORS.ok,
  },
  WARNING: {
    label: "WARNING",
    glyph: "▲",
    color: COLORS.warn,
    bg: COLORS.warn + "14",
    border: COLORS.warn + "40",
    text: COLORS.warn,
  },
  ALARM: {
    label: "ALARM",
    glyph: "■",
    color: "#FFFFFF",
    bg: COLORS.fire,
    border: COLORS.fire,
    text: "#FFFFFF",
  },
  OFFLINE: {
    label: "OFFLINE",
    glyph: "✕",
    color: COLORS.muted,
    bg: COLORS.panelAlt,
    border: COLORS.border,
    text: COLORS.muted,
  },
};

/**
 * Placeholder for the buzzer-mute action. There is no mute handler or
 * firmware endpoint yet (`/api/status` is read-only), so this only logs.
 * TODO: wire to `POST /api/buzzer/mute` once firmware exposes it.
 */
function silenceBuzzer() {
  console.log("[GlobalStatusBar] Silence buzzer requested — no mute handler wired yet");
}

export function GlobalStatusBar() {
  const alert = useSensorSource((s) => s.alert);
  const state = toGlobalState(alert);
  const s = STATE_STYLE[state];
  const isAlarm = state === "ALARM";

  // Subtle pulse on ALARM: gentle opacity breathing, stops on unmount/clear.
  const pulse = useMemo(() => new Animated.Value(1), []);
  useEffect(() => {
    if (!isAlarm) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.72, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isAlarm, pulse]);

  return (
    <Animated.View
      accessibilityRole="header"
      accessibilityLabel={`System status: ${s.label}`}
      style={[styles.bar, { backgroundColor: s.bg, borderColor: s.border }, isAlarm && styles.alarmBar]}
    >
      {isAlarm ? (
        <Animated.View style={[styles.root, { opacity: pulse }]}>
          <Text style={[styles.label, styles.alarmLabel, { color: s.text }]}>
            {s.glyph} {s.label}
          </Text>
          <Text style={styles.alarmDetail}>Fire emergency detected — buzzer sounding</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Silence buzzer"
            style={styles.silenceBtn}
            onPress={silenceBuzzer}
          >
            <Text style={styles.silenceText}>🔇 SILENCE BUZZER</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <View style={styles.root}>
          <Text style={[styles.label, { color: s.text }]}>
            {s.glyph} {s.label}
          </Text>
          {state === "OFFLINE" ? <Text style={styles.detail}>Waiting for controller data…</Text> : null}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  alarmBar: {
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: COLORS.fire,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  root: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
  },
  alarmLabel: {
    fontSize: 26,
    letterSpacing: 4,
  },
  detail: { color: COLORS.muted, fontSize: 12.5, flex: 1 },
  alarmDetail: {
    color: "#FFD9D2",
    fontSize: 13.5,
    fontWeight: "700",
    flex: 1,
    minWidth: 120,
  },
  silenceBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  silenceText: {
    color: COLORS.fire,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
});