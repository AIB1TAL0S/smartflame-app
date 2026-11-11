import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { useStore } from "./store";

const KEY_URL = "smartflame.espUrl";

export async function saveEspUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEY_URL, url);
}

export function useSettingsBootstrap() {
  useEffect(() => {
    SecureStore.getItemAsync(KEY_URL)
      .then((u) => {
        if (u) useStore.getState().setEspUrl(u);
      })
      .catch(() => undefined);
  }, []);
}
