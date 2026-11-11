import { useEffect, useRef } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import { useStore } from "./store";

/**
 * Watches poll results. On EMERGENCY: fires a local notification banner
 * (web: notification API if permitted, native: Alert + auto-dial).
 * Auto-dial fires once per emergency episode; re-arms when alert clears.
 */
export function useEmergencyWatch() {
  const prevAlert = useRef<string | null>(null);

  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      const alert = state.status?.alert;
      if (!alert || alert === prevAlert.current) return;
      const was = prevAlert.current;
      prevAlert.current = alert;

      if (alert === "EMERGENCY" && was !== "EMERGENCY") {
        onEmergencyStart(state);
      } else if (was === "EMERGENCY" && alert !== "EMERGENCY") {
        onEmergencyEnd();
      }
    });
    return unsub;
  }, []);
}

async function onEmergencyStart(state: ReturnType<typeof useStore.getState>) {
  const number = state.emergencyNumber;

  // auto-dial once per episode
  if (!state.calledForAlert) {
    useStore.setState({ calledForAlert: true });
    if (number) {
      Linking.openURL(`tel:${number}`).catch(() => undefined);
    }
  }

  if (typeof window !== "undefined" && "Notification" in window) {
    // web: system notification (needs permission; falls back silently)
    try {
      if (Notification.permission === "granted") {
        new Notification("🔥 FIRE EMERGENCY", {
          body: `SmartFlame alert — calling ${number || "emergency"}...`,
          tag: "smartflame-fire",
        });
      } else if (Notification.permission !== "denied") {
        const p = await Notification.requestPermission();
        if (p === "granted") {
          new Notification("🔥 FIRE EMERGENCY", {
            body: `SmartFlame alert — calling ${number || "emergency"}...`,
            tag: "smartflame-fire",
          });
        }
      }
    } catch {
      /* web notification unavailable — in-app banner still shows */
    }
  } else {
    // native (Expo Go): in-app alert acts as the notification
    Alert.alert(
      "🔥 FIRE EMERGENCY",
      `Auto-dialing ${number || "emergency services"}...`,
      [{ text: "Understood" }]
    );
  }
}

function onEmergencyEnd() {
  useStore.setState({ calledForAlert: false });
}
