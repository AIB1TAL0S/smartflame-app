import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useStore } from "./store";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const ANDROID_CHANNEL_ID = "fire-alerts";

export async function initNotifications(): Promise<string | null> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Fire alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      lightColor: "#FF1744",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
  const settings = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  if (!settings.granted) return null;

  const tokenRes = await Notifications.getExpoPushTokenAsync();
  // In Expo Go this resolves from the experience automatically; after `eas build`,
  // the projectId from app.json extra.eas.projectId is used.
  const token = tokenRes.data;
  useStore.getState().setPushToken(token);
  return token;
}

export function addNotificationResponseListener(onAlert: () => void) {
  return Notifications.addNotificationResponseReceivedListener(() => onAlert());
}
