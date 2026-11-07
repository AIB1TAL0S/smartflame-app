import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { getAllUrl, hardwareUrl, parseGetAll } from "./blynk";

/**
 * Polls Blynk external API on an interval.
 * Backoff: interval doubles on failure up to 30s, resets on success.
 */
export function useBlynkPoll() {
  const settings = useStore((s) => s.settings);
  const setSnapshot = useStore((s) => s.setSnapshot);
  const setError = useStore((s) => s.setError);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const backoffRef = useRef(1);
  const stoppedRef = useRef(false);

  useEffect(() => {
    stoppedRef.current = false;

    const tick = async () => {
      const { token, region } = useStore.getState().settings;
      if (!token) return;
      try {
        const [dataRes, hwRes] = await Promise.all([
          fetch(getAllUrl(region, token)),
          fetch(hardwareUrl(region, token)),
        ]);
        if (!dataRes.ok) throw new Error(`getAll HTTP ${dataRes.status}`);
        const json = (await dataRes.json()) as Record<string, string>;
        let connected = false;
        if (hwRes.ok) {
          const t = await hwRes.text();
          connected = t.trim().toLowerCase() === "true";
        }
        backoffRef.current = 1;
        setSnapshot(parseGetAll(json), connected);
      } catch (e) {
        backoffRef.current = Math.min(backoffRef.current * 2, 10);
        setError(e instanceof Error ? e.message : String(e));
      }
    };

    const schedule = () => {
      if (stoppedRef.current) return;
      const { pollMs } = useStore.getState().settings;
      intervalRef.current = setInterval(async () => {
        await tick();
        clearInterval(intervalRef.current!);
        schedule();
      }, pollMs * backoffRef.current);
    };

    tick();
    schedule();

    return () => {
      stoppedRef.current = true;
      clearInterval(intervalRef.current);
    };
  }, [settings.token, settings.region, settings.pollMs, setSnapshot, setError]);
}
