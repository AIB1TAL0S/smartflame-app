/** Gas (MQ-2) sensor card with SVG circular gauge. */

import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSensorSource, timeAgo, GAS_WARNING_THRESHOLD, GAS_CRITICAL_THRESHOLD } from "@/lib/sensorSource";
import { COLORS, Card, Chip } from "./ui";

const SIZE = 108;
const STROKE = 10;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

function classify(gas: number) {
  if (gas >= GAS_CRITICAL_THRESHOLD) return { label: "CRITICAL", color: COLORS.fire };
  if (gas >= GAS_WARNING_THRESHOLD) return { label: "ELEVATED", color: COLORS.warn };
  return { label: "NORMAL", color: COLORS.ok };
}

export function GasSensorCard() {
  const gas = useSensorSource((s) => s.gasPercent);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);
  const cls = classify(gas);
  const pct = Math.min(100, Math.max(0, gas));

  return (
    <Card title="Gas Sensor (MQ-2)" accentColor={cls.color}>
      <View style={styles.body}>
        <View style={styles.gaugeWrap}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={COLORS.cardAlt} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke={cls.color}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={`${(pct / 100) * CIRC} ${CIRC}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>
          <View style={styles.gaugeCenter}>
            <Text style={[styles.value, { color: cls.color }]}>{gas.toFixed(1)}</Text>
            <Text style={styles.unit}>%</Text>
          </View>
        </View>
        <View style={styles.meta}>
          <Chip label={cls.label} color={cls.color} />
          <Text style={styles.hint}>Gas concentration</Text>
          <Text style={styles.updated}>Updated {timeAgo(lastUpdate)}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { flexDirection: "row", alignItems: "center", gap: 16 },
  gaugeWrap: { width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  gaugeCenter: { position: "absolute", alignItems: "center" },
  value: { fontSize: 26, fontWeight: "900", fontVariant: ["tabular-nums"] },
  unit: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  meta: { flex: 1, gap: 6 },
  hint: { color: COLORS.faint, fontSize: 12 },
  updated: { color: COLORS.muted, fontSize: 11, fontVariant: ["tabular-nums"] },
});
