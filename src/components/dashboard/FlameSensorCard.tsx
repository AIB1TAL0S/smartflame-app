/** Flame — binary state shown as a bold icon + verdict line, never color alone. */

import { StyleSheet, Text, View } from "react-native";
import { useSensorSource, useOffline, timeAgo } from "@/lib/sensorSource";
import { COLORS, Panel } from "./ui";

const ICON = {
  fire: "🔥",
  ok: "✔",
  unknown: "❓",
} as const;

export function FlameSensorCard({ style }: { style?: object | null }) {
  const flame = useSensorSource((s) => s.flame);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);
  const offline = useOffline();
  // Offline: the last "NO FLAME" is not evidence — show neutral UNKNOWN.
  const verdict = offline ? "UNKNOWN" : flame ? "FLAME DETECTED" : "NO FLAME";
  const icon = offline ? ICON.unknown : flame ? ICON.fire : ICON.ok;
  const color = offline ? COLORS.muted : flame ? COLORS.fire : COLORS.ok;

  return (
    <Panel title="Flame · IR scan" right={<Text style={[styles.headIcon, { color }]}>{icon}</Text>} style={[style, offline ? styles.stale : null]}>
      <View style={styles.verdictRow} accessibilityLiveRegion="polite" accessibilityLabel={`Flame status: ${verdict}`}>
        <Text style={[styles.icon, { color }]}>{icon}</Text>
        <Text style={[styles.verdict, { color }]}>{verdict}</Text>
      </View>
      <View style={styles.foot}>
        <Text style={styles.hint}>
          {offline ? "Last known state — controller unreachable" : flame ? "Immediate action required" : "Infrared scan clear"}
        </Text>
        <Text style={styles.updated}>{offline ? "stale" : timeAgo(lastUpdate)}</Text>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  stale: { opacity: 0.45 },
  verdictRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  icon: { fontSize: 30, fontWeight: "900" },
  verdict: { fontSize: 24, fontWeight: "900", letterSpacing: 1.5 },
  headIcon: { fontSize: 16, fontWeight: "900" },
  foot: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  hint: { color: COLORS.muted, fontSize: 12, flex: 1, paddingRight: 8 },
  updated: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
});
