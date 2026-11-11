import { useEffect, useRef } from "react";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useStore } from "@/lib/store";
import { useSettingsBootstrap } from "@/lib/persist";
import { useEspPoll } from "@/lib/useEspPoll";
import { useEmergencyWatch } from "@/lib/useEmergencyWatch";
import { requestEmergencyPermissions } from "@/lib/permissions";

import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const permsAsked = useRef(false);

  useSettingsBootstrap();
  useEspPoll();
  useEmergencyWatch();

  // Ask once per app launch: notifications + emergency call
  useEffect(() => {
    if (permsAsked.current) return;
    permsAsked.current = true;
    requestEmergencyPermissions().catch(() => undefined);
  }, []);

  const fireActive = useStore((s) => s.status?.alert === "EMERGENCY");

  useEffect(() => {
    if (fireActive) router.navigate("/alert");
  }, [fireActive]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="alert" options={{ presentation: "fullScreenModal" }} />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}
