export type AlertLevel = "NORMAL" | "WARNING" | "EMERGENCY" | "UNKNOWN";

export type DeviceStatus = {
  mq2Raw: number;
  gasPercent: number;
  temperatureC: number;
  humidity: number;
  dhtValid: boolean;
  flame: boolean;
  /** Real buzzer GPIO state (newer firmware). Undefined on older firmware. */
  buzzer?: boolean;
  alert: AlertLevel;
  routerConnected: boolean;
  wifiMode: "ROUTER" | "ACCESS_POINT" | "CONNECTING";
};

/** Matches the /api/status JSON from the ESP32 sketch exactly. */
export function parseStatus(json: Record<string, unknown>): DeviceStatus {
  const num = (k: string) => Number(json[k]) || 0;
  return {
    mq2Raw: num("mq2Raw"),
    gasPercent: num("gasPercent"),
    temperatureC: num("temperatureC"),
    humidity: num("humidity"),
    dhtValid: json.dhtValid === true,
    flame: json.flame === true,
    buzzer: typeof json.buzzer === "boolean" ? json.buzzer : undefined,
    alert: ((json.alert as string) ?? "UNKNOWN") as AlertLevel,
    routerConnected: json.routerConnected === true,
    wifiMode: ((json.wifiMode as string) ?? "CONNECTING") as DeviceStatus["wifiMode"],
  };
}
