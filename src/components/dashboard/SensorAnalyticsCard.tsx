/** Sensor analytics: strip-chart style traces with threshold reference lines. */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline, Line, Rect, G } from "react-native-svg";
import {
  useSensorSource,
  useOffline,
  Sample,
  GAS_WARNING_THRESHOLD,
  GAS_CRITICAL_THRESHOLD,
  TEMP_WARNING_THRESHOLD,
  TEMP_CRITICAL_THRESHOLD,
} from "@/lib/sensorSource";
import { COLORS, GLYPH, Panel } from "./ui";

const W = 300;
const H = 110;
const GAS_MAX = 80;
const TEMP_MAX = 80;

function Trace({ data, color, min, max, thresholds }: {
  data: Sample[]; color: string; min: number; max: number; thresholds: { at: number; color: string; label: string }[];
}) {
  const pts = data
    .map((s, i) => {
      const x = (i / Math.max(1, data.length - 1)) * W;
      const y = H - ((Math.min(max, Math.max(min, s.v)) - min) / (max - min)) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <View style={styles.chartBox}>
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        {/* threshold bands */}
        {thresholds.map((t) => {
          const y = H - ((t.at - min) / (max - min)) * H;
          return (
            <G key={t.label}>
              <Rect x={0} y={y} width={W} height={H - y} fill={t.color} opacity={0.06} />
              <Line x1={0} y1={y} x2={W} y2={y} stroke={t.color} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
            </G>
          );
        })}
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

/** Unit-labeled legend for the dashed threshold lines above the axis. */
function ThresholdLegend({ thresholds, unit }: { thresholds: { at: number; color: string; label: string; glyph: string }[]; unit: string }) {
  return (
    <View style={styles.legendRow}>
      {thresholds.map((t) => (
        <Text key={t.label} style={[styles.legendText, { color: t.color }]}>
          {t.glyph} {t.label} {t.at}
          {unit}
        </Text>
      ))}
    </View>
  );
}

/** Compact empty state when the selected window has no samples. */
function EmptyWindow({ unit }: { unit: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyIcon}>✕</Text>
      <Text style={styles.emptyText}>No data in this window</Text>
      <Text style={styles.emptySub}>Waiting for {unit} samples…</Text>
    </View>
  );
}

function TimeRange({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.rangeRow}>
      {[15, 30, 60].map((m) => (
        <Pressable
          key={m}
          onPress={() => onChange(m)}
          style={[styles.rangeBtn, value === m && styles.rangeBtnActive]}
        >
          <Text style={[styles.rangeText, value === m && styles.rangeTextActive]}>{m} min</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SensorAnalyticsCard({ style }: { style?: object | null }) {
  const gasHistory = useSensorSource((s) => s.gasHistory);
  const tempHistory = useSensorSource((s) => s.tempHistory);
  const gas = useSensorSource((s) => s.gasPercent);
  const temp = useSensorSource((s) => s.temperatureC);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);
  const offline = useOffline();
  const [rangeMin, setRangeMin] = useState(30);

  // Window anchored to the last sample timestamp (pure — no Date.now in render).
  const cutoff = lastUpdate - rangeMin * 60_000;
  const gasWin = gasHistory.filter((s) => s.t >= cutoff);
  const tempWin = tempHistory.filter((s) => s.t >= cutoff);

  const gasThresholds = [
    { at: GAS_WARNING_THRESHOLD, color: COLORS.warn, label: "warn", glyph: GLYPH.warn },
    { at: GAS_CRITICAL_THRESHOLD, color: COLORS.fire, label: "crit", glyph: GLYPH.fire },
  ];
  const tempThresholds = [
    { at: TEMP_WARNING_THRESHOLD, color: COLORS.warn, label: "warn", glyph: GLYPH.warn },
    { at: TEMP_CRITICAL_THRESHOLD, color: COLORS.fire, label: "crit", glyph: GLYPH.fire },
  ];

  return (
    <Panel title="Traces" right={<TimeRange value={rangeMin} onChange={setRangeMin} />} style={[style, offline ? styles.stale : null]}>
      <View style={styles.section}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Gas % LEL</Text>
          <Text style={[styles.now, { color: COLORS.accent }]}>{gas.toFixed(1)}%</Text>
        </View>
        {gasWin.length === 0 ? (
          <EmptyWindow unit="gas" />
        ) : (
          <>
            <Trace data={gasWin} color={COLORS.accent} min={0} max={GAS_MAX} thresholds={gasThresholds} />
            <ThresholdLegend thresholds={gasThresholds} unit="%" />
            <View style={styles.axisRow}>
              <Text style={styles.axis}>0%</Text>
              <Text style={styles.axis}>{GAS_MAX}%</Text>
            </View>
          </>
        )}
      </View>

      <View style={[styles.section, styles.sectionGap]}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Temperature °C</Text>
          <Text style={[styles.now, { color: COLORS.warn }]}>{temp.toFixed(1)}°C</Text>
        </View>
        {tempWin.length === 0 ? (
          <EmptyWindow unit="temperature" />
        ) : (
          <>
            <Trace data={tempWin} color={COLORS.warn} min={0} max={TEMP_MAX} thresholds={tempThresholds} />
            <ThresholdLegend thresholds={tempThresholds} unit="°C" />
            <View style={styles.axisRow}>
              <Text style={styles.axis}>0°C</Text>
              <Text style={styles.axis}>{TEMP_MAX}°C</Text>
            </View>
          </>
        )}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  rangeRow: { flexDirection: "row", gap: 4 },
  rangeBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  rangeBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + "1F" },
  rangeText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  rangeTextActive: { color: COLORS.accent },
  section: { gap: 6 },
  sectionGap: { marginTop: 18 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  chartTitle: { color: COLORS.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  now: { fontSize: 15, fontWeight: "800", fontVariant: ["tabular-nums"] },
  chartBox: {
    backgroundColor: COLORS.panelAlt,
    borderRadius: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  axisRow: { flexDirection: "row", justifyContent: "space-between" },
  axis: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
  legendRow: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  legendText: { fontSize: 12, fontWeight: "800", fontVariant: ["tabular-nums"] },
  emptyBox: {
    backgroundColor: COLORS.panelAlt,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderStyle: "dashed",
    height: H,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  emptyIcon: { color: COLORS.faint, fontSize: 16, fontWeight: "900" },
  emptyText: { color: COLORS.muted, fontSize: 13, fontWeight: "800" },
  emptySub: { color: COLORS.faint, fontSize: 12 },
  stale: { opacity: 0.45 },
});
