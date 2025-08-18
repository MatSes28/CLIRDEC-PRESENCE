/*
 * CLIRDEC: PRESENCE - ESP32 IoT Device Code
 * ESP32-WROOM-32 with RC522 RFID Module and PIR Motion Sensor
 * 
 * Hardware Requirements:
 * - ESP32-WROOM-32 38-pin with USB Type-C
 * - RC522 RFID Module (13.56 MHz) 
 * - HC-SR501 PIR Motion Sensor
 * - MIFARE RFID Cards/Tags
 * - LED indicator (built-in GPIO 2)
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>

// WiFi Configuration - UPDATE THESE VALUES
const char* ssid = "YOUR_WIFI_SSID";         // Update with your WiFi network
const char* password = "YOUR_WIFI_PASSWORD"; // Update with your WiFi password

// Server Configuration - UPDATE WITH YOUR REPLIT DOMAIN
const char* serverHost = "YOUR-REPLIT-DOMAIN.replit.dev";  // e.g., "your-username-clirdec-presence.replit.dev"
const int serverPort = 443;
const char* serverPath = "/iot";

// Hardware Pin Configuration
#define SS_PIN 5       // RC522 SDA pin
#define RST_PIN 22     // RC522 RST pin
#define PIR_PIN 4      // PIR motion sensor pin
#define LED_PIN 2      // Built-in LED pin

// Device Configuration
String deviceId = "ESP32_CLIRDEC_" + String(ESP.getChipId());
String classroomLocation = "Lab 204"; // Update with actual classroom location

// Hardware instances
MFRC522 rfid(SS_PIN, RST_PIN);
WebSocketsClient webSocket;

// State variables
bool pirSensorEnabled = true;
bool rfidScannerEnabled = true;
unsigned long lastHeartbeat = 0;
unsigned long lastRFIDScan = 0;
String lastScannedCard = "";
int consecutiveFailures = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("🚀 CLIRDEC: PRESENCE ESP32 Starting...");
  
  // Initialize hardware
  pinMode(LED_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Initialize SPI and RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize WebSocket connection
  initializeWebSocket();
  
  Serial.println("✅ ESP32 Setup Complete - Device ID: " + deviceId);
  blinkLED(3, 200); // Success indicator
}

void loop() {
  webSocket.loop();
  
  // Check PIR motion sensor
  if (pirSensorEnabled) {
    checkMotionSensor();
  }
  
  // Check RFID scanner
  if (rfidScannerEnabled) {
    checkRFIDScanner();
  }
  
  // Send periodic heartbeat (every 30 seconds)
  if (millis() - lastHeartbeat > 30000) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  delay(100);
}

void connectToWiFi() {
  Serial.println("📶 Connecting to WiFi: " + String(ssid));
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.println("📍 IP Address: " + WiFi.localIP().toString());
    blinkLED(2, 100);
  } else {
    Serial.println("\n❌ WiFi Connection Failed");
    while (true) {
      blinkLED(5, 50); // Error indicator
      delay(2000);
    }
  }
}

void initializeWebSocket() {
  Serial.println("🌐 Connecting to WebSocket Server...");
  webSocket.beginSSL(serverHost, serverPort, serverPath);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket Disconnected");
      consecutiveFailures++;
      break;
      
    case WStype_CONNECTED:
      Serial.println("✅ WebSocket Connected to: " + String((char*)payload));
      consecutiveFailures = 0;
      registerDevice();
      blinkLED(1, 500);
      break;
      
    case WStype_TEXT:
      handleWebSocketMessage(String((char*)payload));
      break;
      
    case WStype_ERROR:
      Serial.println("❌ WebSocket Error");
      consecutiveFailures++;
      break;
      
    default:
      break;
  }
}

void registerDevice() {
  DynamicJsonDocument doc(1024);
  doc["type"] = "device_register";
  doc["deviceId"] = deviceId;
  doc["deviceType"] = "ESP32_RFID_PIR";
  doc["location"] = classroomLocation;
  doc["capabilities"] = JsonArray();
  doc["capabilities"].add("rfid_scan");
  doc["capabilities"].add("presence_detection");
  doc["capabilities"].add("heartbeat");
  doc["firmware_version"] = "1.0.0";
  doc["chip_id"] = String(ESP.getChipId());
  doc["ip_address"] = WiFi.localIP().toString();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("📝 Device Registration Sent");
}

void handleWebSocketMessage(String message) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);
  
  String type = doc["type"];
  Serial.println("📨 Received: " + type);
  
  if (type == "config_update") {
    // Update device configuration
    if (doc.containsKey("pirEnabled")) {
      pirSensorEnabled = doc["pirEnabled"];
    }
    if (doc.containsKey("rfidEnabled")) {
      rfidScannerEnabled = doc["rfidEnabled"];
    }
    if (doc.containsKey("location")) {
      classroomLocation = doc["location"];
    }
    Serial.println("⚙️ Configuration Updated");
    
  } else if (type == "diagnostic_request") {
    sendDiagnostics();
    
  } else if (type == "ping") {
    sendPong();
  }
}

void checkMotionSensor() {
  static bool lastMotionState = false;
  bool currentMotion = digitalRead(PIR_PIN);
  
  if (currentMotion != lastMotionState) {
    lastMotionState = currentMotion;
    
    if (currentMotion) {
      Serial.println("👤 Motion Detected!");
      sendPresenceDetected();
      digitalWrite(LED_PIN, HIGH);
    } else {
      Serial.println("👤 Motion Stopped");
      digitalWrite(LED_PIN, LOW);
    }
  }
}

void checkRFIDScanner() {
  // Check if new card is present
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Prevent duplicate scans within 2 seconds
  if (millis() - lastRFIDScan < 2000) {
    rfid.PICC_HaltA();
    return;
  }
  
  // Read RFID card UID
  String cardUID = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) cardUID += "0";
    cardUID += String(rfid.uid.uidByte[i], HEX);
  }
  cardUID.toUpperCase();
  
  // Avoid duplicate scans of the same card
  if (cardUID != lastScannedCard || millis() - lastRFIDScan > 30000) {
    Serial.println("🏷️ RFID Card Scanned: " + cardUID);
    sendRFIDScan(cardUID);
    lastScannedCard = cardUID;
    lastRFIDScan = millis();
    
    // Visual feedback
    blinkLED(2, 150);
  }
  
  rfid.PICC_HaltA();
}

void sendRFIDScan(String cardUID) {
  DynamicJsonDocument doc(512);
  doc["type"] = "rfid_scan";
  doc["deviceId"] = deviceId;
  doc["cardUID"] = cardUID;
  doc["timestamp"] = millis();
  doc["location"] = classroomLocation;
  doc["presenceValidated"] = digitalRead(PIR_PIN); // Include motion sensor status
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("📤 RFID Scan Sent: " + cardUID);
}

void sendPresenceDetected() {
  DynamicJsonDocument doc(512);
  doc["type"] = "presence_detected";
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  doc["location"] = classroomLocation;
  doc["sensorType"] = "PIR";
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
}

void sendHeartbeat() {
  DynamicJsonDocument doc(1024);
  doc["type"] = "heartbeat";
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  doc["uptime"] = millis();
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["chip_temperature"] = temperatureRead();
  doc["pir_enabled"] = pirSensorEnabled;
  doc["rfid_enabled"] = rfidScannerEnabled;
  doc["location"] = classroomLocation;
  doc["ip_address"] = WiFi.localIP().toString();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("💓 Heartbeat Sent - Uptime: " + String(millis() / 1000) + "s");
}

void sendDiagnostics() {
  DynamicJsonDocument doc(1024);
  doc["type"] = "diagnostic_response";
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  doc["wifi_status"] = WiFi.status();
  doc["wifi_ssid"] = WiFi.SSID();
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["chip_temperature"] = temperatureRead();
  doc["rfid_version"] = rfid.PCD_ReadRegister(MFRC522::VersionReg);
  doc["pir_state"] = digitalRead(PIR_PIN);
  doc["consecutive_failures"] = consecutiveFailures;
  doc["last_rfid_scan"] = lastRFIDScan;
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("🔧 Diagnostics Sent");
}

void sendPong() {
  DynamicJsonDocument doc(256);
  doc["type"] = "pong";
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

// Error handling and recovery
void handleConnectionFailure() {
  Serial.println("⚠️ Connection failure detected");
  
  if (consecutiveFailures >= 5) {
    Serial.println("🔄 Restarting ESP32 due to repeated failures...");
    ESP.restart();
  }
  
  // Try to reconnect WiFi if needed
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
  }
}

/*
 * Hardware Wiring Guide:
 * 
 * RC522 RFID Module:
 * - VCC → 3.3V
 * - RST → GPIO 22
 * - GND → GND
 * - MISO → GPIO 19
 * - MOSI → GPIO 23
 * - SCK → GPIO 18
 * - SDA → GPIO 5
 * 
 * PIR HC-SR501:
 * - VCC → 5V
 * - GND → GND
 * - OUT → GPIO 4
 * 
 * LED (Built-in):
 * - Anode → GPIO 2
 * - Cathode → GND
 * 
 * Setup Instructions:
 * 1. Install Arduino IDE and ESP32 board support
 * 2. Install libraries: WebSocketsClient, ArduinoJson, MFRC522
 * 3. Update WiFi credentials above
 * 4. Update serverHost with your Replit domain
 * 5. Wire components according to diagram
 * 6. Upload code to ESP32
 * 7. Monitor serial output for connection status
 * 8. Register device in CLIRDEC admin panel
 */