/** Header: logo, greeting, live date/time, hardware connection status. */

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSensorSource, AlertLevel } from "@/lib/sensorSource";
import { COLORS } from "./ui";

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
      ? "LINKED · ALERT ACTIVE"
      : "LINKED"
    : "HARDWARE FAULT";

  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <View style={styles.logoRow}>
          <Text style={styles.logoIcon}>🔥</Text>
          <Text style={styles.logo}>SmartFlame</Text>
        </View>
        <Text style={styles.greeting}>Smart Safety Monitoring</Text>
        <Text style={styles.dateTime}>
          {now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          {" · "}
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </Text>
      </View>
      <View style={styles.right}>
        <Pressable onPress={() => router.push("/settings")} hitSlop={12} style={styles.gearBtn}>
          <Text style={styles.gear}>⚙︎</Text>
        </Pressable>
        <View style={[styles.linkPill, { borderColor: linkColor, backgroundColor: linkColor + "1A" }]}>
          <View style={[styles.dot, { backgroundColor: linkColor }]} />
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
    alignItems: "flex-start",
    gap: 12,
  },
  left: { flex: 1, gap: 3 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoIcon: { fontSize: 22 },
  logo: { color: COLORS.text, fontSize: 26, fontWeight: "900", letterSpacing: 0.5 },
  greeting: { color: COLORS.muted, fontSize: 14, fontWeight: "600" },
  dateTime: { color: COLORS.faint, fontSize: 12, fontVariant: ["tabular-nums"] },
  right: { alignItems: "flex-end", gap: 8 },
  gearBtn: { padding: 4 },
  gear: { color: COLORS.muted, fontSize: 22 },
  linkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  linkText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
});
