/** Humidity sensor card with linear gauge (DHT11), dry/wet warning zones. */

import { StyleSheet, Text, View } from "react-native";
import {
  useSensorSource,
  timeAgo,
  HUMIDITY_LOW_THRESHOLD,
  HUMIDITY_HIGH_THRESHOLD,
} from "@/lib/sensorSource";
import { COLORS, Card, Chip } from "./ui";

// gauge range 0–100 %RH
const MAX = 100;

function classify(hum: number) {
  if (hum < HUMIDITY_LOW_THRESHOLD) return { label: "DRY", color: COLORS.warn };
  if (hum > HUMIDITY_HIGH_THRESHOLD) return { label: "WET", color: COLORS.warn };
  return { label: "NORMAL", color: COLORS.ok };
}

export function HumiditySensorCard() {
  const humidity = useSensorSource((s) => s.humidity);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);
  const cls = classify(humidity);
  const pct = Math.min(100, Math.max(0, humidity));
  const lowPct = HUMIDITY_LOW_THRESHOLD;
  const highPct = HUMIDITY_HIGH_THRESHOLD;

  return (
    <Card title="Humidity Monitor" accentColor={cls.color}>
      <View style={styles.body}>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: cls.color }]}>{humidity.toFixed(1)}</Text>
          <Text style={styles.unit}>%RH</Text>
          <View style={{ flex: 1 }} />
          <Chip label={cls.label} color={cls.color} />
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%`, backgroundColor: cls.color }]} />
          <View style={[styles.marker, { left: `${lowPct}%` }]} />
          <View style={[styles.marker, { left: `${highPct}%` }]} />
        </View>
        <View style={styles.scaleRow}>
          <Text style={styles.scale}>0%</Text>
          <Text style={[styles.scale, { color: COLORS.warn }]}>{HUMIDITY_LOW_THRESHOLD}% dry</Text>
          <Text style={[styles.scale, { color: COLORS.warn }]}>{HUMIDITY_HIGH_THRESHOLD}% wet</Text>
          <Text style={styles.scale}>{MAX}%</Text>
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