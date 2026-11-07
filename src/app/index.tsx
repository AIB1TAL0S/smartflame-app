import { StyleSheet, Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/lib/store";
import { updateUrl } from "@/lib/blynk";

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
  const data = useStore((s) => s.data);
  const connected = useStore((s) => s.connected);
  const error = useStore((s) => s.error);
  const settings = useStore((s) => s.settings);
  const history = useStore((s) => s.history);
  const patchSettings = useStore((s) => s.patchSettings);

  const fire = data?.flame === 1;
  const status = fire ? "FIRE" : connected === false ? "OFFLINE" : connected ? "ONLINE" : "…";

  const setAlarm = async (v: 0 | 1) => {
    if (!settings.token) return;
    patchSettings({});
    await fetch(updateUrl(settings.region, settings.token, "V5", v)).catch(() => undefined);
  };

  // sparkline: normalize gas history into a tiny bar strip
  const maxGas = Math.max(1, ...history);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>SmartFlame</Text>
        <Pressable onPress={() => router.push("/settings")} hitSlop={12}>
          <Text style={styles.gear}>⚙︎</Text>
        </Pressable>
      </View>

      <Pill label={status} color={fire ? COLORS.fire : connected ? COLORS.ok : COLORS.muted} />

      {error ? <Text style={styles.error}>⚠ {error}</Text> : null}
      {!settings.token ? (
        <Text style={styles.error}>No device token — add it in ⚙︎ settings</Text>
      ) : null}

      <View style={styles.grid}>
        <Card title="Gas (MQ2)" value={data ? String(data.gas) : "—"} unit="%" color={data && data.gas > 60 ? COLORS.warn : COLORS.text} />
        <Card title="Flame" value={data ? (data.flame ? "DETECTED" : "clear") : "—"} color={fire ? COLORS.fire : COLORS.ok} />
        <Card title="Temperature" value={data ? data.temp.toFixed(1) : "—"} unit="°C" />
        <Card title="Humidity" value={data ? data.hum.toFixed(0) : "—"} unit="%" />
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

      <View style={styles.alarmRow}>
        <Text style={styles.cardTitle}>Buzzer</Text>
        <Pressable
          style={[styles.muteBtn, { backgroundColor: data?.alarm === 0 ? COLORS.ok + "33" : COLORS.fire + "33", borderColor: data?.alarm === 0 ? COLORS.ok : COLORS.fire }]}
          onPress={() => setAlarm(data?.alarm === 0 ? 1 : 0)}
        >
          <Text style={styles.muteText}>{data?.alarm === 0 ? "MUTED — tap to sound" : "SOUNDING — tap to mute"}</Text>
        </Pressable>
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
  sparkRow: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginTop: 8, height: 52 },
  sparkBar: { width: 5, borderRadius: 2 },
  alarmRow: { backgroundColor: COLORS.card, borderRadius: 14, padding: 14, gap: 10 },
  muteBtn: { borderRadius: 12, borderWidth: 1.5, paddingVertical: 12, alignItems: "center" },
  muteText: { color: COLORS.text, fontWeight: "700" },
});
