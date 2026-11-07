import { useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { useStore } from "./store";

const KEY_TOKEN = "smartflame.token";
const KEY_REGION = "smartflame.region";
const KEY_POLL = "smartflame.pollMs";

export async function loadSettings(): Promise<void> {
  const [token, region, pollMs] = await Promise.all([
    SecureStore.getItemAsync(KEY_TOKEN),
    SecureStore.getItemAsync(KEY_REGION),
    SecureStore.getItemAsync(KEY_POLL),
  ]);
  useStore.getState().patchSettings({
    token: token ?? "",
    region: region ?? "blynk.cloud",
    pollMs: pollMs ? Math.min(Math.max(Number(pollMs) || 3000, 1000), 30000) : 3000,
  });
}

export async function saveSettings(): Promise<void> {
  const { token, region, pollMs } = useStore.getState().settings;
  const ops: Promise<unknown>[] = [
    SecureStore.setItemAsync(KEY_TOKEN, token),
    SecureStore.setItemAsync(KEY_REGION, region),
    SecureStore.setItemAsync(KEY_POLL, String(pollMs)),
  ];
  await Promise.all(ops);
}

export function useSettingsBootstrap() {
  useEffect(() => {
    loadSettings().catch(() => undefined);
  }, []);
}
