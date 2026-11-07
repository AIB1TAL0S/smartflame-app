{
  "project": "SmartFlame",
  "tagline": "IoT-Enabled Fire Detection and Mobile Emergency Response System",
  "hardware": {
    "mcu": "ESP32",
    "sensors": ["MQ2 (gas/smoke, analog)", "Flame sensor module (digital)", "DHT11 (temp + humidity)"],
    "actuators": ["Active buzzer (alarm)", "16x2 LCD (I2C, status display)"],
    "firmwareNote": "Arduino framework. Blynk WiFi/MQTT lib connects as device with auth token; sends on change + every 5s heartbeat."
  },
  "blynk": {
    "server": "https://blynk.cloud",
    "region": "blynk.cloud (check console bottom-right for regional, e.g. lon1.blynk.cloud)",
    "template": "SmartFlame",
    "deviceName": "smartflame-01",
    "datastreams": [
      { "name": "gas",   "pin": "V0", "type": "Integer", "min": 0, "max": 4095, "unit": "ppm",   "desc": "MQ2 raw/PPM reading" },
      { "name": "flame", "pin": "V1", "type": "Integer", "min": 0, "max": 1,    "unit": "",      "desc": "0 = no flame, 1 = flame detected" },
      { "name": "temp",  "pin": "V2", "type": "Double",  "min": 0, "max": 50,   "unit": "°C",    "desc": "DHT11 temperature" },
      { "name": "hum",   "pin": "V3", "type": "Double",  "min": 0, "max": 100,  "unit": "%",     "desc": "DHT11 humidity" },
      { "name": "alarm", "pin": "V4", "type": "Integer", "min": 0, "max": 1,    "unit": "",      "desc": "Buzzer state; writable from app (mute)" }
    ],
    "webhook": {
      "trigger": "datastream fire condition: flame == 1 OR gas > threshold (set in Blynk automations or webhook on V1)",
      "url": "https://exp.host/--/api/v2/push/send",
      "method": "POST",
      "contentType": "application/json",
      "body": "{\"to\":\"EXPO_PUSH_TOKEN_HERE\",\"title\":\"🔥 FIRE ALERT\",\"body\":\"SmartFlame: gas={{gas}}ppm flame={{flame}} temp={{temp}}°C\",\"data\":{\"screen\":\"alert\"},\"sound\":\"default\",\"priority\":\"high\",\"channelId\":\"fire-alerts\"}"
    },
    "auth": "MCP tools create all of the above; device auth token handed to firmware"
  },
  "app": {
    "stack": ["Expo SDK 54", "expo-router v6", "TypeScript strict", "No native modules — Expo Go compatible"],
    "repo": "~/Documents/Github/PROJECTS/smartflame-app",
    "screens": [
      { "route": "/", "name": "Dashboard", "desc": "Gas gauge (animated), temp+hum cards, flame status pill, connection pill (isHardwareConnected), sparkline of last 50 gas polls, mute/unmute alarm button" },
      { "route": "/alert", "name": "Alert siren", "desc": "Full-screen red siren when fire_alert active; ignores mute for display but can mute buzzer via V4 write; dismiss only when flame clears" },
      { "route": "/settings", "name": "Settings", "desc": "Device token entry (SecureStore), region picker (blynk.cloud/lon1/…), poll interval, test-push button, Expo push token display" }
    ],
    "polling": {
      "endpoint": "https://{region}/external/api/getAll?token={deviceToken}",
      "interval": "3000ms (configurable 1-30s)",
      "also": "https://{region}/external/api/isHardwareConnected?token={deviceToken} → Online/Offline pill",
      "writeEndpoint": "https://{region}/external/api/update?token={deviceToken}&V4={0|1} for alarm mute",
      "backoff": "on fetch failure double interval up to 30s, reset on success"
    },
    "push": {
      "lib": "expo-notifications",
      "registration": "ExpoPushToken [Expo Go] via device push token → stored in SecureStore, shown in Settings",
      "handler": "App closed → OS notification. App open → expo-notifications listener routes to /alert",
      "androidChannel": "fire-alerts, importance max, bypass DND via priority high"
    },
    "state": "Zustand store: deviceData, history[50], connection, alarmMuted, pushToken, settings"
  },
  "acceptance": [
    "MCP get_device returns live values after fake-write script",
    "curl fake write flame=1 → Expo push receipt id within ~2s",
    "App dashboard reflects fake writes within one poll cycle",
    "/alert siren appears on push tap and on poll detection",
    "Alarm mute write flips V4 and ESP32-side buzzer silence is visible in console"
  ],
  "verification": [
    "scripts/fake-device.sh writes randomized + alert values via external API",
    "push receipt check: POST https://exp.host/--/api/v2/push/getReceipts",
    "app smoke: Expo Go on device, dashboard live, siren on flame=1"
  ],
  "planTierNotes": "Free Blynk plan: webhooks allowed (1 datastream webhook, 1/s rate). Device HTTPS API has ~10 req/s limit per device token; 3s polling is safe."
}
