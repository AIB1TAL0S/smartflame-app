import { create } from "zustand";
import { AlertLevel, DeviceStatus } from "./types";

type State = {
  status: DeviceStatus | null;
  history: number[]; // gas % samples
  error: string | null;
  /** "" = not configured; e.g. "http://192.168.1.50" */
  espUrl: string;
  /** Emergency number dialed automatically on EMERGENCY */
  emergencyNumber: string;
  /** latch: true while current emergency episode already triggered auto-dial */
  calledForAlert: boolean;
  lastUpdate: number | null;
  setStatus: (s: DeviceStatus) => void;
  setError: (e: string | null) => void;
  setEspUrl: (u: string) => void;
  setEmergencyNumber: (n: string) => void;
};

export const useStore = create<State>((set) => ({
  status: null,
  history: [],
  error: null,
  espUrl: "",
  emergencyNumber: "711",
  calledForAlert: false,
  lastUpdate: null,
  setStatus: (s) =>
    set((prev) => ({
      status: s,
      history: [...prev.history, s.gasPercent].slice(-50),
      error: null,
      lastUpdate: Date.now(),
    })),
  setError: (e) => set({ error: e }),
  setEspUrl: (u) => set({ espUrl: u.replace(/\/+$/, "") }),
  setEmergencyNumber: (n) => set({ emergencyNumber: n.replace(/[^\d+]/g, "") }),
}));
