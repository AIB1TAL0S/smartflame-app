/** Header: instrument-panel masthead — wordmark left, live clock + link state right. */

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSensorSource, AlertLevel } from "@/lib/sensorSource";
import { COLORS, StatusDot } from "./ui";

const ALERT_COLOR: Record<AlertLevel, string> = {
  SAFE: COLORS.ok,
  WARNING: COLORS.warn,
  CRITICAL: COLORS.fire,
  OFFLINE: COLORS.muted,
};

export function DashboardHeader() {
  const alert = useSensorSource((s) => s.alert);
  const hardware = useSensorSource((s) => s.hardware);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const online = hardware.controller && hardware.flameSensor && hardware.mq2Sensor && hardware.heatSensor;
  const linkColor = online ? ALERT_COLOR[alert] : COLORS.muted;
  const linkLabel = online
    ? alert === "CRITICAL"
      ? "ALERT ACTIVE"
      : "ALL SYSTEMS LINKED"
    : "LINK FAULT";

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <View style={styles.logoRow}>
          <View style={styles.mark}>
            <Text style={styles.markFlame}>F</Text>
            <View style={[styles.markTongue, { backgroundColor: ALERT_COLOR[alert] }]} />
          </View>
          <View>
            <Text style={styles.logo}>SMARTFLAME</Text>
            <Text style={styles.sub}>Fire Detection · Emergency Response</Text>
          </View>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.clock}>
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </Text>
        <Text style={styles.date}>
          {now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
        </Text>
        <Pressable onPress={() => router.push("/settings")} hitSlop={12} style={styles.gearBtn}>
          <Text style={styles.gear}>⚙</Text>
        </Pressable>
        <View style={[styles.linkPill, { borderColor: linkColor + "55" }]}>
          <StatusDot color={linkColor} pulse={alert === "CRITICAL"} />
          <Text style={[styles.linkText, { color: linkColor }]}>{linkLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  left: { gap: 2 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: COLORS.panelAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  markFlame: { color: COLORS.accent, fontSize: 18, fontWeight: "900", fontStyle: "italic" },
  markTongue: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  logo: { color: COLORS.text, fontSize: 18, fontWeight: "800", letterSpacing: 3 },
  sub: { color: COLORS.muted, fontSize: 11.5, letterSpacing: 0.4 },
  right: { flexDirection: "row", alignItems: "center", gap: 14 },
  clock: { color: COLORS.text, fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  date: { color: COLORS.muted, fontSize: 11.5, letterSpacing: 0.5, textTransform: "uppercase", marginTop: 2 },
  gearBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  gear: { color: COLORS.muted, fontSize: 20 },
  linkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  linkText: { fontSize: 11.5, fontWeight: "800", letterSpacing: 1.2 },
});
