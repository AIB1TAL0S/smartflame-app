/** Shared visual primitives for the SmartFlame dashboard (dark theme). */

import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import type { ReactNode } from "react";

export const COLORS = {
  bg: "#0B0F14",
  card: "#141A22",
  cardAlt: "#1B232E",
  text: "#E8EEF5",
  muted: "#8B98A8",
  faint: "#5B6675",
  ok: "#2ECC71",
  warn: "#F39C12",
  fire: "#FF1744",
  accent: "#3B82F6",
  border: "#232C38",
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

export function Card({
  title,
  children,
  accentColor,
  style,
}: {
  title?: string;
  children: ReactNode;
  accentColor?: string;
  style?: object;
}) {
  return (
    <View style={[styles.card, accentColor ? { borderLeftWidth: 4, borderLeftColor: accentColor } : null, style]}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function StatusDot({ color, size = 10 }: { color: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

export function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: color + "22", borderColor: color }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

export function DataRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: color ?? COLORS.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  chip: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7 },
  rowLabel: { color: COLORS.muted, fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: "700" },
});
