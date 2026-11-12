/**
 * SmartFlame main dashboard — instrument panel layout.
 *
 * Desktop (>=1024px): [ verdict strip | sensor dials | log + traces ]
 * Mobile: single column, verdict first.
 */

import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useEspSensorFeed } from "@/lib/sensorSource";
import { COLORS } from "@/components/dashboard/ui";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GlobalStatusBar } from "@/components/dashboard/GlobalStatusBar";
import { ConnectionCard } from "@/components/dashboard/ConnectionCard";
import { SystemStatusCard } from "@/components/dashboard/SystemStatusCard";
import { GasSensorCard } from "@/components/dashboard/GasSensorCard";
import { FlameSensorCard } from "@/components/dashboard/FlameSensorCard";
import { HeatSensorCard } from "@/components/dashboard/HeatSensorCard";
import { HardwareStatusCard } from "@/components/dashboard/HardwareStatusCard";
import { ActivityCard } from "@/components/dashboard/ActivityCard";
import { SensorAnalyticsCard } from "@/components/dashboard/SensorAnalyticsCard";

const GAP = 12;

export default function Dashboard() {
  useEspSensorFeed(); // live data from the ESP32 polling store
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  if (isDesktop) {
    // Row-based grid: two equal flex cells per row → equal-height cards with
    // aligned edges. Full-width rows follow for log + traces.
    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <DashboardHeader />
        <GlobalStatusBar />
        <ConnectionCard />
        <SystemStatusCard />
        <View style={styles.row}>
          <View style={styles.cell}>
            <GasSensorCard style={styles.grow} />
          </View>
          <View style={styles.cell}>
            <HeatSensorCard style={styles.grow} />
          </View>
        </View>
        {/* traces sit high — charts are a primary reading, not an appendix */}
        <SensorAnalyticsCard />
        <View style={styles.row}>
          <View style={styles.cell}>
            <FlameSensorCard style={styles.grow} />
          </View>
          <View style={styles.cell}>
            <HardwareStatusCard style={styles.grow} />
          </View>
        </View>
        <ActivityCard />
      </ScrollView>
    );
  }

  // Mobile / tablet: one column, alarm state first (above the masthead).
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <GlobalStatusBar />
      <DashboardHeader />
      <ConnectionCard />
      <SystemStatusCard />
      <GasSensorCard />
      <FlameSensorCard />
      <HeatSensorCard />
      <SensorAnalyticsCard />
      <HardwareStatusCard />
      <ActivityCard />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 18, paddingTop: 28, gap: GAP },
  row: { flexDirection: "row", gap: GAP, alignItems: "stretch" },
  cell: { flex: 1 },
  grow: { flex: 1 },
});
