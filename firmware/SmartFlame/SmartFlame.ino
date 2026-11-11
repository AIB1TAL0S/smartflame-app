// ============================================================
// SMARTFLAME - WiFi + WEB DASHBOARD + ACCESS POINT FALLBACK
// Board: ESP32 Dev Module (ESP32 DevKit V1)
// ============================================================
#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include "driver/gpio.h"
// ============================================================
// WIFI CONFIGURATION
// ============================================================
const char* WIFI_SSID = "YOUR_WIFI_NAME";        // your router WiFi name
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"; // your router WiFi password
const char* AP_SSID = "SmartFlame-ESP32";
const char* AP_PASSWORD = "flame1234";
// ============================================================
// PIN CONFIGURATION
// ============================================================
#define PIN_MQ2_AOUT 34
#define PIN_DHT 33
#define PIN_I2C_SDA 21
#define PIN_I2C_SCL 22
#define PIN_BUZZER 25
#define PIN_FLAME_DO 27
// ============================================================
// BUZZER CONFIGURATION
// ============================================================
#define BUZZER_ACTIVE false
#define WARNING_FREQ_HZ 2700
#define WARNING_CYCLE_MS 1200
#define WARNING_BEEP_MS 400
#define EMERGENCY_FREQ_HZ 3200
#define EMERGENCY_CYCLE_MS 400
#define EMERGENCY_BEEP_MS 300
// ============================================================
// FLAME SENSOR
// ============================================================
#define FLAME_ACTIVE_LOW true
#define FLAME_DEBOUNCE_MS 80
#define FLAME_SAMPLE_INTERVAL_MS 20
// ============================================================
// LCD CONFIGURATION
// ============================================================
#define LCD_ADDR 0x27
#define LCD_COLS 16
#define LCD_ROWS 2
// ============================================================
// MQ2 CALIBRATION
// ============================================================
#define MQ2_CLEAN_AIR_RAW 400
#define MQ2_HEAVY_SMOKE_RAW 3000
// ============================================================
// ALERT THRESHOLDS
// ============================================================
#define GAS_WARNING_PCT 30
#define GAS_EMERGENCY_PCT 60
#define TEMP_WARNING_C 45
#define TEMP_EMERGENCY_C 60
// ============================================================
// TIMING
// ============================================================
#define GAS_SAMPLE_INTERVAL_MS 200
#define DHT_SAMPLE_INTERVAL_MS 2000
#define DECISION_INTERVAL_MS 200
#define LCD_UPDATE_INTERVAL_MS 500
#define SERIAL_LOG_INTERVAL_MS 1000
#define ALERT_DEBOUNCE_SAMPLES 3
#define ALARM_TEST_MS 5000
// ============================================================
// WIFI TIMING
// ============================================================
#define WIFI_CONNECT_TIMEOUT_MS 15000UL
#define WIFI_RETRY_INTERVAL_MS 10000UL
// ============================================================
// DATA STRUCTURES
// ============================================================
enum AlertLevel : uint8_t {
ALERT_NORMAL = 0,
ALERT_WARNING = 1,
ALERT_EMERGENCY = 2
};
struct SensorData {
int mq2Raw = MQ2_CLEAN_AIR_RAW;
int gasPercent = 0;
int temperatureC = 0;
int humidity = 0;
bool dhtValid = false;
bool flame = false;
};
// ============================================================
// OBJECTS
// ============================================================
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);
DHT dht(PIN_DHT, DHT11);
WebServer server(80);
// Realtime push: status JSON broadcast to every connected app (port 81).
// Requires the "WebSockets" library by Markus Sattler (Arduino Library Manager).
WebSocketsServer webSocket(81);
SensorData sensorData;
// ============================================================
// GLOBAL VARIABLES
// ============================================================
AlertLevel stableLevel = ALERT_NORMAL;
AlertLevel candidateLevel = ALERT_NORMAL;
uint8_t candidateCount = 0;
unsigned long alarmTestUntilMs = 0;
bool flameCandidate = false;
unsigned long flameChangeMs = 0;
unsigned long lastGasMs = 0;
unsigned long lastDhtMs = 0;
unsigned long lastFlameMs = 0;
unsigned long lastDecisionMs = 0;
unsigned long lastLcdMs = 0;
unsigned long lastLogMs = 0;
bool apActive = false;
bool wifiAttemptInProgress = false;
unsigned long wifiAttemptStartedMs = 0;
unsigned long lastWifiRetryMs = 0;
unsigned long lastPushMs = 0;
// ============================================================
// UTILITY FUNCTIONS
// ============================================================
const char* levelToString(AlertLevel level) {
switch (level) {
case ALERT_NORMAL:
return "NORMAL";
case ALERT_WARNING:
return "WARNING";
case ALERT_EMERGENCY:
return "EMERGENCY";
default:
return "UNKNOWN";
}
}
int clampInt(int value, int low, int high) {
return value < low ? low :
(value > high ? high : value);
}
bool alarmTestActive() {
return (long)(alarmTestUntilMs - millis()) > 0;
}
// ============================================================
// BUZZER FUNCTIONS
// ============================================================
void buzzerBegin() {
pinMode(PIN_BUZZER, OUTPUT);
gpio_set_drive_capability(
(gpio_num_t)PIN_BUZZER,
GPIO_DRIVE_CAP_3
);
digitalWrite(PIN_BUZZER, LOW);
#if !BUZZER_ACTIVE && !(defined(ESP_ARDUINO_VERSION_MAJOR) &&
(ESP_ARDUINO_VERSION_MAJOR >= 3))
ledcSetup(0, 2000, 8);
ledcAttachPin(PIN_BUZZER, 0);
#endif
}
void buzzerTone(unsigned int frequency) {
#if BUZZER_ACTIVE
digitalWrite(PIN_BUZZER, frequency > 0 ? HIGH : LOW);
#elif defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
if (frequency > 0)
tone(PIN_BUZZER, frequency);
else
noTone(PIN_BUZZER);
#else
ledcWriteTone(0, frequency);
#endif
}
void buzzerOff() {
#if BUZZER_ACTIVE
digitalWrite(PIN_BUZZER, LOW);
#elif defined(ESP_ARDUINO_VERSION_MAJOR) && (ESP_ARDUINO_VERSION_MAJOR >= 3)
noTone(PIN_BUZZER);
#else
ledcWriteTone(0, 0);
#endif
}
// ============================================================
// I2C SCANNER
// ============================================================
void i2cScan() {
int count = 0;
Serial.println("[I2C] Scanning...");
for (uint8_t address = 1; address < 127; address++) {
Wire.beginTransmission(address);
if (Wire.endTransmission() == 0) {
Serial.printf(
"[I2C] Device found at 0x%02X\n",
address
);
count++;
}
}
if (count == 0) {
Serial.println("[I2C] No device found.");
} else {
Serial.printf(
"[I2C] LCD address: 0x%02X\n",
LCD_ADDR
);
}
}
// ============================================================
// SENSOR SAMPLING
// ============================================================
void sampleGas() {
sensorData.mq2Raw = analogRead(PIN_MQ2_AOUT);
int percent = (int)lroundf(
(float)(sensorData.mq2Raw - MQ2_CLEAN_AIR_RAW) * 100.0f /
(float)(MQ2_HEAVY_SMOKE_RAW - MQ2_CLEAN_AIR_RAW)
);
sensorData.gasPercent = clampInt(percent, 0, 100);
}
void sampleDht() {
float temperature = dht.readTemperature();
float humidity = dht.readHumidity();
if (!isnan(temperature) && !isnan(humidity)) {
sensorData.temperatureC = (int)lroundf(temperature);
sensorData.humidity = (int)lroundf(humidity);
sensorData.dhtValid = true;
} else {
sensorData.dhtValid = false;
Serial.println("[DHT] Read failed.");
}
}
bool flameRawActive() {
int value = digitalRead(PIN_FLAME_DO);
return FLAME_ACTIVE_LOW ?
(value == LOW) :
(value == HIGH);
}
void sampleFlame(unsigned long now) {
bool rawActive = flameRawActive();
if (rawActive != flameCandidate) {
flameCandidate = rawActive;
flameChangeMs = now;
}
if (
flameCandidate != sensorData.flame &&
(now - flameChangeMs) >= FLAME_DEBOUNCE_MS
) {
sensorData.flame = flameCandidate;
Serial.printf(
"[FLAME] %s\n",
sensorData.flame ? "FLAME DETECTED" : "FLAME CLEARED"
);
}
}
// ============================================================
// ALERT LOGIC
// ============================================================
AlertLevel computeInstantLevel() {
AlertLevel level = ALERT_NORMAL;
bool temperatureValid = sensorData.dhtValid;
if (
sensorData.gasPercent >= GAS_EMERGENCY_PCT ||
(
temperatureValid &&
sensorData.temperatureC >= TEMP_EMERGENCY_C
)
) {
level = ALERT_EMERGENCY;
} else if (
sensorData.gasPercent >= GAS_WARNING_PCT ||
(
temperatureValid &&
sensorData.temperatureC >= TEMP_WARNING_C
)
) {
level = ALERT_WARNING;
}
if (sensorData.flame) {
if (level < ALERT_WARNING)
level = ALERT_WARNING;
bool gasHigh =
sensorData.gasPercent >= GAS_WARNING_PCT;
bool temperatureHigh =
temperatureValid &&
sensorData.temperatureC >= TEMP_WARNING_C;
if (gasHigh || temperatureHigh)
level = ALERT_EMERGENCY;
}
if (alarmTestActive())
level = ALERT_EMERGENCY;
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
Serial.printf(
"[ALERT] State changed -> %s\n",
levelToString(stableLevel)
);
}
}
// ============================================================
// BUZZER ALERT PATTERN
// ============================================================
void updateBuzzer(unsigned long now) {
static bool buzzerOn = false;
static AlertLevel previousLevel = ALERT_NORMAL;
if (stableLevel != previousLevel) {
previousLevel = stableLevel;
buzzerOff();
buzzerOn = false;
}
if (stableLevel == ALERT_NORMAL) {
if (buzzerOn) {
buzzerOff();
buzzerOn = false;
}
return;
}
bool shouldBeOn;
unsigned int frequency;
if (stableLevel == ALERT_WARNING) {
shouldBeOn =
(now % WARNING_CYCLE_MS) < WARNING_BEEP_MS;
frequency = WARNING_FREQ_HZ;
} else {
shouldBeOn =
(now % EMERGENCY_CYCLE_MS) < EMERGENCY_BEEP_MS;
frequency = EMERGENCY_FREQ_HZ;
}
if (shouldBeOn != buzzerOn) {
buzzerOn = shouldBeOn;
if (buzzerOn)
buzzerTone(frequency);
else
buzzerOff();
}
}
// ============================================================
// LCD DISPLAY
// ============================================================
void updateLcd() {
char line1[24];
char line2[24];
if (sensorData.dhtValid) {
snprintf(
line1,
sizeof(line1),
"G:%3d%% T:%2dC F:%c",
sensorData.gasPercent,
sensorData.temperatureC,
sensorData.flame ? 'Y' : 'N'
);
snprintf(
line2,
sizeof(line2),
"%-9sH:%2d%%",
levelToString(stableLevel),
sensorData.humidity
);
} else {
snprintf(
line1,
sizeof(line1),
"G:%3d%% T:-- F:%c",
sensorData.gasPercent,
sensorData.flame ? 'Y' : 'N'
);
snprintf(
line2,
sizeof(line2),
"%-9sH:--%%",
levelToString(stableLevel)
);
}
line1[16] = '\0';
line2[16] = '\0';
lcd.setCursor(0, 0);
lcd.print("                ");
lcd.setCursor(0, 0);
lcd.print(line1);
lcd.setCursor(0, 1);
lcd.print("                ");
lcd.setCursor(0, 1);
lcd.print(line2);
}
// ============================================================
// WIFI ACCESS POINT
// ============================================================
void startFallbackAP() {
if (apActive)
return;
WiFi.mode(WIFI_AP_STA);
bool started = WiFi.softAP(
AP_SSID,
AP_PASSWORD
);
if (started) {
apActive = true;
Serial.println("[WIFI] Fallback hotspot started.");
Serial.printf(
"[WIFI] Hotspot name: %s\n",
AP_SSID
);
Serial.printf(
"[WIFI] Hotspot IP: %s\n",
WiFi.softAPIP().toString().c_str()
);
} else {
Serial.println("[WIFI] ERROR: Could not start hotspot.");
}
}
void stopFallbackAP() {
if (!apActive)
return;
WiFi.softAPdisconnect(true);
apActive = false;
Serial.println("[WIFI] Router connected; hotspot stopped.");
}
// ============================================================
// WIFI ROUTER CONNECTION
// ============================================================
void beginRouterConnection() {
if (
strlen(WIFI_SSID) == 0 ||
strcmp(WIFI_SSID, "YOUR_ROUTER_WIFI_NAME") == 0
) {
Serial.println("[WIFI] Router credentials not configured.");
startFallbackAP();
return;
}
WiFi.mode(
apActive ? WIFI_AP_STA : WIFI_STA
);
WiFi.setAutoReconnect(true);
WiFi.begin(
WIFI_SSID,
WIFI_PASSWORD
);
wifiAttemptInProgress = true;
wifiAttemptStartedMs = millis();
lastWifiRetryMs = millis();
Serial.printf(
"[WIFI] Connecting to router: %s\n",
WIFI_SSID
);
}
void setupWiFi() {
WiFi.persistent(false);
WiFi.setSleep(false);
// Start hotspot immediately.
startFallbackAP();
// Try connecting to router.
beginRouterConnection();
}
// ============================================================
// WIFI RECONNECTION
// ============================================================
void maintainWiFi(unsigned long now) {
if (WiFi.status() == WL_CONNECTED) {
if (wifiAttemptInProgress) {
wifiAttemptInProgress = false;
Serial.println("[WIFI] Router connection successful.");
Serial.printf(
"[WIFI] Dashboard: http://%s/\n",
WiFi.localIP().toString().c_str()
);
stopFallbackAP();
}
return;
}
if (
wifiAttemptInProgress &&
(now - wifiAttemptStartedMs >= WIFI_CONNECT_TIMEOUT_MS)
) {
wifiAttemptInProgress = false;
Serial.println("[WIFI] Router connection timed out.");
startFallbackAP();
}
if (
!wifiAttemptInProgress &&
(now - lastWifiRetryMs >= WIFI_RETRY_INTERVAL_MS)
) {
lastWifiRetryMs = now;
Serial.println("[WIFI] Retrying router connection...");
beginRouterConnection();
}
if (
WiFi.status() != WL_CONNECTED &&
!apActive
) {
startFallbackAP();
}
}
// ============================================================
// WEB DASHBOARD HTML
// ============================================================
const char DASHBOARD_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SmartFlame Dashboard</title>
<style>
* {
box-sizing: border-box;
}
body {
margin: 0;
padding: 20px;
font-family: Arial, sans-serif;
background: #101827;
color: #f4f7fb;
}
main {
max-width: 850px;
margin: auto;
}
h1 {
margin-bottom: 6px;
}
.sub {
color: #aab7c8;
margin-top: 0;
}
.grid {
display: grid;
grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
gap: 14px;
margin-top: 22px;
}
.card {
background: #1c293b;
border: 1px solid #314158;
border-radius: 14px;
padding: 18px;
}
.label {
color: #aab7c8;
font-size: 14px;
}
.value {
font-size: 30px;
font-weight: bold;
margin-top: 9px;
}
.status {
margin-top: 18px;
padding: 18px;
border-radius: 14px;
font-size: 21px;
font-weight: bold;
background: #174b35;
}
.NORMAL {
background: #174b35;
}
.WARNING {
background: #705018;
}
.EMERGENCY {
background: #762b32;
}
.meta {
color: #aab7c8;
font-size: 13px;
margin-top: 18px;
}
.error {
color: #ffb4b4;
}
</style>
</head>
<body>
<main>
<h1>SmartFlame</h1>
<p class="sub">
ESP32 Fire and Gas Monitoring System
</p>
<div class="grid">
<section class="card">
<div class="label">Gas Level</div>
<div class="value" id="gas">--%</div>
</section>
<section class="card">
<div class="label">Temperature</div>
<div class="value" id="temp">--</div>
</section>
<section class="card">
<div class="label">Humidity</div>
<div class="value" id="humidity">--</div>
</section>
<section class="card">
<div class="label">Flame</div>
<div class="value" id="flame">--</div>
</section>
</div>
<div id="alert" class="status NORMAL">
NORMAL
</div>
<p class="meta" id="network">
Connecting to ESP32...
</p>
<p class="meta" id="updated">
Waiting for sensor data...
</p>
<p class="meta error" id="error"></p>
</main>
<script>
async function refreshData() {
try {
const response = await fetch(
'/api/status',
{ cache: 'no-store' }
);
if (!response.ok)
throw new Error('HTTP ' + response.status);
const d = await response.json();
document.getElementById('gas').textContent =
d.gasPercent + '%';
document.getElementById('temp').textContent =
d.dhtValid ? d.temperatureC + ' °C' : '--';
document.getElementById('humidity').textContent =
d.dhtValid ? d.humidity + '%' : '--';
document.getElementById('flame').textContent =
d.flame ? 'DETECTED' : 'NONE';
const alertBox =
document.getElementById('alert');
alertBox.textContent = d.alert;
alertBox.className =
'status ' + d.alert;
document.getElementById('network').textContent =
'Wi-Fi mode: ' + d.wifiMode +
(d.routerConnected
? ' | Router connected'
: ' | Router not connected');
document.getElementById('updated').textContent =
'Last update: ' + new Date().toLocaleTimeString();
document.getElementById('error').textContent = '';
} catch (e) {
document.getElementById('error').textContent =
'Cannot read sensor data. Retrying...';
}
}
refreshData();
setInterval(refreshData, 1000);
</script>
</body>
</html>
)rawliteral";
// ============================================================
// WEB SERVER ROUTES
// ============================================================
void handleRoot() {
// CORS: allow the Expo web app to fetch any page
server.sendHeader("Access-Control-Allow-Origin", "*");
server.send_P(
200,
"text/html",
DASHBOARD_HTML
);
}
void handleStatus() {
char json[320];
buildStatusJson(json, sizeof(json));
// CORS: allow the Expo web app (localhost or LAN IP) to read this API
server.sendHeader("Access-Control-Allow-Origin", "*");
server.send(
200,
"application/json",
json
);
}
// ============================================================
// STATUS JSON (shared by HTTP API + WebSocket push)
// ============================================================
void buildStatusJson(char* json, size_t len) {
const char* wifiMode =
(WiFi.status() == WL_CONNECTED)
? "ROUTER"
: (apActive ? "ACCESS_POINT" : "CONNECTING");
snprintf(
json,
len,
"{"
"\"mq2Raw\":%d,"
"\"gasPercent\":%d,"
"\"temperatureC\":%d,"
"\"humidity\":%d,"
"\"dhtValid\":%s,"
"\"flame\":%s,"
"\"alert\":\"%s\","
"\"routerConnected\":%s,"
"\"wifiMode\":\"%s\""
"}",
sensorData.mq2Raw,
sensorData.gasPercent,
sensorData.temperatureC,
sensorData.humidity,
sensorData.dhtValid ? "true" : "false",
sensorData.flame ? "true" : "false",
levelToString(stableLevel),
WiFi.status() == WL_CONNECTED ? "true" : "false",
wifiMode
);
}
// ============================================================
// WEBSOCKET PUSH (realtime, ~4 updates/second)
// ============================================================
void webSocketEvent(uint8_t num, WStype_t type, uint8_t* payload, size_t length) {
switch (type) {
case WStype_CONNECTED:
Serial.printf("[WS] Client %u connected.\n", num);
break;
case WStype_DISCONNECTED:
Serial.printf("[WS] Client %u disconnected.\n", num);
break;
default:
break;
}
}
void pushWebSocket() {
if (webSocket.connectedClients() == 0)
return;
char json[320];
buildStatusJson(json, sizeof(json));
webSocket.broadcastTXT(json);
}
void setupWebServer() {
server.on("/", HTTP_GET, handleRoot);
server.on("/api/status", HTTP_GET, handleStatus);
server.onNotFound([]() {
server.send(
404,
"text/plain",
"Not found"
);
});
server.begin();
Serial.println("[WEB] Dashboard server started.");
// Realtime WebSocket push on port 81 (app falls back to HTTP polling).
webSocket.begin();
webSocket.onEvent(webSocketEvent);
Serial.println("[WS] WebSocket push server started on port 81.");
}
// ============================================================
// SERIAL LOGGING
// ============================================================
void logSerial() {
Serial.printf(
"[DATA] mq2Raw=%d gas=%d%% temp=",
sensorData.mq2Raw,
sensorData.gasPercent
);
if (sensorData.dhtValid) {
Serial.printf(
"%dC hum=%d%%",
sensorData.temperatureC,
sensorData.humidity
);
} else {
Serial.print("-- hum=--");
}
Serial.printf(
" flamePin=%s flame=%s level=%s\n",
digitalRead(PIN_FLAME_DO) ? "HIGH" : "LOW",
sensorData.flame ? "YES" : "NO",
levelToString(stableLevel)
);
}
// ============================================================
// SERIAL COMMANDS
// ============================================================
void handleSerialCommands() {
while (Serial.available()) {
char command = (char)Serial.read();
if (command == 't' || command == 'T') {
alarmTestUntilMs = millis() + ALARM_TEST_MS;
Serial.println("[TEST] Alarm test for 5 seconds.");
} else if (command == 'r' || command == 'R') {
alarmTestUntilMs = 0;
Serial.println("[TEST] Alarm test reset.");
} else if (command == 'i' || command == 'I') {
Serial.printf(
"[WIFI] Router IP: %s\n",
WiFi.localIP().toString().c_str()
);
Serial.printf(
"[WIFI] AP IP: %s\n",
WiFi.softAPIP().toString().c_str()
);
}
}
}
// ============================================================
// SETUP
// ============================================================
void setup() {
Serial.begin(115200);
delay(1000);
Serial.println("\n[SYS] SmartFlame WiFi system starting...");
// 1. Buzzer
buzzerBegin();
buzzerOff();
Serial.println("[CHECK 1] Buzzer initialized");
// 2. Pins
pinMode(PIN_FLAME_DO, INPUT);
analogReadResolution(12);
Serial.println("[CHECK 2] Pins initialized");
// 3. I2C + LCD
Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
Wire.setClock(100000);
i2cScan();
lcd.init();
lcd.backlight();
lcd.clear();
lcd.setCursor(0, 0);
lcd.print("SmartFlame");
lcd.setCursor(0, 1);
lcd.print("Starting WiFi");
Serial.println("[CHECK 3] LCD initialized");
// 4. DHT
dht.begin();
Serial.println("[CHECK 4] DHT initialized");
// 5. Startup beeps
buzzerTone(WARNING_FREQ_HZ);
delay(250);
buzzerOff();
delay(150);
buzzerTone(WARNING_FREQ_HZ);
delay(250);
buzzerOff();
Serial.println("[CHECK 5] Startup buzzer test completed");
// 6. Initial readings (once)
flameCandidate = flameRawActive();
sensorData.flame = flameCandidate;
delay(1500);
sampleGas();
sampleDht();
updateDebouncedAlert();
updateLcd();
Serial.println("[CHECK 6] Initial readings completed");
// 7. WiFi FIRST
Serial.println("[CHECK 7] Before WiFi setup");
setupWiFi();
Serial.println("[CHECK 8] WiFi setup completed");
// 8. Web server AFTER WiFi
Serial.println("[CHECK 9] Before web server setup");
setupWebServer();
Serial.println("[CHECK 10] Web server started");
Serial.println("[SYS] SmartFlame ready.");
Serial.println("[SYS] Commands: t=test, r=reset, i=show IP");
}
// ============================================================
// MAIN LOOP
// ============================================================
void loop() {
unsigned long now = millis();
// Serial commands
handleSerialCommands();
// Flame sampling
if (now - lastFlameMs >= FLAME_SAMPLE_INTERVAL_MS) {
lastFlameMs = now;
sampleFlame(now);
}
// Gas sampling
if (now - lastGasMs >= GAS_SAMPLE_INTERVAL_MS) {
lastGasMs = now;
sampleGas();
}
// Temperature and humidity sampling
if (now - lastDhtMs >= DHT_SAMPLE_INTERVAL_MS) {
lastDhtMs = now;
sampleDht();
}
// Alert calculation
if (now - lastDecisionMs >= DECISION_INTERVAL_MS) {
lastDecisionMs = now;
updateDebouncedAlert();
}
// Buzzer
updateBuzzer(now);
// LCD
if (now - lastLcdMs >= LCD_UPDATE_INTERVAL_MS) {
lastLcdMs = now;
updateLcd();
}
// Serial logging
if (now - lastLogMs >= SERIAL_LOG_INTERVAL_MS) {
lastLogMs = now;
logSerial();
}
// Wi-Fi connection management
maintainWiFi(now);
// Web server requests
server.handleClient();
// WebSocket push (~4 updates/second to every connected app)
if (now - lastPushMs >= 250) {
lastPushMs = now;
pushWebSocket();
}
webSocket.loop();
delay(2);
}
