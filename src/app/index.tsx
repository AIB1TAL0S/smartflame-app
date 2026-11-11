/**
 * SmartFlame main dashboard.
 *
 * Mobile: single-column, status first, compact cards.
 * Desktop (>=1024px): multi-column professional grid.
 *
 * All sensor data comes from the centralized `useSensorSource` store.
 */

import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { useEspSensorFeed } from "@/lib/sensorSource";
import { useStore } from "@/lib/store";
import { COLORS } from "@/components/dashboard/ui";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SystemStatusCard } from "@/components/dashboard/SystemStatusCard";
import { GasSensorCard } from "@/components/dashboard/GasSensorCard";
import { FlameSensorCard } from "@/components/dashboard/FlameSensorCard";
import { HeatSensorCard } from "@/components/dashboard/HeatSensorCard";
import { HumiditySensorCard } from "@/components/dashboard/HumiditySensorCard";
import { HardwareStatusCard } from "@/components/dashboard/HardwareStatusCard";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
import { SensorAnalyticsCard } from "@/components/dashboard/SensorAnalyticsCard";

const GAP = 14;

/** Shown while no ESP32 address is configured or the device is unreachable. */
function ConnectionBanner() {
  const espUrl = useStore((s) => s.espUrl);
  const error = useStore((s) => s.error);

  if (!espUrl) {
    return (
      <Pressable style={[styles.banner, { borderColor: COLORS.warn }]} onPress={() => router.push("/settings")}>
        <Text style={[styles.bannerText, { color: COLORS.warn }]}>
          ⚠ No ESP32 address configured — tap to add it in Settings (serial command "i" prints it).
        </Text>
      </Pressable>
    );
  }
  if (error) {
    return (
      <View style={[styles.banner, { borderColor: COLORS.fire }]}>
        <Text style={[styles.bannerText, { color: COLORS.fire }]}>
          ⚠ {espUrl} unreachable ({error}) — check the phone is on the same WiFi as the ESP32.
        </Text>
      </View>
    );
  }
  return null;
}

export default function Dashboard() {
  useEspSensorFeed(); // live data from the ESP32 polling store
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const sensorCards = (
    <>
      <GasSensorCard />
      <FlameSensorCard />
      <HeatSensorCard />
      <HumiditySensorCard />
    </>
  );

  if (isDesktop) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <DashboardHeader />
        <ConnectionBanner />
        <View style={styles.desktopGrid}>
          <View style={styles.col}>
            <SystemStatusCard />
            <HardwareStatusCard />
          </View>
          <View style={styles.colWide}>{sensorCards}</View>
          <View style={styles.col}>
            <ActivityCard maxItems={8} />
            <SensorAnalyticsCard />
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <DashboardHeader />
      <ConnectionBanner />
      <SystemStatusCard />
      {isTablet ? <View style={styles.tabletRow}>{sensorCards}</View> : <View style={styles.stack}>{sensorCards}</View>}
      <HardwareStatusCard />
      <ActivityCard />
      <SensorAnalyticsCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0B0F14" },
  content: { padding: 16, paddingTop: 60, gap: GAP },
  stack: { gap: GAP },
  tabletRow: { flexDirection: "row", gap: GAP },
  desktopGrid: { flexDirection: "row", gap: GAP, alignItems: "flex-start" },
  col: { flex: 1, gap: GAP },
  colWide: { flex: 1.2, gap: GAP },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#141A22",
  },
  bannerText: { fontSize: 13, fontWeight: "600", lineHeight: 18 },
});
