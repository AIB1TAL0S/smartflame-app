/** Recent activity: event log lines with severity ticks — log aesthetic, not chat bubbles. */

import { StyleSheet, Text, View } from "react-native";
import { useSensorSource, formatTime, ActivityEvent } from "@/lib/sensorSource";
import { COLORS, Panel, SEVERITY_COLOR } from "./ui";

const SENSOR_TAG: Record<ActivityEvent["sensor"], string> = {
  gas: "GAS",
  flame: "FLAME",
  heat: "HEAT",
  system: "SYS",
};

export function ActivityCard({ maxItems = 7 }: { maxItems?: number }) {
  const activity = useSensorSource((s) => s.activity);

  return (
    <Panel title="Event Log">
      <View style={styles.list}>
        {activity.slice(0, maxItems).map((e, i) => {
          const color = SEVERITY_COLOR[e.severity];
          const first = i === 0;
          return (
            <View key={e.id} style={[styles.item, first && styles.itemFirst]}>
              <View style={[styles.tick, { backgroundColor: color }]} />
              <Text style={[styles.tag, { color: e.severity === "critical" ? color : COLORS.muted }]}>{SENSOR_TAG[e.sensor]}</Text>
              <Text style={[styles.message, e.severity === "critical" ? { color } : null]} numberOfLines={2}>
                {e.message}
              </Text>
              <Text style={styles.time}>{formatTime(e.timestamp)}</Text>
            </View>
          );
        })}
        {activity.length === 0 ? <Text style={styles.empty}>No events recorded yet.</Text> : null}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  list: { gap: 1 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.hairline,
  },
  itemFirst: { backgroundColor: COLORS.panelAlt },
  tick: { width: 3, height: 16, borderRadius: 1.5 },
  tag: { fontSize: 11, fontWeight: "800", letterSpacing: 1, width: 48 },
  message: { color: COLORS.text, fontSize: 13, flex: 1 },
  time: { color: COLORS.muted, fontSize: 12, fontVariant: ["tabular-nums"] },
  empty: { color: COLORS.muted, fontSize: 12.5, paddingVertical: 8 },
});
