import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { initNotifications, addNotificationResponseListener } from "@/lib/notifications";
import { useBlynkPoll } from "@/lib/useBlynkPoll";
import { useSettingsBootstrap } from "@/lib/persist";
import { router } from "expo-router";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useSettingsBootstrap();

  useEffect(() => {
    initNotifications().catch(() => undefined);
    const sub = addNotificationResponseListener(() => router.push("/alert"));
    SplashScreen.hideAsync().catch(() => undefined);
    return () => sub.remove();
  }, []);

  useBlynkPoll();

  const fireActive = useStore((s) => s.data?.flame === 1);

  useEffect(() => {
    if (fireActive) router.push("/alert");
  }, [fireActive]);

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
