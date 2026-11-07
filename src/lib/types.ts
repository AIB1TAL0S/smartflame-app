export type Datastreams = {
  gas: number; // V1 percent 0-100 (MQ2 normalized by firmware)
  flame: number; // V2 0/1
  temp: number; // V3 °C
  hum: number; // V4 %
  alarm: number; // V5 0/1 buzzer state
};

export type DeviceSnapshot = {
  data: Datastreams;
  connected: boolean;
  at: number; // epoch ms
};

export const FIRE_ACTIVE = (d: Datastreams) => d.flame === 1;
