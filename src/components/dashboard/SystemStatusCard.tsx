/** Prominent overall safety status: SAFE / WARNING / CRITICAL. */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSensorSource, timeAgo, AlertLevel, GAS_WARNING_THRESHOLD, TEMP_WARNING_THRESHOLD } from "@/lib/sensorSource";
import { COLORS, StatusDot } from "./ui";

const COPY: Record<AlertLevel, { icon: string; title: string; bg: string }> = {
  SAFE: { icon: "🛡", title: "Your Environment Is Safe", bg: COLORS.ok + "1A" },
  WARNING: { icon: "⚠️", title: "Potential Hazard Detected", bg: COLORS.warn + "1A" },
  CRITICAL: { icon: "🔥", title: "FIRE EMERGENCY DETECTED", bg: COLORS.fire + "1A" },
  OFFLINE: { icon: "❔", title: "Waiting for sensor data…", bg: COLORS.faint + "1A" },
};

export function SystemStatusCard() {
  const alert = useSensorSource((s) => s.alert);
  const gas = useSensorSource((s) => s.gasPercent);
  const temp = useSensorSource((s) => s.temperatureC);
  const flame = useSensorSource((s) => s.flame);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);

  const copy = COPY[alert];
  const color = alert === "SAFE" ? COLORS.ok : alert === "WARNING" ? COLORS.warn : alert === "CRITICAL" ? COLORS.fire : COLORS.muted;

  const responsible: string[] = [];
  if (flame) responsible.push("Flame sensor");
  if (gas >= GAS_WARNING_THRESHOLD) responsible.push(`Gas sensor (${Math.round(gas)}%)`);
  if (temp >= TEMP_WARNING_THRESHOLD) responsible.push(`Heat sensor (${Math.round(temp)}°C)`);

  return (
    <View style={[styles.root, { borderColor: color, backgroundColor: copy.bg }]}>
      <View style={styles.topRow}>
        <StatusDot color={color} size={14} />
        <Text style={[styles.level, { color }]}>{alert}</Text>
        <Text style={styles.updated}>updated {timeAgo(lastUpdate)}</Text>
      </View>

      <Text style={[styles.icon, alert === "CRITICAL" && styles.iconBig]}>{copy.icon}</Text>
      <Text style={[styles.title, { color }]}>{copy.title}</Text>

      {alert === "WARNING" && responsible.length > 0 ? (
        <Text style={styles.source}>Source: {responsible.join(" · ")}</Text>
      ) : null}

      {alert === "CRITICAL" ? (
        <>
          {responsible.length > 0 ? <Text style={styles.source}>{responsible.join(" · ")}</Text> : null}
          <Pressable style={styles.emergencyBtn} onPress={() => router.push("/alert")}>
            <Text style={styles.emergencyText}>🚨 EMERGENCY RESPONSE</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 18,
    alignItems: "center",
    gap: 6,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch", justifyContent: "center" },
  level: { fontSize: 13, fontWeight: "900", letterSpacing: 2 },
  updated: { color: COLORS.faint, fontSize: 11, marginLeft: 6, fontVariant: ["tabular-nums"] },
  icon: { fontSize: 34, marginTop: 4 },
  iconBig: { fontSize: 44 },
  title: { fontSize: 20, fontWeight: "900", textAlign: "center" },
  source: { color: COLORS.muted, fontSize: 13, fontWeight: "600", marginTop: 2 },
  emergencyBtn: {
    backgroundColor: COLORS.fire,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 10,
  },
  emergencyText: { color: "#fff", fontWeight: "900", fontSize: 16, letterSpacing: 1 },
});
