// ============================================================
//  SmartFlame — Fire Detection + Blynk Cloud + LCD + Buzzer
//  Board: ESP32 Dev Module (ESP32 DevKit V1, 30-pin)
//  Template: SmartFlame (TMPL2pv41vi-M)   Device: smartflame-01
//
//  Blynk datastreams:
//    V1 gas %        (device -> cloud, every 2 s + on change)
//    V2 flame 0/1    (device -> cloud, on change)
//    V3 temp °C      (device -> cloud, every 2 s)
//    V4 hum %        (device -> cloud, every 2 s)
//    V5 alarm 0/1    (cloud -> device: app mute; device also sets 1 on alert)
//
//  Libraries (Library Manager):
//    Blynk (v1.3.2+), DHT sensor library + Adafruit Unified Sensor,
//    LiquidCrystal I2C
//  Boards: esp32 by Espressif (Boards Manager)
//
//  Serial: 115200. Commands: t = 5 s alarm test, r = reset test
// ============================================================

#define BLYNK_TEMPLATE_ID   "TMPL2pv41vi-M"
#define BLYNK_TEMPLATE_NAME "SmartFlame"
#define BLYNK_AUTH_TOKEN    "tA6vSNzr7GirQiN4V-Hqdeuy8XEl80zY"

#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <WiFi.h>
#include <BlynkSimpleEsp32.h>

// ---------------- WiFi ----------------
char ssid[] = "YOUR_WIFI_SSID";
char pass[] = "YOUR_WIFI_PASSWORD";

// ---------------- Pins ----------------
#define PIN_MQ2_AOUT    34   // MQ-2 AO via divider (input-only ADC1)
#define PIN_DHT         26   // DHT11 DATA
#define PIN_I2C_SDA     21   // LCD SDA
#define PIN_I2C_SCL     22   // LCD SCL
#define PIN_BUZZER      25   // Buzzer + via 100 ohm
#define PIN_FLAME_DO    27   // Flame sensor DO

// ---------------- Flame ----------------
#define FLAME_ACTIVE_LOW         true
#define FLAME_DEBOUNCE_MS        80
#define FLAME_SAMPLE_INTERVAL_MS 20

// ---------------- LCD ----------------
#define LCD_ADDR        0x27
#define LCD_COLS        16
#define LCD_ROWS        2

// ---------------- MQ-2 calibration ----------------
#define MQ2_CLEAN_AIR_RAW       400
#define MQ2_HEAVY_SMOKE_RAW     3000

// ---------------- Thresholds ----------------
#define GAS_WARNING_PCT         30
#define GAS_EMERGENCY_PCT       60
#define TEMP_WARNING_C          45
#define TEMP_EMERGENCY_C        60

// ---------------- Timing ----------------
#define GAS_SAMPLE_INTERVAL_MS    200
#define DHT_SAMPLE_INTERVAL_MS    2000
#define DECISION_INTERVAL_MS      200
#define LCD_UPDATE_INTERVAL_MS    500
#define SERIAL_LOG_INTERVAL_MS    1000
#define BLYNK_PUSH_INTERVAL_MS    2000   // V1/V3/V4 heartbeat
#define ALERT_DEBOUNCE_SAMPLES    3
#define ALARM_TEST_MS             5000

// ---------------- WiFi timeout ----------------
#define WIFI_CONNECT_TIMEOUT_MS 30000   // run LCD-only mode if no WiFi

// ============================================================
enum AlertLevel : uint8_t { ALERT_NORMAL = 0, ALERT_WARNING = 1, ALERT_EMERGENCY = 2 };

struct SensorData {
  int  mq2Raw = MQ2_CLEAN_AIR_RAW;
  int  gasPercent = 0;
  int  temperatureC = 0;
  int  humidity = 0;
  bool dhtValid = false;
  bool flame = false;
};

LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
DHT dht(PIN_DHT, DHT11);
SensorData sensorData;

AlertLevel stableLevel = ALERT_NORMAL;
AlertLevel candidateLevel = ALERT_NORMAL;
uint8_t candidateCount = 0;

unsigned long alarmTestUntilMs = 0;
bool flameCandidate = false;
unsigned long flameChangeMs = 0;

unsigned long lastGasMs = 0, lastDhtMs = 0, lastFlameMs = 0;
unsigned long lastDecisionMs = 0, lastLcdMs = 0, lastLogMs = 0;
unsigned long lastBlynkPushMs = 0;

bool wifiUp = false;
bool blynkConnected = false;

// App mute state: 0 = muted by app, 1 = alarm allowed (default)
int8_t appAlarmEnable = 1;
int8_t lastSentV5 = -1;

// ============================================================
const char* levelToString(AlertLevel l) {
  switch (l) {
    case ALERT_NORMAL:    return "NORMAL";
    case ALERT_WARNING:   return "WARNING";
    case ALERT_EMERGENCY: return "EMERGENCY";
    default:              return "UNKNOWN";
  }
}

int clampInt(int v, int lo, int hi) { return v < lo ? lo : (v > hi ? hi : v); }
bool alarmTestActive() { return (long)(alarmTestUntilMs - millis()) > 0; }

// ---------------- Buzzer (ESP32 core 2.x and 3.x) ----------------
void buzzerBegin() {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
  ledcAttach(PIN_BUZZER, 2000, 8);
#else
  ledcSetup(0, 2000, 8);
  ledcAttachPin(PIN_BUZZER, 0);
#endif
}
void buzzerTone(unsigned int f) {
#if defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
  ledcWriteTone(PIN_BUZZER, f);
#else
  ledcWriteTone(0, f);
#endif
}
void buzzerOff() { buzzerTone(0); }

// ---------------- I2C scan ----------------
void i2cScan() {
  int count = 0;
  Serial.println("[I2C] Scanning...");
  for (uint8_t a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      Serial.printf("[I2C] Device found at 0x%02X\n", a);
      count++;
    }
  }
  if (count == 0) Serial.println("[I2C] No device found. Check SDA/SCL/VCC/GND wiring.");
  else Serial.printf("[I2C] LCD_ADDR is set to 0x%02X\n", LCD_ADDR);
}

// ---------------- Sampling ----------------
void sampleGas() {
  sensorData.mq2Raw = analogRead(PIN_MQ2_AOUT);
  int p = (int)lroundf((float)(sensorData.mq2Raw - MQ2_CLEAN_AIR_RAW) * 100.0f /
                       (float)(MQ2_HEAVY_SMOKE_RAW - MQ2_CLEAN_AIR_RAW));
  sensorData.gasPercent = clampInt(p, 0, 100);
}

void sampleDht() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    sensorData.temperatureC = (int)lroundf(t);
    sensorData.humidity = (int)lroundf(h);
    sensorData.dhtValid = true;
  } else {
    sensorData.dhtValid = false;
    Serial.println("[DHT] Read failed (check DATA on IO33, VCC, GND)");
  }
}

bool flameRawActive() {
  int v = digitalRead(PIN_FLAME_DO);
  return FLAME_ACTIVE_LOW ? (v == LOW) : (v == HIGH);
}

void sampleFlame(unsigned long now) {
  bool raw = flameRawActive();
  if (raw != flameCandidate) { flameCandidate = raw; flameChangeMs = now; }
  if (flameCandidate != sensorData.flame && (now - flameChangeMs) >= FLAME_DEBOUNCE_MS) {
    sensorData.flame = flameCandidate;
    Serial.printf("[FLAME] %s\n", sensorData.flame ? "FLAME DETECTED" : "flame cleared");
  }
}

// ---------------- Alert logic ----------------
AlertLevel computeInstantLevel() {
  AlertLevel level = ALERT_NORMAL;
  bool tempOk = sensorData.dhtValid;

  if (sensorData.gasPercent >= GAS_EMERGENCY_PCT || (tempOk && sensorData.temperatureC >= TEMP_EMERGENCY_C)) {
    level = ALERT_EMERGENCY;
  } else if (sensorData.gasPercent >= GAS_WARNING_PCT || (tempOk && sensorData.temperatureC >= TEMP_WARNING_C)) {
    level = ALERT_WARNING;
  }

  if (sensorData.flame) {
    if (level < ALERT_WARNING) level = ALERT_WARNING;
    bool gasHigh  = sensorData.gasPercent >= GAS_WARNING_PCT;
    bool tempHigh = tempOk && sensorData.temperatureC >= TEMP_WARNING_C;
    if (gasHigh || tempHigh) level = ALERT_EMERGENCY;
  }

  if (alarmTestActive()) level = ALERT_EMERGENCY;
  return level;
}

void updateDebouncedAlert() {
  AlertLevel instant = computeInstantLevel();

  if (instant == stableLevel) {
    candidateLevel = stableLevel;
    candidateCount = 0;
    return;
  }
  if (instant != candidateLevel) {
    candidateLevel = instant;
    candidateCount = 1;
  } else if (candidateCount < 255) {
    candidateCount++;
  }
  if (candidateCount >= ALERT_DEBOUNCE_SAMPLES) {
    stableLevel = candidateLevel;
    candidateCount = 0;
    Serial.printf("[ALERT] State changed -> %s\n", levelToString(stableLevel));
  }
}

// ---------------- Buzzer pattern ----------------
void updateBuzzer(unsigned long now) {
  static bool on = false;

  if (stableLevel == ALERT_NORMAL || appAlarmEnable == 0) {   // app mute honored
    if (on) { buzzerOff(); on = false; }
    return;
  }

  bool shouldOn;
  unsigned int freq;
  if (stableLevel == ALERT_WARNING) {          // 200 ms on, 1300 ms off
    shouldOn = (now % 1500) < 200;
    freq = 1400;
  } else {                                     // 250 ms on, 250 ms off
    shouldOn = (now % 500) < 250;
    freq = 2200;
  }

  if (shouldOn != on) {
    on = shouldOn;
    if (on) buzzerTone(freq); else buzzerOff();
  }
}

// ---------------- Blynk pushes ----------------
void pushToBlynk(unsigned long now) {
  if (!blynkConnected) return;

  // heartbeat: gas, temp, hum every BLYNK_PUSH_INTERVAL_MS
  if (now - lastBlynkPushMs >= BLYNK_PUSH_INTERVAL_MS) {
    lastBlynkPushMs = now;
    Blynk.virtualWrite(V1, sensorData.gasPercent);
    if (sensorData.dhtValid) {
      Blynk.virtualWrite(V3, sensorData.temperatureC);
      Blynk.virtualWrite(V4, sensorData.humidity);
    }
  }

  // flame on change (drives Blynk automation + app siren)
  static int lastFlameSent = -1;
  if (sensorData.flame != lastFlameSent) {
    lastFlameSent = sensorData.flame;
    Blynk.virtualWrite(V2, sensorData.flame ? 1 : 0);
  }

  // alarm state on change: sounding when alerting (unless muted) else 0
  int v5 = (stableLevel >= ALERT_WARNING && appAlarmEnable == 1) ? 1 : 0;
  if (v5 != lastSentV5) {
    lastSentV5 = v5;
    Blynk.virtualWrite(V5, v5);
  }
}

// ---------------- App -> device writes ----------------
BLYNK_WRITE(V5) {
  appAlarmEnable = param.asInt() ? 1 : 0;
  Serial.printf("[BLYNK] App set alarm enable = %d (%s)\n",
                appAlarmEnable, appAlarmEnable ? "SOUNDING allowed" : "MUTED by app");
}

// Reconnect handling
BLYNK_CONNECTED() {
  Serial.println("[BLYNK] Connected");
  // resync V5 so app mute survives device reboot
  Blynk.syncVirtual(V5);
}

// ---------------- LCD ----------------
void updateLcd() {
  char l1[24], l2[24];

  if (sensorData.dhtValid) {
    snprintf(l1, sizeof(l1), "G:%3d%% T:%2dC F:%c", sensorData.gasPercent, sensorData.temperatureC, sensorData.flame ? 'Y' : 'N');
    snprintf(l2, sizeof(l2), "%-9sH:%2d%%", levelToString(stableLevel), sensorData.humidity);
  } else {
    snprintf(l1, sizeof(l1), "G:%3d%% T:-- F:%c", sensorData.gasPercent, sensorData.flame ? 'Y' : 'N');
    snprintf(l2, sizeof(l2), "%-9sH:--%%", levelToString(stableLevel));
  }
  l1[16] = '\0';
  l2[16] = '\0';

  lcd.setCursor(0, 0); lcd.print("                ");
  lcd.setCursor(0, 0); lcd.print(l1);
  lcd.setCursor(0, 1); lcd.print("                ");
  lcd.setCursor(0, 1); lcd.print(l2);
}

// ---------------- Serial log ----------------
void logSerial() {
  Serial.printf("[DATA] mq2Raw=%d gas=%d%% temp=", sensorData.mq2Raw, sensorData.gasPercent);
  if (sensorData.dhtValid) Serial.printf("%dC hum=%d%%", sensorData.temperatureC, sensorData.humidity);
  else Serial.print("-- hum=--");
  Serial.printf(" flamePin=%s flame=%s level=%s wifi=%d blynk=%d mute=%d\n",
                digitalRead(PIN_FLAME_DO) ? "HIGH" : "LOW",
                sensorData.flame ? "YES" : "NO",
                levelToString(stableLevel),
                wifiUp, blynkConnected, appAlarmEnable == 0);
}

// ---------------- Serial commands ----------------
void handleSerialCommands() {
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == 't') {
      alarmTestUntilMs = millis() + ALARM_TEST_MS;
      Serial.println("[TEST] Alarm test for 5 s");
    } else if (c == 'r') {
      alarmTestUntilMs = 0;
      Serial.println("[TEST] Alarm test reset");
    }
  }
}

// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n[SYS] SmartFlame + Blynk starting");
  Serial.printf("[SYS] Template=%s Device=smartflame-01\n", BLYNK_TEMPLATE_ID);

  buzzerBegin();
  buzzerOff();
  pinMode(PIN_FLAME_DO, INPUT);
  analogReadResolution(12);

  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  Wire.setClock(100000);
  i2cScan();

  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print("SmartFlame");
  lcd.setCursor(0, 1); lcd.print("connecting WiFi...");

  dht.begin();

  buzzerTone(2000); delay(150); buzzerOff();

  // ---------- WiFi ----------
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, pass);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
    Serial.print(".");
  }
  wifiUp = (WiFi.status() == WL_CONNECTED);
  Serial.println();
  if (wifiUp) {
    Serial.printf("[WiFi] Connected: %s  IP: %s  RSSI: %d dBm\n",
                  ssid, WiFi.localIP().toString().c_str(), WiFi.RSSI());
    lcd.setCursor(0, 1); lcd.print("WiFi OK         ");
    Blynk.config(BLYNK_AUTH_TOKEN);
  } else {
    Serial.println("[WiFi] FAILED - LCD-only mode (sensors still work)");
    lcd.setCursor(0, 1); lcd.print("WiFi FAIL:local ");
  }

  flameCandidate = flameRawActive();
  sensorData.flame = flameCandidate;

  delay(1500);
  sampleGas();
  sampleDht();
  updateDebouncedAlert();
  updateLcd();

  Serial.println("[SYS] Ready. Commands: t = alarm test, r = reset");
}

void loop() {
  unsigned long now = millis();

  handleSerialCommands();

  if (wifiUp) {
    Blynk.run();
    blynkConnected = Blynk.connected();
    if (!blynkConnected && now - lastBlynkPushMs > 5000) {
      static unsigned long lastReconnectMs = 0;
      if (now - lastReconnectMs > 10000) {
        lastReconnectMs = now;
        Serial.println("[BLYNK] Reconnecting...");
        Blynk.connect(3000);
      }
    }
  }

  if (now - lastFlameMs >= FLAME_SAMPLE_INTERVAL_MS) { lastFlameMs = now; sampleFlame(now); }
  if (now - lastGasMs   >= GAS_SAMPLE_INTERVAL_MS)   { lastGasMs   = now; sampleGas(); }
  if (now - lastDhtMs   >= DHT_SAMPLE_INTERVAL_MS)   { lastDhtMs   = now; sampleDht(); }
  if (now - lastDecisionMs >= DECISION_INTERVAL_MS)  { lastDecisionMs = now; updateDebouncedAlert(); }

  updateBuzzer(now);
  if (wifiUp) pushToBlynk(now);

  if (now - lastLcdMs >= LCD_UPDATE_INTERVAL_MS)     { lastLcdMs = now; updateLcd(); }
  if (now - lastLogMs >= SERIAL_LOG_INTERVAL_MS)     { lastLogMs = now; logSerial(); }
}
