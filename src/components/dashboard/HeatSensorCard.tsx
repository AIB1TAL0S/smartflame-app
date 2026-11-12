/** Heat + Humidity — twin linear gauges with threshold ticks (11px labels). */

import { StyleSheet, Text, View } from "react-native";
import {
  useSensorSource,
  timeAgo,
  TEMP_WARNING_THRESHOLD,
  TEMP_CRITICAL_THRESHOLD,
  HUMIDITY_LOW_THRESHOLD,
  HUMIDITY_HIGH_THRESHOLD,
} from "@/lib/sensorSource";
import { COLORS, Panel, Chip } from "./ui";

const TEMP_MAX = 80;

function classifyTemp(temp: number) {
  if (temp >= TEMP_CRITICAL_THRESHOLD) return { label: "CRITICAL", color: COLORS.fire };
  if (temp >= TEMP_WARNING_THRESHOLD) return { label: "WARNING", color: COLORS.warn };
  return { label: "NORMAL", color: COLORS.ok };
}

function classifyHum(h: number) {
  if (h < HUMIDITY_LOW_THRESHOLD) return { label: "DRY · RISK", color: COLORS.warn };
  if (h > HUMIDITY_HIGH_THRESHOLD) return { label: "SATURATED", color: COLORS.accent };
  return { label: "NORMAL", color: COLORS.ok };
}

/** Gauge track with threshold ticks; scale labels ≥11px. */
function Track({ pct, color, ticks, min, max, unit }: {
  pct: number; color: string; ticks: { at: number; label: string; color?: string }[]; min: string; max: string; unit: string;
}) {
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
        {ticks.map((t) => (
          <View key={t.label} style={[styles.tick, { left: `${(t.at / 100) * 100}%`, backgroundColor: t.color ?? COLORS.muted }]} />
        ))}
      </View>
      <View style={styles.scaleRow}>
        <Text style={styles.scale}>{min}{unit}</Text>
        <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-around" }}>
          {ticks.map((t) => (
            <Text key={t.label} style={[styles.scaleTick, { color: t.color ?? COLORS.muted }]}>{t.label}</Text>
          ))}
        </View>
        <Text style={styles.scale}>{max}{unit}</Text>
      </View>
    </View>
  );
}

export function HeatSensorCard() {
  const temp = useSensorSource((s) => s.temperatureC);
  const hum = useSensorSource((s) => s.humidity);
  const dhtValid = useSensorSource((s) => s.hardware.heatSensor);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);
  const tCls = classifyTemp(temp);
  const hCls = classifyHum(hum);
  const tempPct = Math.min(100, Math.max(0, (temp / TEMP_MAX) * 100));

  return (
    <Panel
      title="Heat · Humidity (DHT11)"
      right={<Chip label={dhtValid ? "SENSOR OK" : "NO DATA"} color={dhtValid ? COLORS.ok : COLORS.muted} />}
    >
      <View style={{ gap: 16 }}>
        <View style={styles.readoutRow}>
          <Text style={[styles.bigValue, { color: tCls.color }]}>{dhtValid ? temp.toFixed(1) : "--"}</Text>
          <Text style={styles.unit}>°C</Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.bigValue, { color: COLORS.text }]}>{dhtValid ? Math.round(hum) : "--"}</Text>
          <Text style={styles.unit}>% RH</Text>
        </View>

        <Track
          pct={tempPct} color={tCls.color} unit="°"
          min="0" max={String(TEMP_MAX)}
          ticks={[
            { at: (TEMP_WARNING_THRESHOLD / TEMP_MAX) * 100, label: `${TEMP_WARNING_THRESHOLD} warn`, color: COLORS.warn },
            { at: (TEMP_CRITICAL_THRESHOLD / TEMP_MAX) * 100, label: `${TEMP_CRITICAL_THRESHOLD} crit`, color: COLORS.fire },
          ]}
        />
        <Track
          pct={Math.min(100, Math.max(0, hum))} color={hCls.color} unit="%"
          min="0" max="100"
          ticks={[
            { at: HUMIDITY_LOW_THRESHOLD, label: `${HUMIDITY_LOW_THRESHOLD} dry` },
            { at: HUMIDITY_HIGH_THRESHOLD, label: `${HUMIDITY_HIGH_THRESHOLD} wet` },
          ]}
        />

        <View style={styles.foot}>
          <Text style={styles.hint}>{hCls.label === "DRY · RISK" ? "Low humidity raises ignition risk" : "Comfort band 30–80%"}</Text>
          <Text style={styles.updated}>{timeAgo(lastUpdate)}</Text>
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  readoutRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  bigValue: { fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -0.5 },
  unit: { color: COLORS.muted, fontSize: 13, fontWeight: "600", marginRight: 12 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.panelAlt,
    overflow: "hidden",
    position: "relative",
  },
  fill: { height: "100%", borderRadius: 3 },
  tick: { position: "absolute", top: -2, bottom: -2, width: 2, borderRadius: 1 },
  scaleRow: { flexDirection: "row", alignItems: "center" },
  scale: { color: COLORS.muted, fontSize: 11, fontVariant: ["tabular-nums"] },
  scaleTick: { color: COLORS.muted, fontSize: 11, fontVariant: ["tabular-nums"] },
  foot: { flexDirection: "row", justifyContent: "space-between" },
  hint: { color: COLORS.muted, fontSize: 12, flex: 1, paddingRight: 8 },
  updated: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
});
