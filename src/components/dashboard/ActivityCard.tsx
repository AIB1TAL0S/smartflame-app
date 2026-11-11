/** Recent activity feed with severity indicators and timestamps. */

import { StyleSheet, Text, View } from "react-native";
import { useSensorSource, formatTime, ActivityEvent } from "@/lib/sensorSource";
import { COLORS, Card, SEVERITY_COLOR } from "./ui";

const SENSOR_ICON: Record<ActivityEvent["sensor"], string> = {
  gas: "💨",
  flame: "🔥",
  heat: "🌡",
  system: "⚙︎",
};

export function ActivityCard({ maxItems = 6 }: { maxItems?: number }) {
  const activity = useSensorSource((s) => s.activity);

  return (
    <Card title="Recent Activity">
      <View style={styles.list}>
        {activity.slice(0, maxItems).map((e) => {
          const color = SEVERITY_COLOR[e.severity];
          return (
            <View key={e.id} style={styles.item}>
              <View style={[styles.severityBar, { backgroundColor: color }]} />
              <Text style={styles.icon}>{SENSOR_ICON[e.sensor]}</Text>
              <View style={styles.textCol}>
                <Text style={[styles.message, { color: e.severity === "critical" ? color : COLORS.text }]} numberOfLines={2}>
                  {e.message}
                </Text>
                <Text style={styles.time}>
                  {e.sensor.toUpperCase()} · {formatTime(e.timestamp)}
                </Text>
              </View>
            </View>
          );
        })}
        {activity.length === 0 ? <Text style={styles.time}>No events yet.</Text> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.cardAlt,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    overflow: "hidden",
  },
  severityBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  icon: { fontSize: 16, marginLeft: 4 },
  textCol: { flex: 1 },
  message: { fontSize: 13, fontWeight: "600" },
  time: { color: COLORS.faint, fontSize: 11, marginTop: 2, fontVariant: ["tabular-nums"] },
});
