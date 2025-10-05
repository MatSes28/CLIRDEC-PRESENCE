/*
 * CLIRDEC: PRESENCE - ESP32-S3 Dual Sensor Attendance System
 * 
 * Hardware:
 * - ESP32-S3 Development Board
 * - RC522 RFID Module (13.56MHz)  
 * - 2x HC-SR04 Ultrasonic Sensors (Entry & Exit)
 * 
 * Features:
 * - Entry/Exit detection with dual ultrasonic sensors
 * - RFID card validation
 * - Real-time WebSocket communication with server
 * - Ghost tap detection (RFID without physical presence)
 * - Session-based attendance tracking
 * 
 * WIRING DIAGRAM:
 * ===============
 * 
 * RC522 RFID Module → ESP32-S3:
 * VCC  → 3.3V
 * RST  → GPIO 22
 * GND  → GND
 * MISO → GPIO 19
 * MOSI → GPIO 23
 * SCK  → GPIO 18
 * SDA  → GPIO 21
 * 
 * HC-SR04 Sensor #1 (ENTRY) → ESP32-S3:
 * VCC  → 5V
 * GND  → GND
 * Trig → GPIO 32
 * Echo → GPIO 33
 * 
 * HC-SR04 Sensor #2 (EXIT) → ESP32-S3:
 * VCC  → 5V
 * GND  → GND
 * Trig → GPIO 25
 * Echo → GPIO 26
 * 
 * Built-in LED → GPIO 2
 */

#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>

// ========== CONFIGURATION - UPDATE THESE ==========
const char* ssid = "YOUR_WIFI_SSID";           // Your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD";    // Your WiFi password
const char* serverHost = "YOUR_REPLIT_URL.replit.dev";  // Your Replit app URL (without https://)
// ==================================================

// RFID Pin Configuration
#define RST_PIN         22
#define SS_PIN          21

// HC-SR04 Entry Sensor (Sensor 1)
#define ENTRY_TRIG_PIN  32
#define ENTRY_ECHO_PIN  33

// HC-SR04 Exit Sensor (Sensor 2)  
#define EXIT_TRIG_PIN   25
#define EXIT_ECHO_PIN   26

// LED & Buzzer
#define LED_PIN         2
#define BUZZER_PIN      4

// Sensor Configuration
#define PRESENCE_THRESHOLD_CM   50    // Distance threshold (cm)
#define VALIDATION_TIMEOUT_MS   7000  // 7-second validation window
#define SENSOR_COOLDOWN_MS      2000  // Cooldown between readings
#define MAX_DISTANCE_CM         400   // Maximum measurement distance

// Device state
String deviceId;
String currentSessionId = "";
String validationMode = "tap_in";
bool deviceRegistered = false;
unsigned long lastCardRead = 0;
String pendingRFID = "";
unsigned long validationStartTime = 0;

// Hardware objects
MFRC522 rfid(SS_PIN, RST_PIN);
using namespace websockets;
WebsocketsClient wsClient;

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("========================================");
  Serial.println("CLIRDEC: PRESENCE - Dual Sensor System");
  Serial.println("========================================");
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(ENTRY_TRIG_PIN, OUTPUT);
  pinMode(ENTRY_ECHO_PIN, INPUT);
  pinMode(EXIT_TRIG_PIN, OUTPUT);
  pinMode(EXIT_ECHO_PIN, INPUT);
  
  // Initialize SPI and RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Generate device ID
  deviceId = "ESP32_S3_" + String((uint32_t)ESP.getEfuseMac(), HEX);
  Serial.println("Device ID: " + deviceId);
  
  // Test sensors
  Serial.println("\nTesting sensors...");
  testSensors();
  
  // Startup indication
  blinkLED(3, 200);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Connect to WebSocket
  connectToWebSocket();
}

void loop() {
  // Maintain WebSocket connection
  if (wsClient.available()) {
    wsClient.poll();
  } else {
    static unsigned long lastReconnect = 0;
    if (millis() - lastReconnect > 5000) {
      Serial.println("WebSocket disconnected, reconnecting...");
      connectToWebSocket();
      lastReconnect = millis();
    }
  }
  
  // Check for RFID cards
  if (millis() - lastCardRead > SENSOR_COOLDOWN_MS) {
    checkRFIDCard();
  }
  
  // Monitor pending validation
  if (!pendingRFID.isEmpty()) {
    monitorValidation();
  }
  
  // Send heartbeat every 30 seconds
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 30000) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  delay(50);
}

void connectToWiFi() {
  Serial.print("\nConnecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    blinkLED(2, 100);
  } else {
    Serial.println("\n✗ WiFi Connection Failed!");
    Serial.println("Please check your WiFi credentials");
    blinkLED(5, 100);
  }
}

void connectToWebSocket() {
  String wsUrl = "wss://" + String(serverHost) + "/iot";
  Serial.print("\nConnecting to WebSocket: ");
  Serial.println(wsUrl);
  
  wsClient.onMessage(onWebSocketMessage);
  wsClient.onEvent(onWebSocketEvent);
  
  if (wsClient.connect(wsUrl)) {
    Serial.println("✓ WebSocket Connected!");
    registerDevice();
    blinkLED(2, 100);
  } else {
    Serial.println("✗ WebSocket Connection Failed!");
    blinkLED(5, 100);
  }
}

void registerDevice() {
  StaticJsonDocument<512> doc;
  doc["type"] = "register";
  doc["deviceId"] = deviceId;
  doc["deviceType"] = "dual_sensor_rfid";
  doc["capabilities"]["entry_sensor"] = true;
  doc["capabilities"]["exit_sensor"] = true;
  doc["capabilities"]["rfid_reader"] = true;
  
  String message;
  serializeJson(doc, message);
  wsClient.send(message);
  
  Serial.println("→ Device registration sent");
}

void checkRFIDCard() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Read RFID UID
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  lastCardRead = millis();
  
  Serial.println("\n📇 RFID Card Detected: " + uid);
  blinkLED(1, 50);
  
  // Start validation window
  pendingRFID = uid;
  validationStartTime = millis();
  
  // Send RFID tap event
  sendRFIDEvent(uid);
}

void monitorValidation() {
  unsigned long elapsed = millis() - validationStartTime;
  
  // Check if validation timeout expired
  if (elapsed > VALIDATION_TIMEOUT_MS) {
    Serial.println("⚠️  Validation timeout - No physical presence detected");
    sendValidationResult(pendingRFID, false, "ghost_tap");
    pendingRFID = "";
    return;
  }
  
  // Check entry sensor
  float entryDistance = measureDistance(ENTRY_TRIG_PIN, ENTRY_ECHO_PIN);
  if (entryDistance > 0 && entryDistance < PRESENCE_THRESHOLD_CM) {
    Serial.println("✓ Entry sensor validated: " + String(entryDistance) + " cm");
    sendValidationResult(pendingRFID, true, "entry");
    pendingRFID = "";
    blinkLED(2, 100);
    return;
  }
  
  // Check exit sensor
  float exitDistance = measureDistance(EXIT_TRIG_PIN, EXIT_ECHO_PIN);
  if (exitDistance > 0 && exitDistance < PRESENCE_THRESHOLD_CM) {
    Serial.println("✓ Exit sensor validated: " + String(exitDistance) + " cm");
    sendValidationResult(pendingRFID, true, "exit");
    pendingRFID = "";
    blinkLED(2, 100);
    return;
  }
}

float measureDistance(int trigPin, int echoPin) {
  // Send ultrasonic pulse
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  // Measure echo duration
  long duration = pulseIn(echoPin, HIGH, 30000); // 30ms timeout
  
  if (duration == 0) {
    return -1; // Timeout
  }
  
  // Calculate distance in cm
  float distance = (duration * 0.034) / 2.0;
  
  // Validate range
  if (distance > MAX_DISTANCE_CM) {
    return -1;
  }
  
  return distance;
}

void sendRFIDEvent(String uid) {
  StaticJsonDocument<512> doc;
  doc["type"] = "rfid_tap";
  doc["deviceId"] = deviceId;
  doc["rfidUid"] = uid;
  doc["timestamp"] = millis();
  doc["sessionId"] = currentSessionId;
  doc["mode"] = validationMode;
  
  String message;
  serializeJson(doc, message);
  wsClient.send(message);
  
  Serial.println("→ RFID event sent");
}

void sendValidationResult(String uid, bool validated, String method) {
  StaticJsonDocument<512> doc;
  doc["type"] = "sensor_validation";
  doc["deviceId"] = deviceId;
  doc["rfidUid"] = uid;
  doc["validated"] = validated;
  doc["method"] = method;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  wsClient.send(message);
  
  Serial.println("→ Validation result sent: " + method);
}

void sendHeartbeat() {
  StaticJsonDocument<512> doc;
  doc["type"] = "heartbeat";
  doc["deviceId"] = deviceId;
  doc["uptime"] = millis();
  doc["wifi_rssi"] = WiFi.RSSI();
  
  // Add sensor status
  doc["sensors"]["entry_active"] = true;
  doc["sensors"]["exit_active"] = true;
  doc["sensors"]["rfid_active"] = true;
  
  String message;
  serializeJson(doc, message);
  wsClient.send(message);
}

void onWebSocketMessage(WebsocketsMessage message) {
  Serial.println("← Message received: " + message.data());
  
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, message.data());
  
  if (error) {
    Serial.println("✗ JSON parse error");
    return;
  }
  
  String type = doc["type"].as<String>();
  
  if (type == "registration_success") {
    deviceRegistered = true;
    Serial.println("✓ Device registered successfully!");
    blinkLED(3, 100);
  }
  else if (type == "session_update") {
    currentSessionId = doc["sessionId"].as<String>();
    validationMode = doc["mode"].as<String>();
    Serial.println("✓ Session updated: " + currentSessionId);
    Serial.println("  Mode: " + validationMode);
  }
  else if (type == "ping") {
    // Respond to ping
    StaticJsonDocument<128> response;
    response["type"] = "pong";
    String msg;
    serializeJson(response, msg);
    wsClient.send(msg);
  }
}

void onWebSocketEvent(WebsocketsEvent event, String data) {
  if (event == WebsocketsEvent::ConnectionOpened) {
    Serial.println("✓ WebSocket connection opened");
  } else if (event == WebsocketsEvent::ConnectionClosed) {
    Serial.println("✗ WebSocket connection closed");
    deviceRegistered = false;
  } else if (event == WebsocketsEvent::GotPing) {
    Serial.println("← Ping received");
  }
}

void testSensors() {
  Serial.println("\n1. Testing RFID Reader...");
  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  if (version == 0x92 || version == 0x91) {
    Serial.println("   ✓ RFID reader OK (Version: 0x" + String(version, HEX) + ")");
  } else {
    Serial.println("   ✗ RFID reader not detected!");
  }
  
  Serial.println("\n2. Testing Entry Sensor (HC-SR04 #1)...");
  float entryDist = measureDistance(ENTRY_TRIG_PIN, ENTRY_ECHO_PIN);
  if (entryDist > 0) {
    Serial.println("   ✓ Entry sensor OK (" + String(entryDist) + " cm)");
  } else {
    Serial.println("   ✗ Entry sensor error!");
  }
  
  Serial.println("\n3. Testing Exit Sensor (HC-SR04 #2)...");
  float exitDist = measureDistance(EXIT_TRIG_PIN, EXIT_ECHO_PIN);
  if (exitDist > 0) {
    Serial.println("   ✓ Exit sensor OK (" + String(exitDist) + " cm)");
  } else {
    Serial.println("   ✗ Exit sensor error!");
  }
  
  Serial.println("\n✓ Sensor test complete\n");
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}
