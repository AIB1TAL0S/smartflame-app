/** Gas (MQ-2) — dial gauge in the instrument style. */

import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSensorSource, timeAgo, GAS_WARNING_THRESHOLD, GAS_CRITICAL_THRESHOLD } from "@/lib/sensorSource";
import { COLORS, Panel, Chip, Readout } from "./ui";

const SIZE = 96;
const STROKE = 8;
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
  const warnAngle = (GAS_WARNING_THRESHOLD / 100) * CIRC;
  const critAngle = (GAS_CRITICAL_THRESHOLD / 100) * CIRC;

  return (
    <Panel title="Gas · MQ-2" right={<Chip label={cls.label} color={cls.color} />}>
      <View style={styles.body}>
        <View style={styles.gaugeWrap}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={COLORS.panelAlt} strokeWidth={STROKE} fill="none" />
            {/* warning + critical tick marks on the dial */}
            <Circle
              cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={COLORS.panel} strokeWidth={STROKE + 4} fill="none"
              strokeDasharray={`2 ${CIRC}`} strokeDashoffset={-warnAngle}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
            <Circle
              cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={COLORS.panel} strokeWidth={STROKE + 4} fill="none"
              strokeDasharray={`2 ${CIRC}`} strokeDashoffset={-critAngle}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
            <Circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              stroke={cls.color} strokeWidth={STROKE} fill="none"
              strokeDasharray={`${(pct / 100) * CIRC} ${CIRC}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>
          <View style={styles.gaugeCenter}>
            <Text style={[styles.gaugeValue, { color: cls.color }]}>{Math.round(gas)}</Text>
            <Text style={styles.gaugeUnit}>% LEL</Text>
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={styles.hint}>Ticks mark {GAS_WARNING_THRESHOLD}% / {GAS_CRITICAL_THRESHOLD}% thresholds</Text>
          <Text style={styles.updated}>{timeAgo(lastUpdate)}</Text>
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  body: { alignItems: "center", gap: 8 },
  gaugeWrap: { width: SIZE, height: SIZE },
  gaugeCenter: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" },
  gaugeValue: { fontSize: 30, fontWeight: "800", fontVariant: ["tabular-nums"] },
  gaugeUnit: { color: COLORS.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  meta: { flexDirection: "row", justifyContent: "space-between", width: "100%", alignItems: "center" },
  hint: { color: COLORS.muted, fontSize: 12, flex: 1, paddingRight: 8 },
  updated: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
});
