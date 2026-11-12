/** Hardware status: buzzer shown as inert state, not an error.
 *  Buzzer sounding is *expected* during an alert — the row
 *  reads neutral, not red. Only disconnected sensors are failures. */

import { StyleSheet, Text, View } from "react-native";
import { useSensorSource } from "@/lib/sensorSource";
import { COLORS, GLYPH, Panel, TimeAgo } from "./ui";

function Item({ label, ok, value, neutral = false }: { label: string; ok: boolean; value: string; neutral?: boolean }) {
  // Shape + color pair: ✓ linked · ✖ offline · ◆ neutral (buzzer)
  const glyph = neutral ? GLYPH.accent : ok ? GLYPH.ok : GLYPH.unknown;
  const color = neutral ? COLORS.accent : ok ? COLORS.ok : COLORS.fire;
  return (
    <View style={styles.item}>
      <Text style={[styles.glyph, { color }]}>{glyph}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

export function HardwareStatusCard({ style }: { style?: object | null }) {
  const hardware = useSensorSource((s) => s.hardware);
  const lastUpdate = useSensorSource((s) => s.lastUpdate);

  return (
    <Panel
      title="Hardware"
      right={lastUpdate ? <TimeAgo ts={lastUpdate} prefix="updated " /> : null}
      style={style}
    >
      <View style={styles.grid}>
        <Item label="Controller · ESP32" ok={hardware.controller} value={hardware.controller ? "LINKED" : "OFFLINE"} />
        <Item label="Flame · IR" ok={hardware.flameSensor} value={hardware.flameSensor ? "LINKED" : "OFFLINE"} />
        <Item label="Gas · MQ-2" ok={hardware.mq2Sensor} value={hardware.mq2Sensor ? "LINKED" : "OFFLINE"} />
        <Item label="Heat · DHT11" ok={hardware.heatSensor} value={hardware.heatSensor ? "LINKED" : "OFFLINE"} />
        <Item label="Buzzer" ok neutral value={hardware.buzzer ? "SOUNDING" : "IDLE"} />
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 2 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  glyph: { fontSize: 14, fontWeight: "900", width: 16, textAlign: "center" },
  label: { color: COLORS.muted, fontSize: 13, flex: 1 },
  value: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
});
