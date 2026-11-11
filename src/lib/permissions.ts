import { Platform, PermissionsAndroid, Alert } from "react-native";

/**
 * Requests Android runtime permissions needed for emergency response:
 * - CALL_PHONE: auto-dial 711 on EMERGENCY (DANGEROUS permission → system dialog)
 * - POST_NOTIFICATIONS: fire alert banner (Android 13+ → system dialog)
 * Call once at first app start (or from Settings screen). Idempotent.
 * Returns summary of what was granted.
 */
export async function requestEmergencyPermissions(): Promise<{
  call: boolean;
  notifications: boolean;
}> {
  if (Platform.OS !== "android") {
    return { call: true, notifications: true }; // iOS/web: tel: needs no permission
  }

  let call = true;
  let notifications = true;

  // Android 13 (API 33)+ requires runtime request for notifications
  if (Platform.Version >= 33) {
    try {
      const res = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Fire Alert Notifications",
          message:
            "SmartFlame needs to notify you immediately when fire or gas is detected.",
          buttonPositive: "Allow",
          buttonNegative: "Don't allow",
        }
      );
      notifications = res === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
      notifications = false;
    }
  }

  try {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
      {
        title: "Emergency Calling",
        message:
          "SmartFlame automatically dials your emergency number (711) when fire is detected. Allow direct calling?",
        buttonPositive: "Allow",
        buttonNegative: "Don't allow",
      }
    );
    // dialing via tel: link still works without CALL_PHONE (dialer opens),
    // but grant enables future direct dialing
    call = res === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    call = false;
  }

  return { call, notifications };
}

/** True if we should explain why before asking (better accept rate). */
export function showPermissionRationale(onContinue: () => void): void {
  Alert.alert(
    "Enable Emergency Features",
    "SmartFlame can notify you and auto-dial 711 the moment fire is detected. Android will ask you to allow notifications and calls.",
    [
      { text: "Not now", style: "cancel" },
      { text: "Enable", onPress: onContinue },
    ]
  );
}
