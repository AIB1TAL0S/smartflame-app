/** Hero strip: one line, whole-system verdict. No icon theater. */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useSensorSource, timeAgo, AlertLevel, GAS_WARNING_THRESHOLD, TEMP_WARNING_THRESHOLD } from "@/lib/sensorSource";
import { COLORS, StatusDot } from "./ui";

const COPY: Record<AlertLevel, { title: string; detail: string }> = {
  SAFE: { title: "Environment nominal", detail: "No flame · gas and heat within limits" },
  WARNING: { title: "Hazard developing", detail: "A reading has crossed its warning threshold" },
  CRITICAL: { title: "FIRE EMERGENCY", detail: "Open the alert screen and evacuate the area" },
  OFFLINE: { title: "Waiting for hardware", detail: "No data from the controller yet" },
};

const GLYPH_BY_ALERT: Record<AlertLevel, string> = {
  SAFE: "✓",
  WARNING: "▲",
  CRITICAL: "■",
  OFFLINE: "✕",
};

export function SystemStatusCard() {
  const alert = useSensorSource((s) => s.alert);
  const gas = useSensorSource((s) => s.gasPercent);
  const temp = useSensorSource((s) => s.temperatureC);
  const flame = useSensorSource((s) => s.flame);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);

  // OFFLINE is communicated by the GlobalStatusBar + ConnectionCard —
  // showing a third "waiting for hardware" panel here would duplicate it.
  if (alert === "OFFLINE") return null;

  const color = alert === "SAFE" ? COLORS.ok : alert === "WARNING" ? COLORS.warn : alert === "CRITICAL" ? COLORS.fire : COLORS.muted;
  const copy = COPY[alert];

  const responsible: string[] = [];
  if (flame) responsible.push("flame");
  if (gas >= GAS_WARNING_THRESHOLD) responsible.push(`gas ${Math.round(gas)}%`);
  if (temp >= TEMP_WARNING_THRESHOLD) responsible.push(`heat ${Math.round(temp)}°C`);
  const cause = responsible.length ? `Trigger: ${responsible.join(" · ")}` : copy.detail;

  return (
    <View style={[styles.root, { borderLeftColor: color }]}>
      <StatusDot color={color} size={10} pulse={alert === "CRITICAL"} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.level, { color }]}>
          {GLYPH_BY_ALERT[alert]} {alert}
        </Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.detail}>{cause}</Text>
      </View>
      <View style={styles.rightCol}>
        <Text style={styles.updated}>{timeAgo(lastUpdate)}</Text>
        {alert === "CRITICAL" ? (
          <Pressable style={styles.alertBtn} onPress={() => router.push("/alert")}>
            <Text style={styles.alertBtnText}>OPEN ALERT</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: COLORS.panel,
    borderWidth: 1,
    borderLeftWidth: 3,
    borderColor: COLORS.hairline,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  level: { fontSize: 12, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: COLORS.text, fontSize: 19, fontWeight: "800", marginTop: 2 },
  detail: { color: COLORS.muted, fontSize: 12.5, marginTop: 2 },
  rightCol: { alignItems: "flex-end", gap: 8 },
  updated: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
  alertBtn: {
    backgroundColor: COLORS.fire,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alertBtnText: { color: "#fff", fontSize: 12, fontWeight: "900", letterSpacing: 1.2 },
});
