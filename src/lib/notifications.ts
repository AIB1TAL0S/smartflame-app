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

  const tokenRes = await Notifications.getExpoPushTokenAsync({
    projectId: "93a7320a-041a-48ee-a87a-5dc942136a9c", // @hunhow/smartflame-app
  });
  const token = tokenRes.data;
  useStore.getState().setPushToken(token);
  return token;
}

export function addNotificationResponseListener(onAlert: () => void) {
  return Notifications.addNotificationResponseReceivedListener(() => onAlert());
}
