/** Shared visual primitives for the SmartFlame dashboard.
 *
 *  Design language: "instrument panel" — a fire-safety control surface,
 *  not a SaaS dashboard. One accent per reading, engraved labels, hairline
 *  separators instead of boxed cards. Warm charcoal base, phosphor-green
 *  status, ember-orange and alarm-red reserved for real trouble.
 */

import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { ReactNode } from "react";

export const COLORS = {
  bg: "#111210", // warm charcoal, not blue-black
  panel: "#191B18", // panel surface
  panelAlt: "#1F221E",
  text: "#EDEFE8", // warm white
  muted: "#A8ADA0", // AA on panel (4.8:1)
  faint: "#7A8073", // decorative only
  ok: "#7BD88F", // phosphor green
  warn: "#E8A33D", // ember amber
  fire: "#FF5A44", // alarm red-orange
  accent: "#D8C9A3", // brass/khaki for neutral highlights
  border: "#2A2D28",
  hairline: "#242621",
};

export const SEVERITY_COLOR = {
  info: COLORS.accent,
  warning: COLORS.warn,
  critical: COLORS.fire,
} as const;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= 1024;
}

/** Section header: engraved label style, no card box. */
export function Panel({
  title,
  right,
  children,
  style,
}: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.panel, style]}>
      {title ? (
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
    </View>
  );
}

/** Full-width hairline with optional label — replaces "card with border". */
export function Divider({ label }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      {label ? <Text style={styles.dividerLabel}>{label}</Text> : null}
      <View style={styles.hairline} />
    </View>
  );
}

export function StatusDot({ color, size = 8, pulse = false }: { color: string; size?: number; pulse?: boolean }) {
  return (
    <View style={{ width: size + (pulse ? 6 : 0), height: size + (pulse ? 6 : 0), alignItems: "center", justifyContent: "center" }}>
      {pulse ? <View style={{ position: "absolute", width: size + 6, height: size + 6, borderRadius: (size + 6) / 2, backgroundColor: color + "33" }} /> : null}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

/** Inline status label — small caps, letter-spaced, colored text only. */
export function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: color + "1F" }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

/** Key-value line inside a panel. */
export function DataRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: color ?? COLORS.text }]}>{value}</Text>
    </View>
  );
}

/** Big numeric readout with unit — the instrument voice of the panel. */
export function Readout({ value, unit, color, size = 40 }: { value: string; unit?: string; color?: string; size?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
      <Text style={{ fontSize: size, fontWeight: "700", color: color ?? COLORS.text, fontVariant: ["tabular-nums"], letterSpacing: -0.5 }}>
        {value}
      </Text>
      {unit ? <Text style={{ fontSize: 14, fontWeight: "600", color: COLORS.muted }}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.panel,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.hairline,
  },
  panelHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  panelTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 8 },
  dividerLabel: { color: COLORS.faint, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: "600" },
  hairline: { flex: 1, height: 1, backgroundColor: COLORS.hairline },
  chip: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  chipText: { fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.hairline,
  },
  rowLabel: { color: COLORS.muted, fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
