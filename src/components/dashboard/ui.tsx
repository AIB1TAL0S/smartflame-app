/** Shared visual primitives for the SmartFlame dashboard.
 *
 *  Design language: "instrument panel" — a fire-safety control surface,
 *  not a SaaS dashboard. One accent per reading, engraved labels, hairline
 *  separators instead of boxed cards. Warm charcoal base, phosphor-green
 *  status, ember-orange and alarm-red reserved for real trouble.
 */

import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export const COLORS = {
  bg: "#111210", // warm charcoal, not blue-black
  panel: "#191B18", // panel surface
  panelAlt: "#1F221E",
  text: "#EDEFE8", // warm white
  muted: "#A8ADA0", // AA on panel (7.5:1)
  faint: "#8B9184", // AA on panel (5.3:1) — secondary text may use this
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

/**
 * Ticking wall-clock (ms epoch) that re-renders once per interval.
 * Returns null until the first tick — callers fall back to the event
 * timestamp itself for the initial paint (keeps Date.now() out of render).
 */
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

/** Compact relative time from an age in ms. */
function relAge(ageMs: number): string {
  const s = Math.max(0, Math.round(ageMs / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

/**
 * Relative timestamp ("10m ago") that turns amber past the expected update
 * interval and red when data is badly stale. Hover (web) or long-press
 * (mobile) reveals the absolute wall-clock time.
 */
export function TimeAgo({
  ts,
  warnMs = 5000,
  alertMs = 15000,
  prefix = "",
  style,
}: {
  ts: number;
  /** older than this → amber */
  warnMs?: number;
  /** older than this → red */
  alertMs?: number;
  prefix?: string;
  style?: object;
}) {
  const now = useNow(1000);
  const [showAbsolute, setShowAbsolute] = useState(false);
  if (now === null) return null;
  // Before the first tick the age is unknown — treat as just-updated.
  const age = Math.max(0, now - ts);
  const color = age >= alertMs ? COLORS.fire : age >= warnMs ? COLORS.warn : COLORS.muted;
  const label = showAbsolute
    ? new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : prefix + relAge(age);
  return (
    <Pressable
      hitSlop={6}
      onHoverIn={() => setShowAbsolute(true)}
      onHoverOut={() => setShowAbsolute(false)}
      onLongPress={() => setShowAbsolute((v) => !v)}
      accessibilityLabel={`Last updated ${label}`}
    >
      <Text style={[styles.timeAgo, style, { color }]}>{label}</Text>
    </Pressable>
  );
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
  style?: object | null;
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

/**
 * Severity glyphs — every status pairs a distinct shape with its color so
 * state is readable for color-blind users: ✓ ok · ▲ warning · ■ critical ·
 * ✕ unknown/offline · ◆ neutral highlight.
 */
export const GLYPH: { ok: string; warn: string; fire: string; unknown: string; accent: string } = {
  ok: "✓",
  warn: "▲",
  fire: "■",
  unknown: "✕",
  accent: "◆",
};

const GLYPH_BY_COLOR: Record<string, string> = {
  [COLORS.ok]: GLYPH.ok,
  [COLORS.warn]: GLYPH.warn,
  [COLORS.fire]: GLYPH.fire,
  [COLORS.muted]: GLYPH.unknown,
  [COLORS.accent]: GLYPH.accent,
};

/** Inline status label — glyph + small caps, letter-spaced, colored text. */
export function Chip({ label, color, glyph }: { label: string; color: string; glyph?: string }) {
  const g = glyph ?? GLYPH_BY_COLOR[color] ?? "•";
  return (
    <View style={[styles.chip, { backgroundColor: color + "1F" }]}>
      <Text style={[styles.chipText, { color }]}>
        {g} {label}
      </Text>
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
  timeAgo: { fontSize: 12, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
