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

const TEST_TIMEOUT_MS = 5000;

/** Host name / IP (optionally :port), scheme optional — save() adds it. */
function isValidAddress(draft: string): boolean {
  const bare = draft.trim().replace(/^https?:\/\//, "").replace(/\/+.*$/, "");
  return /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(:\d+)?$/.test(bare) && bare.length > 0;
}

/** Same normalization the save handler has always used. */
function normalizeAddress(draft: string): string {
  const clean = draft.trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(clean) ? clean : `http://${clean}`;
}

type TestPhase = "idle" | "testing" | "ok" | "fail";

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
  const [test, setTest] = useState<{ phase: TestPhase; detail: string }>({ phase: "idle", detail: "" });

  const dirty = normalizeAddress(draft) !== espUrl || numberDraft.trim() !== emergencyNumber;
  const addressValid = isValidAddress(draft);

  const save = async () => {
    const withScheme = normalizeAddress(draft);
    setEspUrl(withScheme);
    await saveEspUrl(withScheme);
    setEmergencyNumber(numberDraft.trim());
    await saveEmergencyNumber(numberDraft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const testConnection = async () => {
    const url = normalizeAddress(draft);
    setTest({ phase: "testing", detail: url });
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
      const res = await fetch(`${url}/api/status`, { cache: "no-store", signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await res.json();
      setTest({ phase: "ok", detail: "Controller responded" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setTest({ phase: "fail", detail: msg === "Aborted" ? "No response within 5s" : msg });
    }
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
          style={[styles.input, !addressValid && styles.inputInvalid]}
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

        <Pressable
          style={[styles.secondary, test.phase === "testing" && styles.btnBusy]}
          disabled={!addressValid || test.phase === "testing"}
          onPress={testConnection}
        >
          <Text style={styles.secondaryText}>{test.phase === "testing" ? "TESTING…" : "TEST CONNECTION"}</Text>
        </Pressable>
        {test.phase === "ok" ? <Text style={styles.testOk}>✓ {test.detail}</Text> : null}
        {test.phase === "fail" ? <Text style={styles.testFail}>✕ {test.detail}</Text> : null}

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
      <Pressable
        style={[styles.primary, saved && styles.primarySaved, (!dirty || !addressValid) && styles.primaryDisabled]}
        disabled={!dirty || !addressValid}
        onPress={save}
      >
        <Text style={[styles.primaryText, (!dirty || !addressValid) && styles.primaryTextDisabled]}>
          {saved ? "SAVED ✓" : addressValid ? "SAVE CONFIGURATION" : "INVALID ADDRESS"}
        </Text>
      </Pressable>
      {!dirty && !saved ? <Text style={styles.footer}>No changes to save yet.</Text> : null}

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
  inputInvalid: { borderColor: COLORS.fire },
  secondary: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
    backgroundColor: COLORS.panelAlt,
  },
  secondaryText: { color: COLORS.accent, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  btnBusy: { opacity: 0.6 },
  testOk: { color: COLORS.ok, fontSize: 12, marginTop: 6 },
  testFail: { color: COLORS.fire, fontSize: 12, marginTop: 6 },
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
  primaryDisabled: { opacity: 0.4 },
  primaryText: { color: "#111210", fontWeight: "900", letterSpacing: 1.5, fontSize: 13 },
  primaryTextDisabled: { color: COLORS.muted },
  footer: { color: COLORS.faint, fontSize: 12, textAlign: "center", marginTop: 6 },
});
