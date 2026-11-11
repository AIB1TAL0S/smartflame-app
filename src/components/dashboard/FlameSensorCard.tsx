/** Flame sensor card with large, obvious YES/NO indicator. */

import { StyleSheet, Text, View } from "react-native";
import { useSensorSource } from "@/lib/sensorSource";
import { COLORS, Card, Chip } from "./ui";

export function FlameSensorCard() {
  const flame = useSensorSource((s) => s.flame);
  const color = flame ? COLORS.fire : COLORS.ok;

  return (
    <Card title="Flame Sensor" accentColor={color}>
      <View style={styles.body}>
        <Text style={[styles.indicator, { backgroundColor: flame ? COLORS.fire : COLORS.ok }]}>
          {flame ? "🔥 FLAME DETECTED" : "✓ NO FLAME"}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.label}>Detected:</Text>
          <Chip label={flame ? "YES" : "NO"} color={color} />
        </View>
        <Text style={styles.hint}>
          {flame ? "Immediate action required — evacuate area" : "Infrared flame scan is clear"}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10 },
  indicator: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
    borderRadius: 12,
    paddingVertical: 14,
    textAlign: "center",
    overflow: "hidden",
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { color: COLORS.muted, fontSize: 13, fontWeight: "600" },
  hint: { color: COLORS.faint, fontSize: 12 },
});
