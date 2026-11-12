/** Sensor analytics: strip-chart style traces with threshold reference lines. */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline, Line, Rect } from "react-native-svg";
import { useSensorSource, Sample, GAS_WARNING_THRESHOLD, TEMP_WARNING_THRESHOLD } from "@/lib/sensorSource";
import { COLORS, Panel } from "./ui";

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
            <View key={t.label}>
              <Rect x={0} y={y} width={W} height={H - y} fill={t.color} opacity={0.06} />
              <Line x1={0} y1={y} x2={W} y2={y} stroke={t.color} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
            </View>
          );
        })}
        <Polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
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

export function SensorAnalyticsCard() {
  const gasHistory = useSensorSource((s) => s.gasHistory);
  const tempHistory = useSensorSource((s) => s.tempHistory);
  const gas = useSensorSource((s) => s.gasPercent);
  const temp = useSensorSource((s) => s.temperatureC);
  const [rangeMin, setRangeMin] = useState(30);

  const cutoff = Date.now() - rangeMin * 60_000;
  const gasWin = gasHistory.filter((s) => s.t >= cutoff);
  const tempWin = tempHistory.filter((s) => s.t >= cutoff);

  return (
    <Panel title="Traces" right={<TimeRange value={rangeMin} onChange={setRangeMin} />}>
      <View style={styles.section}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Gas %</Text>
          <Text style={[styles.now, { color: COLORS.accent }]}>{gas.toFixed(1)}%</Text>
        </View>
        <Trace
          data={gasWin} color={COLORS.accent} min={0} max={GAS_MAX}
          thresholds={[{ at: GAS_WARNING_THRESHOLD, color: COLORS.warn, label: "warn" }]}
        />
        <View style={styles.axisRow}>
          <Text style={styles.axis}>0</Text>
          <Text style={[styles.axis, { color: COLORS.warn }]}>warn {GAS_WARNING_THRESHOLD}</Text>
          <Text style={styles.axis}>{GAS_MAX}%</Text>
        </View>
      </View>

      <View style={[styles.section, styles.sectionGap]}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Temperature °C</Text>
          <Text style={[styles.now, { color: COLORS.warn }]}>{temp.toFixed(1)}°C</Text>
        </View>
        <Trace
          data={tempWin} color={COLORS.warn} min={0} max={TEMP_MAX}
          thresholds={[{ at: TEMP_WARNING_THRESHOLD, color: COLORS.warn, label: "warn" }]}
        />
        <View style={styles.axisRow}>
          <Text style={styles.axis}>0</Text>
          <Text style={[styles.axis, { color: COLORS.warn }]}>warn {TEMP_WARNING_THRESHOLD}</Text>
          <Text style={styles.axis}>{TEMP_MAX}°C</Text>
        </View>
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
  axis: { color: COLORS.muted, fontSize: 11, fontVariant: ["tabular-nums"] },
});
