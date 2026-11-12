/** Flame — binary state shown as a bold verdict line, not a pill. */

import { StyleSheet, Text, View } from "react-native";
import { useSensorSource, timeAgo } from "@/lib/sensorSource";
import { COLORS, Panel, StatusDot } from "./ui";

export function FlameSensorCard() {
  const flame = useSensorSource((s) => s.flame);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);
  const color = flame ? COLORS.fire : COLORS.ok;

  return (
    <Panel title="Flame · IR scan" right={<StatusDot color={color} pulse={flame} />}>
      <Text style={[styles.verdict, { color }]}>{flame ? "FLAME DETECTED" : "NO FLAME"}</Text>
      <View style={styles.foot}>
        <Text style={styles.hint}>{flame ? "Immediate action required" : "Infrared scan clear"}</Text>
        <Text style={styles.updated}>{timeAgo(lastUpdate)}</Text>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  verdict: { fontSize: 24, fontWeight: "900", letterSpacing: 1.5 },
  foot: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  hint: { color: COLORS.muted, fontSize: 12, flex: 1, paddingRight: 8 },
  updated: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
});
