/*
 * CLIRDEC: PRESENCE - ESP32 IoT Device Code
 * Hardware: ESP32-WROOM-32 38-pin with RC522 RFID + HC-SR501 PIR
 * 
 * Pin Connections:
 * RC522 RFID Module:
 *   VCC -> 3.3V
 *   RST -> GPIO 22
 *   GND -> GND
 *   MISO -> GPIO 19
 *   MOSI -> GPIO 23
 *   SCK -> GPIO 18
 *   SDA -> GPIO 5
 * 
 * HC-SR501 PIR Sensor:
 *   VCC -> 5V
 *   GND -> GND
 *   OUT -> GPIO 4
 * 
 * Status LED:
 *   Anode -> GPIO 2 (built-in LED)
 *   Cathode -> GND
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <esp_system.h>
#include <Preferences.h>

// Hardware pin definitions
#define RST_PIN         22
#define SS_PIN          5
#define PIR_PIN         4
#define LED_PIN         2
#define BUZZER_PIN      25  // Optional buzzer for feedback

// RFID setup
MFRC522 rfid(SS_PIN, RST_PIN);

// WiFi credentials (replace with your network)
const char* ssid = "Kupal kaba boss?";
const char* password = "MatMir@12030908";

// Server configuration (replace with your Replit URL)
const char* serverHost = "ddb04528-3a36-4cd1-a417-be2a44f8f2c2-00-1vovm4u17nbsh.sisko.replit.dev";
const int serverPort = 443;  // Use 443 for HTTPS
const char* serverPath = "/iot";

// Device configuration
String deviceId = "CLIRDEC_ESP32_001";  // Unique device identifier
int classroomId = 1;  // Classroom ID from database
String deviceType = "combined";  // RFID + presence sensor
String firmwareVersion = "1.0.0";

// WebSocket client
WebSocketsClient webSocket;
Preferences preferences;

// State variables
bool wifiConnected = false;
bool serverConnected = false;
bool pirState = false;
unsigned long lastHeartbeat = 0;
unsigned long lastPirCheck = 0;

// HC-SR501 PIR Sensor variables with interference handling
bool motionDetected = false;
unsigned long lastMotionTime = 0;
const unsigned long MOTION_TIMEOUT = 5000; // 5 seconds timeout

// Interference detection and filtering
unsigned long lastValidMotion = 0;
int consecutiveInterferenceCount = 0;
const int MAX_CONSECUTIVE_INTERFERENCE = 3;
const unsigned long INTERFERENCE_WINDOW_MS = 1000; // 1 second window for interference detection
const unsigned long MIN_MOTION_INTERVAL_MS = 2000; // Minimum 2 seconds between valid motions

// Ultrasonic sensor interference detection (if ultrasonic sensor is added later)
bool ultrasonicInterference = false;
unsigned long lastUltrasonicReading = 0;
unsigned long lastStatusUpdate = 0;
String lastRfidCard = "";
unsigned long lastRfidTime = 0;

// Timing constants
const unsigned long HEARTBEAT_INTERVAL = 60000;  // 1 minute
const unsigned long PIR_CHECK_INTERVAL = 1000;   // 1 second
const unsigned long STATUS_UPDATE_INTERVAL = 300000; // 5 minutes
unsigned long RFID_DEBOUNCE_MS = 2000;  // Configurable debounce time
unsigned long lastRFIDRead = 0;
String lastRFIDTag = "";

void setup() {
  Serial.begin(115200);
  Serial.println("🚀 CLIRDEC: PRESENCE ESP32 Device Starting...");
  
  // Initialize hardware
  setupHardware();
  
  // Load configuration from EEPROM
  loadConfiguration();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize WebSocket connection
  setupWebSocket();
  
  Serial.println("✅ Device initialization complete");
  blinkLED(3, 200);  // Success indication
}

void loop() {
  // Handle WebSocket events
  webSocket.loop();
  
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    Serial.println("⚠️ WiFi disconnected, reconnecting...");
    wifiConnected = false;
    serverConnected = false;
    connectToWiFi();
  }
  
  // Check for RFID cards
  checkRFID();
  
  // Check PIR sensor
  checkPresenceSensor();
  
  // Send periodic heartbeat
  sendHeartbeat();
  
  // Send status updates
  sendStatusUpdate();
  
  delay(100);  // Small delay to prevent overwhelming the system
}

void setupHardware() {
  // Initialize SPI for RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Initialize pins
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Test hardware
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  
  // Test RFID module
  if (!rfid.PCD_PerformSelfTest()) {
    Serial.println("❌ RFID module test failed!");
  } else {
    Serial.println("✅ RFID module initialized");
  }
  
  // Initialize RFID for normal operation
  rfid.PCD_Init();
}

void loadConfiguration() {
  preferences.begin("clirdec", false);
  
  // Load saved configuration
  deviceId = preferences.getString("deviceId", deviceId);
  classroomId = preferences.getInt("classroomId", classroomId);
  
  Serial.println("Device ID: " + deviceId);
  Serial.println("Classroom ID: " + String(classroomId));
  
  preferences.end();
}

void connectToWiFi() {
  Serial.print("🌐 Connecting to WiFi: " + String(ssid));
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  int maxAttempts = 20;
  int baseDelay = 1000; // Start with 1 second

  while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
    // Exponential backoff with jitter
    int delayTime = baseDelay * (1 << min(attempts, 4)); // Cap at 2^4 = 16x base delay
    delayTime += random(0, 200); // Add jitter to prevent thundering herd

    delay(delayTime);
    Serial.print(".");

    // Print connection status occasionally
    if (attempts % 5 == 0) {
      Serial.printf(" (attempt %d/%d)", attempts + 1, maxAttempts);
    }

    digitalWrite(LED_PIN, !digitalRead(LED_PIN));  // Blink during connection
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("\n✅ WiFi connected!");
    Serial.println("IP Address: " + WiFi.localIP().toString());
    Serial.println("MAC Address: " + WiFi.macAddress());
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    digitalWrite(LED_PIN, LOW);
    // Retry after delay
    delay(10000);
    ESP.restart();
  }
}

void setupWebSocket() {
  // Use secure WebSocket (WSS) for HTTPS servers
  webSocket.beginSSL(serverHost, serverPort, serverPath);
  
  // Set WebSocket event handler
  webSocket.onEvent(webSocketEvent);
  
  // Set reconnect interval
  webSocket.setReconnectInterval(5000);
  
  Serial.println("🔗 WebSocket client initialized");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("⚠️ WebSocket Disconnected");
      serverConnected = false;
      digitalWrite(LED_PIN, LOW);
      break;
      
    case WStype_CONNECTED:
      Serial.printf("✅ WebSocket Connected to: %s\n", payload);
      serverConnected = true;
      digitalWrite(LED_PIN, HIGH);
      registerDevice();
      break;
      
    case WStype_TEXT:
      Serial.printf("📨 Received: %s\n", payload);
      handleServerMessage((char*)payload);
      break;
      
    case WStype_ERROR:
      Serial.printf("❌ WebSocket Error: %s\n", payload);
      break;
      
    default:
      break;
  }
}

void registerDevice() {
  DynamicJsonDocument doc(1024);
  doc["type"] = "device_register";
  doc["deviceId"] = deviceId;
  doc["classroomId"] = classroomId;
  doc["deviceType"] = deviceType;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["macAddress"] = WiFi.macAddress();
  doc["firmwareVersion"] = firmwareVersion;
  doc["capabilities"] = JsonArray();
  doc["capabilities"].add("rfid_scan");
  doc["capabilities"].add("presence_detection");
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("📱 Device registration sent");
}

void handleServerMessage(const char* message) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);
  
  String type = doc["type"];
  
  if (type == "registration_success") {
    Serial.println("✅ Device registered successfully");
    blinkLED(2, 100);
    
    // Save any updated configuration
    if (doc.containsKey("settings")) {
      // Handle server settings
      Serial.println("📋 Configuration received from server");
    }
  }
  else if (type == "registration_error") {
    Serial.println("❌ Device registration failed: " + String(doc["message"].as<const char*>()));
    blinkLED(5, 100);
  }
  else if (type == "scan_result") {
    handleScanResult(doc);
  }
  else if (type == "config_update") {
    Serial.println("📋 Configuration update received");
    // Handle configuration updates
  }
  else if (type == "diagnostics_request") {
    sendDiagnostics();
  }
  else if (type == "heartbeat_ack") {
    // Heartbeat acknowledged
  }
}

void handleScanResult(JsonDocument& doc) {
  String status = doc["status"];
  String studentName = doc["studentName"] | "Unknown";
  String message = doc["message"] | "";
  
  Serial.println("Scan Result: " + status + " - " + studentName);
  
  // Provide feedback based on result
  if (status == "checked_in" || status == "checked_out") {
    // Success - green blink and beep
    blinkLED(2, 200);
    beep(1, 100);
  }
  else if (status == "checked_in_late") {
    // Late - yellow blink and double beep
    blinkLED(3, 150);
    beep(2, 150);
  }
  else if (status == "unknown_card" || status == "no_active_session") {
    // Error - red blink and long beep
    blinkLED(5, 100);
    beep(1, 500);
  }
}

void checkRFID() {
  // Check if a new card is present
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Build card ID string
  String cardId = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    cardId += String(rfid.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();
  
  // Debounce - prevent multiple scans of same card
  unsigned long currentTime = millis();
  if (cardId == lastRfidCard && (currentTime - lastRfidTime) < RFID_DEBOUNCE_TIME) {
    rfid.PICC_HaltA();
    return;
  }
  
  lastRfidCard = cardId;
  lastRfidTime = currentTime;
  
  Serial.println("📱 RFID Card scanned: " + cardId);
  
  // Send to server
  if (serverConnected) {
    DynamicJsonDocument doc(512);
    doc["type"] = "rfid_scan";
    doc["deviceId"] = deviceId;
    doc["rfidCardId"] = cardId;
    doc["timestamp"] = getTimestamp();
    doc["signalStrength"] = random(70, 100);  // Mock signal strength
    
    String message;
    serializeJson(doc, message);
    webSocket.sendTXT(message);
  }
  
  // Halt the card to prepare for next scan
  rfid.PICC_HaltA();
  
  // Visual feedback
  blinkLED(1, 300);
}

void checkPresenceSensor() {
  unsigned long currentTime = millis();
  if (currentTime - lastPirCheck < PIR_CHECK_INTERVAL) {
    return;
  }
  lastPirCheck = currentTime;
  
  bool currentPirState = digitalRead(PIR_PIN);
  
  if (currentPirState != pirState) {
    pirState = currentPirState;
    Serial.println("👁️ Presence " + String(pirState ? "detected" : "cleared"));
    
    if (serverConnected) {
      DynamicJsonDocument doc(256);
      doc["type"] = "presence_detected";
      doc["deviceId"] = deviceId;
      doc["presenceDetected"] = pirState;
      doc["timestamp"] = getTimestamp();
      
      String message;
      serializeJson(doc, message);
      webSocket.sendTXT(message);
    }
  }
}

void sendHeartbeat() {
  unsigned long currentTime = millis();
  if (currentTime - lastHeartbeat < HEARTBEAT_INTERVAL) {
    return;
  }
  lastHeartbeat = currentTime;
  
  if (!serverConnected) return;
  
  DynamicJsonDocument doc(256);
  doc["type"] = "heartbeat";
  doc["deviceId"] = deviceId;
  doc["timestamp"] = getTimestamp();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
}

void sendStatusUpdate() {
  unsigned long currentTime = millis();
  if (currentTime - lastStatusUpdate < STATUS_UPDATE_INTERVAL) {
    return;
  }
  lastStatusUpdate = currentTime;
  
  if (!serverConnected) return;
  
  DynamicJsonDocument doc(512);
  doc["type"] = "device_status";
  doc["deviceId"] = deviceId;
  doc["status"] = "online";
  doc["batteryLevel"] = getBatteryLevel();
  doc["temperature"] = getTemperature();
  doc["humidity"] = getHumidity();
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["uptime"] = millis();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("📊 Status update sent");
}

void sendDiagnostics() {
  DynamicJsonDocument doc(1024);
  doc["type"] = "diagnostics_response";
  doc["deviceId"] = deviceId;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["uptime"] = millis();
  doc["reset_reason"] = esp_reset_reason();
  doc["chip_model"] = ESP.getChipModel();
  doc["chip_revision"] = ESP.getChipRevision();
  doc["flash_size"] = ESP.getFlashChipSize();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("🔧 Diagnostics sent");
}

// Utility functions
String getTimestamp() {
  return String(millis());  // Simple timestamp, could use NTP for real time
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void beep(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(delayMs);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < times - 1) delay(delayMs);
  }
}

float getBatteryLevel() {
  // Mock battery level - replace with actual ADC reading if using battery
  return random(85, 100);
}

float getTemperature() {
  // Mock temperature - replace with actual sensor reading
  return random(250, 350) / 10.0;  // 25.0 to 35.0 degrees
}

float getHumidity() {
  // Mock humidity - replace with actual sensor reading
  return random(400, 700) / 10.0;  // 40.0% to 70.0%
}