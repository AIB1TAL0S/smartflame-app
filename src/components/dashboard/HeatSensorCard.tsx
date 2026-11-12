/** Heat + Humidity — twin linear gauges with threshold ticks (11px labels). */

import { StyleSheet, Text, View } from "react-native";
import {
  useSensorSource,
  useOffline,
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

export function HeatSensorCard({ style }: { style?: object | null }) {
  const temp = useSensorSource((s) => s.temperatureC);
  const hum = useSensorSource((s) => s.humidity);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);
  const offline = useOffline();
  const dhtValid = useSensorSource((s) => s.hardware.heatSensor);

  // Compact "No data" state — never an empty card; show last-known values.
  if (!dhtValid) {
    return (
      <Panel
        title="Heat · Humidity (DHT11)"
        right={<Chip label={offline ? "UNKNOWN" : "NO DATA"} color={COLORS.muted} glyph="✕" />}
        style={[style, offline ? styles.stale : null]}
      >
        <View style={styles.noDataRow}>
          <Text style={styles.noDataIcon}>⚠</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.noDataTitle}>No data from DHT11</Text>
            <Text style={styles.noDataSub}>
              Last known {temp.toFixed(1)}°C · {Math.round(hum)}% RH{offline ? " (stale)" : ""}
            </Text>
          </View>
        </View>
      </Panel>
    );
  }

  const tCls = offline ? { label: "UNKNOWN", color: COLORS.muted } : classifyTemp(temp);
  const hCls = offline ? { label: "UNKNOWN", color: COLORS.muted } : classifyHum(hum);
  const tempPct = Math.min(100, Math.max(0, (temp / TEMP_MAX) * 100));

  return (
    <Panel
      title="Heat · Humidity (DHT11)"
      right={<Chip label={offline ? "UNKNOWN" : "SENSOR OK"} color={offline ? COLORS.muted : COLORS.ok} />}
      style={[style, offline ? styles.stale : null]}
    >
      <View style={{ gap: 10 }}>
        {/* large primary number (temperature) with compact secondary humidity */}
        <View style={styles.readoutRow}>
          <Text style={[styles.bigValue, { color: tCls.color }]}>{temp.toFixed(1)}</Text>
          <Text style={styles.unit}>°C</Text>
          <View style={{ flex: 1 }} />
          <Text style={[styles.humValue, { color: hCls.color }]}>{Math.round(hum)}</Text>
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
            { at: HUMIDITY_LOW_THRESHOLD, label: `${HUMIDITY_LOW_THRESHOLD} dry`, color: COLORS.warn },
            { at: HUMIDITY_HIGH_THRESHOLD, label: `${HUMIDITY_HIGH_THRESHOLD} wet`, color: COLORS.accent },
          ]}
        />

        <View style={styles.foot}>
          <Text style={styles.hint}>
            {offline
              ? "Last known readings — controller unreachable"
              : hCls.label === "DRY · RISK"
                ? "▲ Low humidity raises ignition risk"
                : "Comfort band 30–80%"}
          </Text>
          <Text style={styles.updated}>{offline ? "stale" : timeAgo(lastUpdate)}</Text>
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  stale: { opacity: 0.45 },
  readoutRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  bigValue: { fontSize: 46, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -1 },
  humValue: { fontSize: 26, fontWeight: "800", fontVariant: ["tabular-nums"], color: COLORS.text },
  unit: { color: COLORS.muted, fontSize: 13, fontWeight: "600", marginRight: 12 },
  noDataRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  noDataIcon: { fontSize: 26, color: COLORS.warn },
  noDataTitle: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
  noDataSub: { color: COLORS.muted, fontSize: 12.5, marginTop: 2, fontVariant: ["tabular-nums"] },
  track: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.panelAlt,
    overflow: "hidden",
    position: "relative",
  },
  fill: { height: "100%", borderRadius: 3 },
  tick: { position: "absolute", top: -2, bottom: -2, width: 2, borderRadius: 1 },
  scaleRow: { flexDirection: "row", alignItems: "center" },
  scale: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
  scaleTick: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
  foot: { flexDirection: "row", justifyContent: "space-between" },
  hint: { color: COLORS.muted, fontSize: 12, flex: 1, paddingRight: 8 },
  updated: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
});
