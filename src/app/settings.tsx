import { useState } from "react";
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/lib/store";
import { saveEspUrl, saveEmergencyNumber } from "@/lib/persist";

export default function SettingsScreen() {
  const espUrl = useStore((s) => s.espUrl);
  const status = useStore((s) => s.status);
  const lastUpdate = useStore((s) => s.lastUpdate);
  const setEspUrl = useStore((s) => s.setEspUrl);
  const emergencyNumber = useStore((s) => s.emergencyNumber);
  const setEmergencyNumber = useStore((s) => s.setEmergencyNumber);
  const [draft, setDraft] = useState(espUrl);
  const [numberDraft, setNumberDraft] = useState(emergencyNumber);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const clean = draft.trim().replace(/\/+$/, "");
    const withScheme = /^https?:\/\//.test(clean) ? clean : `http://${clean}`;
    setEspUrl(withScheme);
    await saveEspUrl(withScheme);
    setEmergencyNumber(numberDraft.trim());
    await saveEmergencyNumber(numberDraft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const ago = lastUpdate ? Math.round((Date.now() - lastUpdate) / 1000) : null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Settings</Text>

      <Text style={styles.label}>ESP32 address</Text>
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        placeholder="192.168.1.50"
        placeholderTextColor="#5B6675"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Text style={styles.hint}>
        Serial command "i" prints the IP. Phone must be on the same WiFi (or on the SmartFlame-ESP32 hotspot — then use http://192.168.4.1).
      </Text>

      <Pressable style={styles.primary} onPress={save}>
        <Text style={styles.primaryText}>{saved ? "Saved ✓" : "Save"}</Text>
      </Pressable>

      <Text style={styles.label}>Emergency number</Text>
      <TextInput
        style={styles.input}
        value={numberDraft}
        onChangeText={setNumberDraft}
        placeholder="711"
        placeholderTextColor="#5B6675"
        keyboardType="phone-pad"
      />
      <Text style={styles.hint}>
        Dialed automatically the moment an EMERGENCY starts (also shown as a big CALL button on the alert screen). Default: 711.
      </Text>

      <Text style={styles.label}>Connection</Text>
      <Text style={styles.mono}>
        {status ? `linked · last update ${ago}s ago` : "no data yet"}
      </Text>
      <Text style={styles.mono}>{espUrl || "not configured"}</Text>

      <Pressable style={styles.closeBtn} onPress={() => router.navigate("/")}>
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
  hint: { color: "#5B6675", fontSize: 12 },
  primary: { backgroundColor: "#3B82F6", borderRadius: 12, padding: 14, alignItems: "center", marginTop: 16 },
  primaryText: { color: "#fff", fontWeight: "800" },
  mono: { color: "#8B98A8", fontSize: 13, fontFamily: "monospace" },
  closeBtn: { alignItems: "center", padding: 12, marginTop: 8 },
  closeText: { color: "#8B98A8" },
});
