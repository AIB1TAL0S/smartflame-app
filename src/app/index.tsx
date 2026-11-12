/**
 * SmartFlame main dashboard — instrument panel layout.
 *
 * Desktop (>=1024px): [ verdict strip | sensor dials | log + traces ]
 * Mobile: single column, verdict first.
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
import { HardwareStatusCard } from "@/components/dashboard/HardwareStatusCard";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
import { SensorAnalyticsCard } from "@/components/dashboard/SensorAnalyticsCard";

const GAP = 12;

/** Shown while no ESP32 address is configured or the device is unreachable. */
function ConnectionBanner() {
  const espUrl = useStore((s) => s.espUrl);
  const error = useStore((s) => s.error);

  if (!espUrl) {
    return (
      <Pressable style={[styles.banner, { borderColor: COLORS.warn }]} onPress={() => router.push("/settings")}>
        <Text style={[styles.bannerText, { color: COLORS.warn }]}>
          No controller address configured — tap to add it in Settings (serial command "i" prints it).
        </Text>
      </Pressable>
    );
  }
  if (error) {
    return (
      <View style={[styles.banner, { borderColor: COLORS.fire }]}>
        <Text style={[styles.bannerText, { color: COLORS.fire }]}>
          {espUrl} unreachable ({error}) — check the phone is on the same WiFi as the ESP32.
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

  if (isDesktop) {
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <DashboardHeader />
        <ConnectionBanner />
        <SystemStatusCard />
        <View style={styles.desktopGrid}>
          <View style={styles.col}>
            <GasSensorCard />
            <FlameSensorCard />
          </View>
          <View style={styles.colWide}>
            <HeatSensorCard />
          </View>
          <View style={styles.col}>
            <HardwareStatusCard />
            <ActivityCard maxItems={7} />
          </View>
        </View>
        <SensorAnalyticsCard />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <DashboardHeader />
      <ConnectionBanner />
      <SystemStatusCard />
      <GasSensorCard />
      <FlameSensorCard />
      <HeatSensorCard />
      <HardwareStatusCard />
      <ActivityCard />
      {isTablet ? null : null}
      <SensorAnalyticsCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 18, paddingTop: 28, gap: GAP },
  desktopGrid: { flexDirection: "row", gap: GAP, alignItems: "flex-start" },
  col: { flex: 1, gap: GAP },
  colWide: { flex: 1.35, gap: GAP },
  banner: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  bannerText: { fontSize: 13, fontWeight: "600" },
});
