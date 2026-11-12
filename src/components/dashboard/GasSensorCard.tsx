/** Gas (MQ-2) — dial gauge in the instrument style. */

import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSensorSource, useOffline, timeAgo, GAS_WARNING_THRESHOLD, GAS_CRITICAL_THRESHOLD } from "@/lib/sensorSource";
import { COLORS, GLYPH, Panel, Chip } from "./ui";

const SIZE = 96;
const STROKE = 8;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;
/** Gap between the ring and the tick labels. */
const LABEL_OFFSET = 9;

/** Color-matched label anchored directly under a gauge tick. */
function TickLabel({ at, label, color, glyph }: { at: number; label: string; color: string; glyph: string }) {
  // Tick angle measured from the top of the ring, clockwise (matches the
  // `rotate(-90 …)` stroke-dashoffset layout of the dial).
  const rad = ((at / 100) * 360 - 90) * (Math.PI / 180);
  const x = SIZE / 2 + (R + LABEL_OFFSET) * Math.cos(rad);
  const y = SIZE / 2 + (R + LABEL_OFFSET) * Math.sin(rad);
  return (
    <Text
      style={[styles.tickLabel, { left: x, top: y, color, transform: [{ translateX: -30 }, { translateY: -7 }] }]}
    >
      {glyph} {label}
    </Text>
  );
}

function classify(gas: number) {
  if (gas >= GAS_CRITICAL_THRESHOLD) return { label: "CRITICAL", color: COLORS.fire };
  if (gas >= GAS_WARNING_THRESHOLD) return { label: "ELEVATED", color: COLORS.warn };
  return { label: "NORMAL", color: COLORS.ok };
}

export function GasSensorCard({ style }: { style?: object | null }) {
  const gas = useSensorSource((s) => s.gasPercent);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);
  const offline = useOffline();
  // Last known data must not look live: neutral UNKNOWN instead of NORMAL.
  const cls = offline ? { label: "UNKNOWN", color: COLORS.muted } : classify(gas);
  const pct = Math.min(100, Math.max(0, gas));
  const warnAngle = (GAS_WARNING_THRESHOLD / 100) * CIRC;
  const critAngle = (GAS_CRITICAL_THRESHOLD / 100) * CIRC;

  return (
    <Panel title="Gas · MQ-2" right={<Chip label={cls.label} color={cls.color} />} style={[style, offline ? styles.stale : null]}>
      <View style={styles.body}>
        <View style={styles.gaugeArea}>
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
          {/* tick labels, anchored directly under the warn/crit ticks */}
          {!offline ? (
            <>
              <TickLabel at={GAS_WARNING_THRESHOLD} label={`${GAS_WARNING_THRESHOLD} warn`} color={COLORS.warn} glyph={GLYPH.warn} />
              <TickLabel at={GAS_CRITICAL_THRESHOLD} label={`${GAS_CRITICAL_THRESHOLD} crit`} color={COLORS.fire} glyph={GLYPH.fire} />
            </>
          ) : null}
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={styles.hint}>
            {offline ? "Last known reading — controller unreachable" : `Dial ticks mark the ${GAS_WARNING_THRESHOLD}% warn / ${GAS_CRITICAL_THRESHOLD}% crit thresholds`}
          </Text>
          <Text style={styles.updated}>{offline ? "stale" : timeAgo(lastUpdate)}</Text>
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  stale: { opacity: 0.45 },
  body: { alignItems: "center", gap: 8 },
  gaugeArea: {
    // room for the labels hanging off the right and bottom of the ring
    width: SIZE + 76,
    height: SIZE + 18,
    alignItems: "center",
    justifyContent: "center",
  },
  gaugeWrap: { width: SIZE, height: SIZE, overflow: "visible" },
  tickLabel: {
    position: "absolute",
    width: 64,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    fontVariant: ["tabular-nums"],
    textAlign: "left",
  },
  gaugeCenter: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center" },
  gaugeValue: { fontSize: 30, fontWeight: "800", fontVariant: ["tabular-nums"] },
  gaugeUnit: { color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  meta: { flexDirection: "row", justifyContent: "space-between", width: "100%", alignItems: "center" },
  hint: { color: COLORS.muted, fontSize: 12, flex: 1, paddingRight: 8 },
  updated: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
});
