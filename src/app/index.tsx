import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/lib/store";
import { AlertLevel } from "@/lib/types";

const COLORS = {
  bg: "#0B0F14",
  card: "#141A22",
  text: "#E8EEF5",
  muted: "#8B98A8",
  ok: "#2ECC71",
  warn: "#F39C12",
  fire: "#FF1744",
  accent: "#3B82F6",
};

const LEVEL_COLOR: Record<AlertLevel, string> = {
  NORMAL: COLORS.ok,
  WARNING: COLORS.warn,
  EMERGENCY: COLORS.fire,
  UNKNOWN: COLORS.muted,
};

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: color + "22", borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

function Card({ title, value, unit, color }: { title: string; value: string; unit?: string; color?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.cardValue, { color: color ?? COLORS.text }]}>
        {value}
        {unit ? <Text style={styles.cardUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export default function Dashboard() {
  const status = useStore((s) => s.status);
  const error = useStore((s) => s.error);
  const espUrl = useStore((s) => s.espUrl);
  const history = useStore((s) => s.history);

  const emergency = status?.alert === "EMERGENCY";
  const connected = !!status;
  const mode = status?.wifiMode === "ROUTER" ? "ROUTER" : status?.wifiMode === "ACCESS_POINT" ? "AP HOTSPOT" : "CONNECTING";
  const pillColor = emergency ? COLORS.fire : connected ? COLORS.ok : COLORS.muted;
  const pillLabel = emergency ? "EMERGENCY" : status?.alert === "WARNING" ? "WARNING" : connected ? mode : "NO LINK";

  const maxGas = Math.max(1, ...history);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>SmartFlame</Text>
        <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
          <Text style={styles.gear}>⚙︎</Text>
        </Pressable>
      </View>

      <Pill label={pillLabel} color={pillColor} />

      {error ? <Text style={styles.error}>⚠ {error} — check phone is on same WiFi as ESP32</Text> : null}
      {!espUrl ? (
        <Text style={styles.error}>No ESP32 address yet — add it in ⚙︎ settings (serial command "i" prints it)</Text>
      ) : null}

      <View style={styles.grid}>
        <Card title="Gas (MQ2)" value={status ? String(status.gasPercent) : "—"} unit="%" color={status && status.gasPercent > 60 ? COLORS.warn : COLORS.text} />
        <Card title="Flame" value={status ? (status.flame ? "DETECTED" : "clear") : "—"} color={status?.flame ? COLORS.fire : COLORS.ok} />
        <Card title="Temperature" value={status?.dhtValid ? String(status.temperatureC) : "—"} unit="°C" />
        <Card title="Humidity" value={status?.dhtValid ? String(status.humidity) : "—"} unit="%" />
      </View>

      <View style={[styles.card, { minHeight: 60 }]}>
        <Text style={styles.cardTitle}>Gas history (last {history.length})</Text>
        <View style={styles.sparkRow}>
          {history.slice(-40).map((v, i) => (
            <View
              key={i}
              style={[styles.sparkBar, { height: 4 + (v / maxGas) * 44, backgroundColor: v / maxGas > 0.6 ? COLORS.warn : COLORS.accent }]}
            />
          ))}
        </View>
      </View>

      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: LEVEL_COLOR[status?.alert ?? "UNKNOWN"] }]}>
        <Text style={styles.cardTitle}>System status</Text>
        <Text style={[styles.statusValue, { color: LEVEL_COLOR[status?.alert ?? "UNKNOWN"] }]}>
          {status?.alert ?? "WAITING"}
        </Text>
        {status ? (
          <Text style={styles.meta}>
            {status.routerConnected ? "Router connected" : "AP hotspot active"} · raw {status.mq2Raw}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, padding: 16, paddingTop: 60, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: COLORS.text, fontSize: 28, fontWeight: "800" },
  gear: { color: COLORS.muted, fontSize: 26 },
  pill: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: "700", letterSpacing: 1 },
  error: { color: COLORS.warn, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, flexGrow: 1, flexBasis: "46%" },
  cardTitle: { color: COLORS.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: 1 },
  cardValue: { fontSize: 30, fontWeight: "800", marginTop: 6 },
  cardUnit: { fontSize: 14, fontWeight: "400", color: COLORS.muted },
  statusValue: { fontSize: 26, fontWeight: "900", marginTop: 4 },
  meta: { color: COLORS.muted, fontSize: 12, marginTop: 6 },
  sparkRow: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginTop: 8, height: 52 },
  sparkBar: { width: 5, borderRadius: 2 },
});
