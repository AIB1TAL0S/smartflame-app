import { useState } from "react";
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/lib/store";
import { saveSettings } from "@/lib/persist";
import { initNotifications } from "@/lib/notifications";
import * as Notifications from "expo-notifications";

const REGIONS = [
  { label: "Global (blynk.cloud)", value: "blynk.cloud" },
  { label: "London (lon1)", value: "lon1" },
  { label: "New York (nyc1)", value: "nyc1" },
  { label: "Singapore (sgp1)", value: "sgp1" },
  { label: "Frankfurt (fra1)", value: "fra1" },
  { label: "São Paulo (bl1)", value: "bl1" },
];

export default function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const pushToken = useStore((s) => s.pushToken);
  const patchSettings = useStore((s) => s.patchSettings);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const testPush = async () => {
    const token = pushToken ?? (await initNotifications());
    if (!token) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔔 Test alert",
        body: "If you see this, push works. Fire alerts use the same channel.",
      },
      trigger: null, // fire immediately
      identifier: "test-push",
    });
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Settings</Text>

      <Text style={styles.label}>Device auth token</Text>
      <TextInput
        style={styles.input}
        value={settings.token}
        onChangeText={(t) => patchSettings({ token: t.trim() })}
        placeholder="Paste Blynk device token"
        placeholderTextColor="#5B6675"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
      />

      <Text style={styles.label}>Region</Text>
      <View style={styles.regionRow}>
        {REGIONS.map((r) => (
          <Pressable
            key={r.value}
            style={[styles.region, settings.region === r.value && styles.regionActive]}
            onPress={() => patchSettings({ region: r.value })}
          >
            <Text style={[styles.regionText, settings.region === r.value && styles.regionTextActive]}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Poll interval: {settings.pollMs / 1000}s</Text>
      <View style={styles.regionRow}>
        {[1, 3, 5, 10].map((s) => (
          <Pressable
            key={s}
            style={[styles.region, settings.pollMs === s * 1000 && styles.regionActive]}
            onPress={() => patchSettings({ pollMs: s * 1000 })}
          >
            <Text style={[styles.regionText, settings.pollMs === s * 1000 && styles.regionTextActive]}>{s}s</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.primary} onPress={save}>
        <Text style={styles.primaryText}>{saved ? "Saved ✓" : "Save"}</Text>
      </Pressable>

      <Text style={styles.label}>Push token</Text>
      <Text style={styles.mono}>{pushToken ?? "not registered"}</Text>
      <Pressable style={[styles.primary, styles.secondary]} onPress={testPush}>
        <Text style={styles.primaryText}>Send test notification</Text>
      </Pressable>

      <Pressable style={styles.closeBtn} onPress={() => router.back()}>
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F14" },
  content: { padding: 18, paddingTop: 70, gap: 10 },
  h1: { color: "#E8EEF5", fontSize: 26, fontWeight: "800", marginBottom: 8 },
  label: { color: "#8B98A8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginTop: 8 },
  input: { backgroundColor: "#141A22", color: "#E8EEF5", borderRadius: 12, padding: 14, fontSize: 15 },
  regionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  region: { borderRadius: 10, borderWidth: 1, borderColor: "#2A3441", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#141A22" },
  regionActive: { borderColor: "#3B82F6", backgroundColor: "#3B82F622" },
  regionText: { color: "#8B98A8", fontSize: 13 },
  regionTextActive: { color: "#3B82F6", fontWeight: "700" },
  primary: { backgroundColor: "#3B82F6", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 16 },
  secondary: { backgroundColor: "#141A22", borderWidth: 1, borderColor: "#2A3441" },
  primaryText: { color: "#fff", fontWeight: "800" },
  mono: { color: "#8B98A8", fontSize: 11, fontFamily: "monospace" },
  closeBtn: { alignItems: "center", padding: 12, marginTop: 8 },
  closeText: { color: "#8B98A8" },
});
