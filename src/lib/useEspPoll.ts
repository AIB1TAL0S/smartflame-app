import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { parseStatus } from "./types";

const POLL_MS = 1000; // sketch serves fresh JSON every request
const MAX_BACKOFF = 8;

/** Polls the ESP32 web dashboard API every second (LAN only). */
export function useEspPoll() {
  const espUrl = useStore((s) => s.espUrl);
  const setStatus = useStore((s) => s.setStatus);
  const setError = useStore((s) => s.setError);
  const backoff = useRef(1);

  useEffect(() => {
    if (!espUrl) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await fetch(`${espUrl}/api/status`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!alive) return;
        backoff.current = 1;
        setStatus(parseStatus(json));
      } catch (e) {
        if (!alive) return;
        backoff.current = Math.min(backoff.current * 2, MAX_BACKOFF);
        setError(e instanceof Error ? e.message : String(e));
      }
      if (!alive) return;
      timer = setTimeout(tick, POLL_MS * backoff.current);
    };

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [espUrl, setStatus, setError]);
}
