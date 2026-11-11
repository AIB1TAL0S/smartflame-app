import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { useStore } from "./store";

/** Dial the emergency number via the OS dialer (user presses call). */
export async function callEmergency(number: string): Promise<void> {
  const url = Platform.OS === "web"
    ? `tel:${number}`
    : `tel:${number}`;
  await Linking.openURL(url);
}

/** Called when a fresh snapshot crosses into EMERGENCY. */
export function onFireDetected(): void {
  const { emergencyNumber, calledForAlert } = useStore.getState();
  // auto-dial once per emergency episode
  if (!calledForAlert) {
    useStore.setState({ calledForAlert: true });
    if (emergencyNumber) {
      callEmergency(emergencyNumber).catch(() => undefined);
    }
  }
}

/** Reset the latch when alert clears. */
export function onFireCleared(): void {
  const { calledForAlert } = useStore.getState();
  if (calledForAlert) {
    useStore.setState({ calledForAlert: false });
  }
}
