/** Humidity — folded into the twin Heat·Humidity panel; kept as a thin
 *  standalone readout for layout flexibility (used under the hero on mobile). */

import { StyleSheet, Text, View } from "react-native";
import { useSensorSource, timeAgo, HUMIDITY_LOW_THRESHOLD, HUMIDITY_HIGH_THRESHOLD } from "@/lib/sensorSource";
import { COLORS, Panel, Chip } from "./ui";

function classify(hum: number) {
  if (hum < HUMIDITY_LOW_THRESHOLD) return { label: "DRY · RISK", color: COLORS.warn };
  if (hum > HUMIDITY_HIGH_THRESHOLD) return { label: "SATURATED", color: COLORS.accent };
  return { label: "NORMAL", color: COLORS.ok };
}

export function HumiditySensorCard() {
  const humidity = useSensorSource((s) => s.humidity);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);
  const cls = classify(humidity);

  return (
    <Panel title="Humidity · RH" right={<Chip label={cls.label} color={cls.color} />}>
      <View style={styles.row}>
        <Text style={[styles.value, { color: COLORS.text }]}>{Math.round(humidity)}</Text>
        <Text style={styles.unit}>% RH</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.hint}>comfort {HUMIDITY_LOW_THRESHOLD}–{HUMIDITY_HIGH_THRESHOLD}%</Text>
        <Text style={styles.updated}>{timeAgo(lastUpdate)}</Text>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  value: { fontSize: 30, fontWeight: "800", fontVariant: ["tabular-nums"] },
  unit: { color: COLORS.muted, fontSize: 13, fontWeight: "600" },
  hint: { color: COLORS.muted, fontSize: 12 },
  updated: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"], marginLeft: 8 },
});
