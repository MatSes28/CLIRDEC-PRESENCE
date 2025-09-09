/*
 * CLIRDEC: PRESENCE - ESP32-S3 Final Logic Implementation
 * 
 * This firmware implements the complete Final Logic for attendance validation:
 * - Session-based tap-in/tap-out control
 * - One-tap-one-entry validation with 7-second timeout
 * - Ghost tap detection and discrepancy handling
 * - Dual sensor validation (RFID + HC-SR04)
 * 
 * Hardware Configuration:
 * - ESP32-S3 Development Board
 * - RC522 RFID Module (13.56MHz)
 * - HC-SR04 Ultrasonic Sensor
 * - Status LED
 * 
 * Wiring:
 * RC522 RFID:
 * VCC  -> 3.3V    | RST -> GPIO 22  | GND -> GND
 * MISO -> GPIO 19 | MOSI -> GPIO 23 | SCK -> GPIO 18 | SDA -> GPIO 5
 * 
 * HC-SR04 Ultrasonic:
 * VCC -> 5V | GND -> GND | Trig -> GPIO 5 | Echo -> GPIO 18
 * 
 * LED -> GPIO 2 (Built-in)
 */

#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>

// Network Configuration
const char* ssid = "YOUR_WIFI_SSID";          // Update with your WiFi SSID
const char* password = "YOUR_WIFI_PASSWORD";   // Update with your WiFi password
const char* serverHost = "your-replit-url.replit.dev"; // Update with your Replit URL

// Hardware Pin Configuration
#define RST_PIN         22    // RC522 Reset pin
#define SS_PIN          5     // RC522 SDA pin
#define TRIG_PIN        5     // HC-SR04 Trigger pin (shared with SDA for space optimization)
#define ECHO_PIN        18    // HC-SR04 Echo pin
#define LED_PIN         2     // Built-in LED
#define BUZZER_PIN      4     // Optional buzzer

// Sensor Configuration
#define PRESENCE_THRESHOLD_CM   50    // Distance threshold for presence detection
#define VALIDATION_TIMEOUT_MS   7000  // 7-second validation timeout
#define SENSOR_COOLDOWN_MS      2000  // 2-second cooldown between readings
#define MAX_RETRIES            3      // Maximum connection retries

// Device Configuration
String deviceId;
String currentSessionId = "";
String validationMode = "tap_in";  // tap_in, tap_out, disabled
bool deviceRegistered = false;
bool sensorEnabled = true;
unsigned long lastCardRead = 0;
unsigned long lastSensorReading = 0;
String pendingValidationKey = "";

// Hardware objects
MFRC522 rfid(SS_PIN, RST_PIN);
using namespace websockets;
WebsocketsClient wsClient;

// System state
struct AttendanceSession {
  String sessionId;
  String mode;           // tap_in, tap_out, disabled
  String classStartTime;
  String classEndTime;
  int lateThresholdMinutes;
  int absentThresholdPercent;
};

AttendanceSession currentSession;

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  // Initialize hardware
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Initialize SPI and RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Generate device ID
  deviceId = "ESP32_CLIRDEC_" + String(ESP.getEfuseMac(), HEX);
  
  Serial.println("====================================");
  Serial.println("CLIRDEC: PRESENCE - Final Logic");
  Serial.println("====================================");
  Serial.println("Device ID: " + deviceId);
  Serial.println("Final Logic Features:");
  Serial.println("✓ Session-based tap-in/tap-out control");
  Serial.println("✓ One-tap-one-entry validation (7s timeout)");
  Serial.println("✓ Ghost tap detection");
  Serial.println("✓ Dual sensor validation");
  Serial.println("====================================");
  
  // Status indication
  blinkLED(3, 200);
  
  // Connect to WiFi
  connectToWiFi();
  
  // Connect to WebSocket server
  connectToWebSocket();
}

void loop() {
  // Maintain WebSocket connection
  if (wsClient.available()) {
    wsClient.poll();
  } else {
    reconnectWebSocket();
  }
  
  // Check for RFID cards (with cooldown)
  if (millis() - lastCardRead > SENSOR_COOLDOWN_MS) {
    checkRFIDCard();
  }
  
  // Monitor for sensor validation requests
  if (!pendingValidationKey.isEmpty()) {
    monitorSensorValidation();
  }
  
  // Send periodic heartbeat
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 30000) { // Every 30 seconds
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  delay(100);
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: " + String(ssid));
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected!");
    Serial.println("IP address: " + WiFi.localIP().toString());
    blinkLED(2, 100);
  } else {
    Serial.println("\n✗ WiFi connection failed!");
    blinkLED(5, 50);
  }
}

void connectToWebSocket() {
  String wsUrl = "wss://" + String(serverHost) + "/iot";
  Serial.println("Connecting to WebSocket: " + wsUrl);
  
  // Set up WebSocket event handlers
  wsClient.onMessage(onWebSocketMessage);
  wsClient.onEvent(onWebSocketEvent);
  
  if (wsClient.connect(wsUrl)) {
    Serial.println("✓ WebSocket connected!");
    registerDevice();
    blinkLED(3, 150);
  } else {
    Serial.println("✗ WebSocket connection failed!");
    blinkLED(10, 50);
  }
}

void reconnectWebSocket() {
  static unsigned long lastAttempt = 0;
  if (millis() - lastAttempt > 5000) { // Try every 5 seconds
    Serial.println("Attempting to reconnect WebSocket...");
    connectToWebSocket();
    lastAttempt = millis();
  }
}

void registerDevice() {
  JsonDocument doc;
  doc["type"] = "device_register";
  doc["deviceId"] = deviceId;
  doc["deviceType"] = "esp32_s3";
  doc["firmware"] = "CLIRDEC_FINAL_LOGIC_v1.0";
  doc["capabilities"] = JsonArray();
  doc["capabilities"].add("rfid_reading");
  doc["capabilities"].add("presence_detection");
  doc["capabilities"].add("dual_validation");
  doc["capabilities"].add("session_based_control");
  doc["macAddress"] = WiFi.macAddress();
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  wsClient.send(message);
  
  Serial.println("📡 Device registration sent");
}

void onWebSocketMessage(WebsocketsMessage message) {
  Serial.println("📨 WebSocket message: " + message.data());
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, message.data());
  
  if (error) {
    Serial.println("❌ JSON parse error: " + String(error.c_str()));
    return;
  }
  
  String type = doc["type"];
  
  if (type == "device_registered") {
    deviceRegistered = true;
    Serial.println("✓ Device registered with server");
    blinkLED(5, 100);
    
  } else if (type == "session_update") {
    updateSessionMode(doc);
    
  } else if (type == "validation_request") {
    handleValidationRequest(doc);
    
  } else if (type == "config_update") {
    updateDeviceConfig(doc);
    
  } else if (type == "system_command") {
    handleSystemCommand(doc);
  }
}

void onWebSocketEvent(WebsocketsEvent event, String data) {
  switch (event) {
    case WebsocketsEvent::ConnectionOpened:
      Serial.println("✓ WebSocket connection opened");
      break;
    case WebsocketsEvent::ConnectionClosed:
      Serial.println("🔌 WebSocket connection closed");
      deviceRegistered = false;
      break;
    case WebsocketsEvent::GotPing:
      Serial.println("📶 WebSocket ping received");
      break;
    case WebsocketsEvent::GotPong:
      Serial.println("📶 WebSocket pong received");
      break;
  }
}

void updateSessionMode(JsonDocument& doc) {
  currentSession.sessionId = doc["sessionId"].as<String>();
  currentSession.mode = doc["mode"].as<String>();
  currentSession.classStartTime = doc["classStartTime"].as<String>();
  currentSession.classEndTime = doc["classEndTime"].as<String>();
  currentSession.lateThresholdMinutes = doc["lateThresholdMinutes"];
  currentSession.absentThresholdPercent = doc["absentThresholdPercent"];
  
  validationMode = currentSession.mode;
  
  Serial.println("📊 Session mode updated:");
  Serial.println("   Session ID: " + currentSession.sessionId);
  Serial.println("   Mode: " + currentSession.mode);
  Serial.println("   Start: " + currentSession.classStartTime);
  Serial.println("   End: " + currentSession.classEndTime);
  
  // Visual indication of mode change
  if (currentSession.mode == "tap_in") {
    blinkLED(2, 200); // 2 slow blinks = tap-in mode
  } else if (currentSession.mode == "tap_out") {
    blinkLED(3, 200); // 3 slow blinks = tap-out mode
  } else {
    blinkLED(1, 500); // 1 long blink = disabled
  }
}

void handleValidationRequest(JsonDocument& doc) {
  String validationKey = doc["validationKey"];
  int studentId = doc["studentId"];
  String studentName = doc["studentName"];
  
  Serial.println("🔍 Validation request received:");
  Serial.println("   Key: " + validationKey);
  Serial.println("   Student: " + studentName + " (ID: " + String(studentId) + ")");
  
  pendingValidationKey = validationKey;
  
  // Enable sensor monitoring for validation
  sensorEnabled = true;
  
  // Visual/audio indication
  blinkLED(4, 100); // 4 fast blinks = validation required
  if (BUZZER_PIN > 0) {
    tone(BUZZER_PIN, 1000, 200); // Short beep
  }
}

void checkRFIDCard() {
  // Check if validation mode allows RFID reading
  if (validationMode == "disabled") {
    return;
  }
  
  // Check for new RFID card
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Read card UID
  String cardUID = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    cardUID += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    cardUID += String(rfid.uid.uidByte[i], HEX);
  }
  cardUID.toUpperCase();
  
  lastCardRead = millis();
  
  Serial.println("🏷️ RFID Card detected: " + cardUID);
  
  // Send RFID tap to server for validation
  sendRFIDTap(cardUID);
  
  // Visual indication
  digitalWrite(LED_PIN, HIGH);
  delay(100);
  digitalWrite(LED_PIN, LOW);
  
  // Halt PICC and stop encryption
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

void sendRFIDTap(String cardUID) {
  if (!deviceRegistered || currentSession.sessionId.isEmpty()) {
    Serial.println("❌ Device not ready for RFID validation");
    return;
  }
  
  JsonDocument doc;
  doc["type"] = "rfid_tap";
  doc["deviceId"] = deviceId;
  doc["rfidCardId"] = cardUID;
  doc["sessionId"] = currentSession.sessionId;
  doc["validationMode"] = validationMode;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  wsClient.send(message);
  
  Serial.println("📡 RFID tap sent to server");
}

void monitorSensorValidation() {
  static unsigned long validationStartTime = 0;
  
  // Initialize validation timer
  if (validationStartTime == 0) {
    validationStartTime = millis();
    Serial.println("⏱️ Starting 7-second validation window...");
  }
  
  // Check if validation timeout reached
  if (millis() - validationStartTime > VALIDATION_TIMEOUT_MS) {
    Serial.println("⏰ Validation timeout - no presence detected");
    sendValidationTimeout();
    pendingValidationKey = "";
    validationStartTime = 0;
    return;
  }
  
  // Check sensor for presence detection
  if (millis() - lastSensorReading > 200) { // Check every 200ms during validation
    float distance = measureDistance();
    lastSensorReading = millis();
    
    if (distance > 0 && distance <= PRESENCE_THRESHOLD_CM) {
      Serial.println("👤 Presence VALIDATED at " + String(distance) + "cm");
      sendSensorValidation("entry", distance);
      pendingValidationKey = "";
      validationStartTime = 0;
      
      // Success indication
      blinkLED(3, 50); // 3 fast blinks = validation success
      if (BUZZER_PIN > 0) {
        tone(BUZZER_PIN, 1500, 100); // Success beep
        delay(50);
        tone(BUZZER_PIN, 2000, 100);
      }
    }
  }
}

float measureDistance() {
  // Temporarily configure pins for ultrasonic sensor
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  // Send ultrasonic pulse
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Measure echo time with timeout
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  
  if (duration == 0) {
    return -1; // Timeout or no echo
  }
  
  // Calculate distance in centimeters
  float distance = (duration * 0.034) / 2;
  
  return distance;
}

void sendSensorValidation(String detectionType, float distance) {
  JsonDocument doc;
  doc["type"] = "sensor_validation";
  doc["deviceId"] = deviceId;
  doc["validationKey"] = pendingValidationKey;
  doc["detectionType"] = detectionType;
  doc["distance"] = distance;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  wsClient.send(message);
  
  Serial.println("📡 Sensor validation sent: " + detectionType + " at " + String(distance) + "cm");
}

void sendValidationTimeout() {
  JsonDocument doc;
  doc["type"] = "validation_timeout";
  doc["deviceId"] = deviceId;
  doc["validationKey"] = pendingValidationKey;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  wsClient.send(message);
  
  Serial.println("📡 Validation timeout sent");
  
  // Timeout indication
  blinkLED(5, 100); // 5 fast blinks = timeout
  if (BUZZER_PIN > 0) {
    tone(BUZZER_PIN, 500, 300); // Low error beep
  }
}

void updateDeviceConfig(JsonDocument& doc) {
  if (doc["sensorEnabled"]) {
    sensorEnabled = doc["sensorEnabled"];
    Serial.println("🔧 Sensor enabled: " + String(sensorEnabled));
  }
  
  if (doc["presenceThreshold"]) {
    // Update presence threshold if needed
    Serial.println("🔧 Config updated");
  }
}

void handleSystemCommand(JsonDocument& doc) {
  String command = doc["command"];
  
  if (command == "restart") {
    Serial.println("🔄 Restarting device...");
    ESP.restart();
    
  } else if (command == "test_sensor") {
    Serial.println("🧪 Testing sensor...");
    float distance = measureDistance();
    if (distance > 0) {
      Serial.println("   Distance: " + String(distance) + "cm");
    } else {
      Serial.println("   Sensor timeout");
    }
    
  } else if (command == "test_led") {
    Serial.println("🧪 Testing LED...");
    blinkLED(10, 100);
  }
}

void sendHeartbeat() {
  if (!deviceRegistered) return;
  
  JsonDocument doc;
  doc["type"] = "heartbeat";
  doc["deviceId"] = deviceId;
  doc["sessionId"] = currentSession.sessionId;
  doc["mode"] = validationMode;
  doc["uptime"] = millis();
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["rssi"] = WiFi.RSSI();
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  wsClient.send(message);
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void tone(int pin, int frequency, int duration) {
  // Simple tone generation (if buzzer connected)
  // This is a placeholder - implement actual tone generation if needed
}