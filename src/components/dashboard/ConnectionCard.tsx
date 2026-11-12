/**
 * ConnectionCard — the single primary connection indicator.
 *
 * Merges the old technical error banner, the header "LINK FAULT" pill, and
 * the "Waiting for hardware" hero copy into one card that only appears when
 * something is actually wrong:
 *  - no controller address configured → prompt to open Settings
 *  - unreachable / offline            → short human message + Retry button
 *                                       + collapsible "Details" with the
 *                                       raw technical error text.
 */

import { Pressable, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useStore } from "@/lib/store";
import { useSensorSource, timeAgo } from "@/lib/sensorSource";
import { COLORS } from "./ui";

function hostOf(espUrl: string): string {
  try {
    return new URL(espUrl).host;
  } catch {
    return espUrl;
  }
}

export function ConnectionCard() {
  const espUrl = useStore((s) => s.espUrl);
  const error = useStore((s) => s.error);
  const retry = useStore((s) => s.retry);
  const lastUpdate = useStore((s) => s.lastUpdate);
  const controller = useSensorSource((s) => s.hardware.controller);
  const [showDetails, setShowDetails] = useState(false);

  // Healthy link (or mid-reconnect after retry) → show nothing.
  if (espUrl && controller && !error) return null;

  if (!espUrl) {
    return (
      <Pressable style={[styles.card, styles.warnBorder]} onPress={() => router.push("/settings")}>
        <Text style={styles.short}>No controller configured</Text>
        <Text style={styles.sub}>Tap to add the SmartFlame address in Settings.</Text>
      </Pressable>
    );
  }

  const offline = !controller;
  const short = offline
    ? `Can't reach controller at ${hostOf(espUrl)}`
    : "Trouble talking to the controller";

  return (
    <View style={[styles.card, styles.badBorder]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.short}>{short}</Text>
          <Text style={styles.sub}>
            {lastUpdate ? `Last contact ${timeAgo(lastUpdate)}.` : "No data received yet."}{" "}
            Check that the phone and the ESP32 are on the same WiFi.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry connection"
          style={styles.retryBtn}
          onPress={retry}
        >
          <Text style={styles.retryText}>↻ Retry</Text>
        </Pressable>
      </View>

      {error ? (
        <View>
          <Pressable hitSlop={8} onPress={() => setShowDetails((v) => !v)} style={styles.detailsToggle}>
            <Text style={styles.detailsToggleText}>{showDetails ? "▾ Details" : "▸ Details"}</Text>
          </Pressable>
          {showDetails ? <Text style={styles.details}>{error}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.panel,
    gap: 8,
  },
  warnBorder: { borderColor: COLORS.warn + "66" },
  badBorder: { borderColor: COLORS.fire + "66" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  short: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
  sub: { color: COLORS.muted, fontSize: 12.5, marginTop: 3 },
  retryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  retryText: { color: COLORS.bg, fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  detailsToggle: { paddingVertical: 4 },
  detailsToggleText: { color: COLORS.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  details: {
    color: COLORS.faint,
    fontSize: 12,
    lineHeight: 17,
    backgroundColor: COLORS.panelAlt,
    borderRadius: 6,
    padding: 10,
    marginTop: 4,
  },
});