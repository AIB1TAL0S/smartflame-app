import { useEffect, useRef } from "react";
import { useStore } from "./store";
import { parseStatus } from "./types";

const POLL_MS = 1000; // HTTP fallback poll
const MAX_BACKOFF = 5; // ×POLL_MS = 5s worst case, stays under STALE_MS (6s) so a lossy WiFi never flaps OFFLINE
const WS_PORT = 81; // firmware WebSocketsServer port
const WS_RETRY_MS = 3000;
const WS_MAX_FAILS = 3; // after this many failed attempts, stop retrying — polling is enough

function toWsUrl(espUrl: string): string | null {
  try {
    const u = new URL(espUrl.replace(/^http/, "ws"));
    u.port = String(WS_PORT);
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Realtime sensor feed.
 *
 * Preferred path: WebSocket to ws://<esp>:81/ — the board pushes the same
 * status JSON as /api/status every 250 ms, so updates land instantly.
 *
 * Fallback path: whenever the socket is not open (older firmware, blocked
 * port, connecting…), the hook polls GET /api/status every second.
 *
 * If the WS endpoint fails repeatedly (firmware without WebSocket support,
 * blocked port), retries stop permanently for this session and polling
 * carries the feed — this is what keeps the dashboard from flapping
 * offline/online when only polling is available.
 */
export function useEspPoll() {
  const espUrl = useStore((s) => s.espUrl);
  const setStatus = useStore((s) => s.setStatus);
  const setError = useStore((s) => s.setError);
  const backoff = useRef(1);
  const wsFails = useRef(0);
  const wsDisabled = useRef(false);

  useEffect(() => {
    if (!espUrl) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let ws: WebSocket | null = null;
    let wsTimer: ReturnType<typeof setTimeout> | null = null;
    let socketOk = false;

    const connectSocket = () => {
      if (!alive || wsDisabled.current || socketOk) return;
      const wsUrl = toWsUrl(espUrl);
      if (!wsUrl) return;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        ws = null;
        return;
      }
      ws.onopen = () => {
        if (!alive) {
          ws?.close();
          return;
        }
        socketOk = true;
        wsFails.current = 0;
        backoff.current = 1;
        setError(null);
      };
      ws.onmessage = (ev) => {
        if (!alive || !socketOk || typeof ev.data !== "string") return;
        try {
          setStatus(parseStatus(JSON.parse(ev.data)));
        } catch {
          // ignore malformed frames; next push will resync
        }
      };
      ws.onclose = () => {
        ws = null;
        if (!alive) return;
        const wasOk = socketOk;
        socketOk = false;
        // never connected successfully → count the failure
        if (!wasOk) {
          wsFails.current += 1;
          if (wsFails.current >= WS_MAX_FAILS) {
            wsDisabled.current = true; // polling-only from here on
            return;
          }
        }
        wsTimer = setTimeout(connectSocket, WS_RETRY_MS);
      };
    };

    connectSocket();

    // Fallback tick: polls only while the socket is down; otherwise it
    // just idles at POLL_MS so it can resume the instant the socket drops.
    const tick = async () => {
      if (socketOk) {
        timer = setTimeout(tick, POLL_MS);
        return;
      }
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
        const msg = e instanceof Error ? e.message : String(e);
        const isWeb = typeof window !== "undefined";
        setError(
          isWeb && msg === "Failed to fetch"
            ? "blocked or unreachable — phone (Expo Go) works regardless; on web the ESP32 must send CORS headers (see firmware sendHeader)"
            : msg
        );
      }
      if (!alive) return;
      timer = setTimeout(tick, POLL_MS * backoff.current);
    };

    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
      if (wsTimer) clearTimeout(wsTimer);
      ws?.close();
    };
  }, [espUrl, setStatus, setError]);
}
