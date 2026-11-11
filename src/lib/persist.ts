import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { useStore } from "./store";

const KEY_URL = "smartflame.espUrl";

async function readUrl(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(KEY_URL);
  }
  return SecureStore.getItemAsync(KEY_URL);
}

async function writeUrl(url: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(KEY_URL, url);
    return;
  }
  await SecureStore.setItemAsync(KEY_URL, url);
}

export async function saveEspUrl(url: string): Promise<void> {
  await writeUrl(url);
}

export function useSettingsBootstrap() {
  useEffect(() => {
    readUrl()
      .then((u) => {
        if (u) useStore.getState().setEspUrl(u);
      })
      .catch(() => undefined);
  }, []);
}
