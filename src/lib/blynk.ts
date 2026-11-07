import { Datastreams } from "./types";

// getAll returns {"V0":"123","V1":"1",...} — only datastreams that HAVE a value.
export function parseGetAll(json: Record<string, string>): Datastreams {
  const num = (k: string, dflt = 0) => {
    const v = json[k];
    if (v === undefined) return dflt;
    const n = Number(v);
    return Number.isFinite(n) ? n : dflt;
  };
  return {
    gas: num("V0"),
    flame: num("V1"),
    temp: num("V2"),
    hum: num("V3"),
    alarm: num("V4"),
  };
}

export function regionHost(region: string): string {
  return region === "blynk.cloud" ? "blynk.cloud" : `${region}.blynk.cloud`;
}

export function getAllUrl(region: string, token: string): string {
  return `https://${regionHost(region)}/external/api/getAll?token=${encodeURIComponent(token)}`;
}

export function hardwareUrl(region: string, token: string): string {
  return `https://${regionHost(region)}/external/api/isHardwareConnected?token=${encodeURIComponent(token)}`;
}

export function updateUrl(region: string, token: string, pin: string, value: number | string): string {
  return `https://${regionHost(region)}/external/api/update?token=${encodeURIComponent(token)}&${pin}=${encodeURIComponent(value)}`;
}
