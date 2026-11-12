/** Event log: severity icons + color coding, sensor/severity filters,
 *  relative timestamps (absolute on hover/long-press). */

import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSensorSource, ActivityEvent, Severity, SensorKey } from "@/lib/sensorSource";
import { COLORS, GLYPH, Panel, SEVERITY_COLOR, TimeAgo } from "./ui";

const SENSOR_TAG: Record<ActivityEvent["sensor"], string> = {
  gas: "GAS",
  flame: "FLAME",
  heat: "HEAT",
  system: "SYS",
};

/** Shape + color pair per severity — never color alone. */
const SEVERITY_GLYPH: Record<Severity, string> = {
  info: GLYPH.accent,
  warning: GLYPH.warn,
  critical: GLYPH.fire,
};

type SensorFilter = "all" | SensorKey | "system";
type SeverityFilter = "all" | Severity;

const SENSOR_FILTERS: { key: SensorFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "gas", label: "Gas" },
  { key: "flame", label: "Flame" },
  { key: "heat", label: "Heat" },
  { key: "system", label: "Sys" },
];

const SEVERITY_FILTERS: { key: SeverityFilter; label: string; color: string; glyph: string }[] = [
  { key: "all", label: "All", color: COLORS.muted, glyph: "•" },
  { key: "info", label: "Info", color: SEVERITY_COLOR.info, glyph: SEVERITY_GLYPH.info },
  { key: "warning", label: "Warning", color: SEVERITY_COLOR.warning, glyph: SEVERITY_GLYPH.warning },
  { key: "critical", label: "Critical", color: SEVERITY_COLOR.critical, glyph: SEVERITY_GLYPH.critical },
];

function FilterChip({ label, glyph, color, active, onPress }: {
  label: string; glyph?: string; color: string; active: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Filter ${label}`}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, { color: active ? COLORS.text : color }]}>
        {glyph ? `${glyph} ` : ""}{label}
      </Text>
    </Pressable>
  );
}

export function ActivityCard({ maxItems = 7, style }: { maxItems?: number; style?: object | null }) {
  const activity = useSensorSource((s) => s.activity);
  const [sensorFilter, setSensorFilter] = useState<SensorFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");

  const filtered = activity.filter(
    (e) =>
      (sensorFilter === "all" || e.sensor === sensorFilter) &&
      (severityFilter === "all" || e.severity === severityFilter)
  );
  const latest = activity[0]?.timestamp;

  return (
    <Panel
      title="Event Log"
      right={latest ? <TimeAgo ts={latest} prefix="updated " /> : null}
      style={style}
    >
      <View style={styles.filters}>
        <View style={styles.filterRow}>
          {SENSOR_FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              color={COLORS.accent}
              active={sensorFilter === f.key}
              onPress={() => setSensorFilter(f.key)}
            />
          ))}
        </View>
        <View style={styles.filterRow}>
          {SEVERITY_FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              glyph={f.glyph}
              color={f.color}
              active={severityFilter === f.key}
              onPress={() => setSeverityFilter(f.key)}
            />
          ))}
        </View>
      </View>

      <View style={styles.list}>
        {filtered.slice(0, maxItems).map((e, i) => {
          const color = SEVERITY_COLOR[e.severity];
          const first = i === 0;
          return (
            <View key={e.id} style={[styles.item, first && styles.itemFirst]}>
              <View style={[styles.tick, { backgroundColor: color }]} />
              <Text style={[styles.glyph, { color }]}>{SEVERITY_GLYPH[e.severity]}</Text>
              <Text style={[styles.tag, { color: e.severity === "critical" ? color : COLORS.muted }]}>{SENSOR_TAG[e.sensor]}</Text>
              <Text style={[styles.message, e.severity === "critical" ? { color } : null]} numberOfLines={2}>
                {e.message}
              </Text>
              <TimeAgo ts={e.timestamp} style={styles.time} />
            </View>
          );
        })}
        {filtered.length === 0 ? (
          <Text style={styles.empty}>
            {activity.length === 0 ? "No events recorded yet." : "No events match the selected filters."}
          </Text>
        ) : null}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  filters: { gap: 6, marginBottom: 8 },
  filterRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accent + "1F" },
  chipText: { fontSize: 12, fontWeight: "800" },
  list: { gap: 1 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.hairline,
  },
  itemFirst: { backgroundColor: COLORS.panelAlt },
  tick: { width: 3, height: 16, borderRadius: 1.5 },
  glyph: { fontSize: 13, fontWeight: "900", width: 14, textAlign: "center" },
  tag: { fontSize: 12, fontWeight: "800", letterSpacing: 1, width: 48 },
  message: { color: COLORS.text, fontSize: 13, flex: 1 },
  time: { fontSize: 12 },
  empty: { color: COLORS.muted, fontSize: 12.5, paddingVertical: 8 },
});
