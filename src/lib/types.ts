export type Datastreams = {
  gas: number; // V0 ppm (MQ2 raw 0-4095)
  flame: number; // V1 0/1
  temp: number; // V2 °C
  hum: number; // V3 %
  alarm: number; // V4 0/1 buzzer state
};

export type DeviceSnapshot = {
  data: Datastreams;
  connected: boolean;
  at: number; // epoch ms
};

export const FIRE_ACTIVE = (d: Datastreams) => d.flame === 1;
