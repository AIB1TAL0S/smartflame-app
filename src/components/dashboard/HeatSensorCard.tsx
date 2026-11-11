/** Heat sensor card with linear temperature gauge and warning/critical zones. */

import { StyleSheet, Text, View } from "react-native";
import {
  useSensorSource,
  timeAgo,
  TEMP_WARNING_THRESHOLD,
  TEMP_CRITICAL_THRESHOLD,
} from "@/lib/sensorSource";
import { COLORS, Card, Chip } from "./ui";

// gauge range 0–80 °C
const MAX = 80;

function classify(temp: number) {
  if (temp >= TEMP_CRITICAL_THRESHOLD) return { label: "CRITICAL", color: COLORS.fire };
  if (temp >= TEMP_WARNING_THRESHOLD) return { label: "WARNING", color: COLORS.warn };
  return { label: "NORMAL", color: COLORS.ok };
}

export function HeatSensorCard() {
  const temp = useSensorSource((s) => s.temperatureC);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);
  const cls = classify(temp);
  const pct = Math.min(100, Math.max(0, (temp / MAX) * 100));
  const warnPct = (TEMP_WARNING_THRESHOLD / MAX) * 100;
  const critPct = (TEMP_CRITICAL_THRESHOLD / MAX) * 100;

  return (
    <Card title="Heat Sensor" accentColor={cls.color}>
      <View style={styles.body}>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: cls.color }]}>{temp.toFixed(1)}</Text>
          <Text style={styles.unit}>°C</Text>
          <View style={{ flex: 1 }} />
          <Chip label={cls.label} color={cls.color} />
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: cls.color }]} />
          <View style={[styles.marker, { left: `${warnPct}%` }]} />
          <View style={[styles.marker, { left: `${critPct}%`, backgroundColor: COLORS.fire }]} />
        </View>
        <View style={styles.scaleRow}>
          <Text style={styles.scale}>0°</Text>
          <Text style={[styles.scale, { color: COLORS.warn }]}>{TEMP_WARNING_THRESHOLD}° warn</Text>
          <Text style={[styles.scale, { color: COLORS.fire }]}>{TEMP_CRITICAL_THRESHOLD}° crit</Text>
          <Text style={styles.scale}>{MAX}°</Text>
        </View>

        <Text style={styles.updated}>Updated {timeAgo(lastUpdate)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: 8 },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  value: { fontSize: 34, fontWeight: "900", fontVariant: ["tabular-nums"] },
  unit: { color: COLORS.muted, fontSize: 15, fontWeight: "700" },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.cardAlt,
    overflow: "visible",
    position: "relative",
  },
  fill: { height: 10, borderRadius: 5 },
  marker: { position: "absolute", top: -3, width: 2, height: 16, backgroundColor: COLORS.warn, borderRadius: 1 },
  scaleRow: { flexDirection: "row", justifyContent: "space-between" },
  scale: { color: COLORS.faint, fontSize: 10 },
  updated: { color: COLORS.muted, fontSize: 11, fontVariant: ["tabular-nums"], marginTop: 2 },
});
