/** Settings — instrument-panel style, matching the dashboard design language.
 *  Engraved section labels, hairline-divided panels, brass Save control.
 *  Also surfaces Android runtime permission state with re-request actions. */

import { useState } from "react";
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, Platform, Linking } from "react-native";
import { router } from "expo-router";
import { useStore } from "@/lib/store";
import { saveEspUrl, saveEmergencyNumber } from "@/lib/persist";
import { COLORS, Panel, StatusDot } from "@/components/dashboard/ui";
import { requestEmergencyPermissions } from "@/lib/permissions";

export default function SettingsScreen() {
  const espUrl = useStore((s) => s.espUrl);
  const status = useStore((s) => s.status);
  const lastUpdate = useStore((s) => s.lastUpdate);
  const error = useStore((s) => s.error);
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

  const linked = !!status;
  const ago = lastUpdate ? Math.max(0, Math.round((Date.now() - lastUpdate) / 1000)) : null;
  const linkColor = linked ? COLORS.ok : COLORS.muted;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.h1}>SETTINGS</Text>
        <Pressable onPress={() => router.navigate("/")} hitSlop={12}>
          <Text style={styles.closeText}>DONE</Text>
        </Pressable>
      </View>

      {/* ---- Controller link ---- */}
      <Panel title="Controller">
        <Text style={styles.fieldLabel}>ESP32 ADDRESS</Text>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="192.168.1.50"
          placeholderTextColor={COLORS.faint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.hint}>
          Serial command "i" prints the IP. This device must share the board's network — same WiFi, or the SmartFlame-ESP32 hotspot (then http://192.168.4.1).
        </Text>

        <View style={styles.statusRow}>
          <StatusDot color={linkColor} />
          <Text style={[styles.statusText, { color: linked ? COLORS.ok : COLORS.muted }]}>
            {linked ? `LINKED · UPDATED ${ago}S AGO` : error ? "NO DATA" : "NOT LINKED"}
          </Text>
        </View>
        <Text style={styles.mono}>{espUrl || "no address set"}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </Panel>

      {/* ---- Emergency dial ---- */}
      <Panel title="Emergency Dial">
        <Text style={styles.fieldLabel}>NUMBER</Text>
        <TextInput
          style={styles.input}
          value={numberDraft}
          onChangeText={setNumberDraft}
          placeholder="711"
          placeholderTextColor={COLORS.faint}
          keyboardType="phone-pad"
        />
        <Text style={styles.hint}>
          Dialed automatically the moment an EMERGENCY starts, and shown as the CALL button on the alert screen. Default 711.
        </Text>

        {Platform.OS === "android" ? (
          <Pressable
            style={styles.permBtn}
            onPress={() => requestEmergencyPermissions().catch(() => undefined)}
          >
            <Text style={styles.permBtnText}>RE-CHECK CALL & NOTIFICATION PERMISSIONS</Text>
          </Pressable>
        ) : null}
      </Panel>

      {/* ---- Save ---- */}
      <Pressable style={[styles.primary, saved && styles.primarySaved]} onPress={save}>
        <Text style={styles.primaryText}>{saved ? "SAVED ✓" : "SAVE CONFIGURATION"}</Text>
      </Pressable>

      <Text style={styles.footer}>SmartFlame · fire detection & emergency response</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 18, paddingTop: 56, gap: 14 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  h1: { color: COLORS.text, fontSize: 20, fontWeight: "800", letterSpacing: 3 },
  closeText: { color: COLORS.accent, fontSize: 13, fontWeight: "800", letterSpacing: 1.5 },
  fieldLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1.4, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.panelAlt,
    color: COLORS.text,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  hint: { color: COLORS.muted, fontSize: 12, marginTop: 8, lineHeight: 17 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.hairline },
  statusText: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  mono: { color: COLORS.muted, fontSize: 12.5, marginTop: 6, fontFamily: "monospace" },
  errorText: { color: COLORS.fire, fontSize: 12, marginTop: 6 },
  permBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.panelAlt,
  },
  permBtnText: { color: COLORS.accent, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  primary: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: "center",
  },
  primarySaved: { backgroundColor: COLORS.ok },
  primaryText: { color: "#111210", fontWeight: "900", letterSpacing: 1.5, fontSize: 13 },
  footer: { color: COLORS.faint, fontSize: 12, textAlign: "center", marginTop: 6 },
});
