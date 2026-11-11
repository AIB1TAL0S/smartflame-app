import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";
import { useStore } from "./store";

const KEY_URL = "smartflame.espUrl";
const KEY_NUMBER = "smartflame.emergencyNumber";

async function read(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function write(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function saveEspUrl(url: string): Promise<void> {
  await write(KEY_URL, url);
}

export async function saveEmergencyNumber(n: string): Promise<void> {
  await write(KEY_NUMBER, n);
}

export function useSettingsBootstrap() {
  useEffect(() => {
    Promise.all([read(KEY_URL), read(KEY_NUMBER)])
      .then(([url, number]) => {
        if (url) useStore.getState().setEspUrl(url);
        // store default is "711"; saved value wins only if user ever saved one
        if (number) useStore.getState().setEmergencyNumber(number);
      })
      .catch(() => undefined);
  }, []);
}
