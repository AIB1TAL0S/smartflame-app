/** Hardware connection status: controller, sensors, LED, buzzer. */

import { StyleSheet, Text, View } from "react-native";
import { useSensorSource } from "@/lib/sensorSource";
import { COLORS, Card, StatusDot } from "./ui";

function Item({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  const color = ok ? COLORS.ok : COLORS.fire;
  return (
    <View style={styles.item}>
      <StatusDot color={color} />
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
    </View>
  );
}

export function HardwareStatusCard() {
  const hardware = useSensorSource((s) => s.hardware);

  return (
    <Card title="Hardware Status">
      <View style={styles.grid}>
        <Item label="Controller (ESP32)" ok={hardware.controller} value={hardware.controller ? "CONNECTED" : "OFFLINE"} />
        <Item label="Flame sensor" ok={hardware.flameSensor} value={hardware.flameSensor ? "CONNECTED" : "OFFLINE"} />
        <Item label="MQ-2 gas sensor" ok={hardware.mq2Sensor} value={hardware.mq2Sensor ? "CONNECTED" : "OFFLINE"} />
        <Item label="Heat sensor" ok={hardware.heatSensor} value={hardware.heatSensor ? "CONNECTED" : "OFFLINE"} />
        <Item label="LED" ok={hardware.led} value={hardware.led ? "ON" : "OFF"} />
        <Item label="Buzzer" ok={!hardware.buzzer} value={hardware.buzzer ? "ACTIVE" : "INACTIVE"} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  label: { color: COLORS.muted, fontSize: 13, flex: 1 },
  value: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
});
