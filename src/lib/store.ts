import { create } from "zustand";
import { Datastreams, FIRE_ACTIVE } from "./types";

type Settings = {
  token: string;
  region: string; // "" = blynk.cloud global, else subdomain e.g. "lon1"
  pollMs: number;
};

type State = {
  data: Datastreams | null;
  history: number[]; // last 50 gas values
  connected: boolean | null;
  error: string | null;
  pushToken: string | null;
  settings: Settings;
  setSnapshot: (d: Datastreams, connected: boolean) => void;
  setError: (e: string | null) => void;
  setPushToken: (t: string | null) => void;
  patchSettings: (p: Partial<Settings>) => void;
  fireActive: () => boolean;
};

export const useStore = create<State>((set, get) => ({
  data: null,
  history: [],
  connected: null,
  error: null,
  pushToken: null,
  settings: { token: "", region: "blynk.cloud", pollMs: 3000 },
  setSnapshot: (d, connected) =>
    set((s) => ({
      data: d,
      connected,
      error: null,
      history: [...s.history, d.gas].slice(-50),
    })),
  setError: (e) => set({ error: e }),
  setPushToken: (t) => set({ pushToken: t }),
  patchSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  fireActive: () => {
    const d = get().data;
    return !!d && FIRE_ACTIVE(d);
  },
}));
