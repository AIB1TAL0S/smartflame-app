/** Sensor analytics: gas & temperature readings over time (SVG line charts). */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { useSensorSource, Sample } from "@/lib/sensorSource";
import { COLORS, Card, Chip } from "./ui";

const W = 300;
const H = 120;

function Sparkline({ data, color, min, max }: { data: Sample[]; color: string; min: number; max: number }) {
  const pts = data
    .map((s, i) => {
      const x = (i / Math.max(1, data.length - 1)) * W;
      const y = H - ((Math.min(max, Math.max(min, s.v)) - min) / (max - min)) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <Polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
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
          <Text style={[styles.rangeText, value === m && styles.rangeTextActive]}>{m}m</Text>
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
    <Card title="Sensor Analytics">
      <TimeRange value={rangeMin} onChange={setRangeMin} />

      <View style={styles.section}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Gas readings over time</Text>
          <Chip label={`${gas.toFixed(1)}%`} color={COLORS.accent} />
        </View>
        <View style={styles.chartBox}>
          {gasWin.length > 1 ? (
            <Sparkline data={gasWin} color={COLORS.accent} min={0} max={80} />
          ) : (
            <Text style={styles.empty}>Collecting data…</Text>
          )}
        </View>
        <Text style={styles.axis}>0% ····· 80% (last {rangeMin} min)</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Temperature readings over time</Text>
          <Chip label={`${temp.toFixed(1)}°C`} color={COLORS.warn} />
        </View>
        <View style={styles.chartBox}>
          {tempWin.length > 1 ? (
            <Sparkline data={tempWin} color={COLORS.warn} min={0} max={80} />
          ) : (
            <Text style={styles.empty}>Collecting data…</Text>
          )}
        </View>
        <Text style={styles.axis}>0°C ····· 80°C (last {rangeMin} min)</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  rangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardAlt,
  },
  rangeBtnActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + "22" },
  rangeText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  rangeTextActive: { color: COLORS.accent },
  section: { marginTop: 4 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chartTitle: { color: COLORS.text, fontSize: 13, fontWeight: "700" },
  chartBox: {
    backgroundColor: COLORS.cardAlt,
    borderRadius: 10,
    marginTop: 8,
    paddingVertical: 6,
    height: H + 12,
    justifyContent: "center",
  },
  empty: { color: COLORS.faint, fontSize: 12, textAlign: "center" },
  axis: { color: COLORS.faint, fontSize: 10, marginTop: 4, textAlign: "center" },
});
