/*
 * CLIRDEC: PRESENCE - Safe ESP32 IoT Device
 * Corruption-resistant firmware with watchdog protection
 * 
 * Hardware: ESP32-WROOM-32 with RC522 RFID + HC-SR501 PIR
 * 
 * Pin Connections:
 * RC522 RFID Module:
 *   VCC -> 3.3V (IMPORTANT: NOT 5V!)
 *   RST -> GPIO 22
 *   GND -> GND
 *   MISO -> GPIO 19
 *   MOSI -> GPIO 23
 *   SCK -> GPIO 18
 *   SDA -> GPIO 5
 * 
 * HC-SR501 PIR Sensor (Optional):
 *   VCC -> 5V
 *   GND -> GND
 *   OUT -> GPIO 4
 * 
 * Status LED: GPIO 2 (Built-in)
 * Mode Button: GPIO 0 (Boot button)
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Preferences.h>
#include <esp_task_wdt.h>

// Hardware pins
#define SS_PIN 5
#define RST_PIN 22
#define PIR_PIN 4
#define LED_PIN 2
#define MODE_BUTTON_PIN 0
#define BUZZER_PIN 25

// WiFi credentials - UPDATE THESE WITH YOUR NETWORK
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration - ALREADY UPDATED FOR YOUR SYSTEM
const char* websocket_server = "80c100b5-06da-459f-a3df-355da67989d9-00-311s6g7ren528.sisko.replit.dev";
const int websocket_port = 443;
const char* websocket_path = "/iot";

// Hardware objects
MFRC522 rfid(SS_PIN, RST_PIN);
WebSocketsClient webSocket;
Preferences preferences;

// Operating modes
enum OperatingMode {
  USB_REGISTRATION_MODE,
  WIFI_ATTENDANCE_MODE
};

// Device state
OperatingMode currentMode = WIFI_ATTENDANCE_MODE;
String deviceId;
bool isOnline = false;
bool wifiConnected = false;
unsigned long lastHeartbeat = 0;
unsigned long lastWatchdogReset = 0;
unsigned long lastWiFiCheck = 0;

// Timing constants
const unsigned long HEARTBEAT_INTERVAL = 30000;     // 30 seconds
const unsigned long WATCHDOG_TIMEOUT = 60000;       // 60 seconds
const unsigned long WIFI_CHECK_INTERVAL = 10000;    // 10 seconds
const unsigned long RFID_COOLDOWN = 2000;           // 2 seconds
const unsigned long BUTTON_DEBOUNCE = 200;          // 200ms

// RFID state
String lastUID = "";
unsigned long lastRFIDTime = 0;

// Button state
bool lastButtonState = HIGH;
unsigned long lastButtonTime = 0;

// Safety and recovery
int reconnectAttempts = 0;
const int MAX_RECONNECT_ATTEMPTS = 5;
bool systemHealthy = true;

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("======================================");
  Serial.println("CLIRDEC: PRESENCE ESP32 Starting...");
  Serial.println("======================================");
  
  // Generate unique device ID
  deviceId = "ESP32_" + String(ESP.getEfuseMac(), HEX);
  deviceId.toUpperCase();
  
  Serial.println("Device ID: " + deviceId);
  
  // Initialize watchdog timer
  esp_task_wdt_init(WATCHDOG_TIMEOUT / 1000, true);
  esp_task_wdt_add(NULL);
  
  // Initialize hardware
  initializeHardware();
  
  // Load preferences
  loadSettings();
  
  // Show current mode
  Serial.println("Current Mode: " + String(currentMode == WIFI_ATTENDANCE_MODE ? "WiFi Attendance" : "USB Registration"));
  
  // Initialize based on mode
  if (currentMode == WIFI_ATTENDANCE_MODE) {
    initWiFiMode();
  } else {
    initUSBMode();
  }
  
  Serial.println("✅ Initialization complete");
  indicateReady();
  
  lastWatchdogReset = millis();
}

void loop() {
  // Feed watchdog timer
  unsigned long now = millis();
  if (now - lastWatchdogReset > 30000) {
    esp_task_wdt_reset();
    lastWatchdogReset = now;
  }
  
  // Check mode switch
  checkModeSwitch();
  
  // Check RFID
  if (checkRFID()) {
    // RFID card detected - blink LED
    blinkLED(2, 100);
  }
  
  if (currentMode == WIFI_ATTENDANCE_MODE) {
    // WiFi mode operations
    webSocket.loop();
    
    // Check WiFi connection periodically
    if (now - lastWiFiCheck > WIFI_CHECK_INTERVAL) {
      checkWiFiConnection();
      lastWiFiCheck = now;
    }
    
    // Send heartbeat
    sendHeartbeat();
    
    // Check presence sensor
    checkPresenceSensor();
  }
  
  // Small delay to prevent excessive CPU usage
  delay(50);
}

void initializeHardware() {
  Serial.println("Initializing hardware...");
  
  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Initialize button
  pinMode(MODE_BUTTON_PIN, INPUT_PULLUP);
  
  // Initialize PIR sensor
  pinMode(PIR_PIN, INPUT);
  
  // Initialize SPI and RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Test RFID module
  if (rfid.PCD_PerformSelfTest()) {
    Serial.println("✅ RFID module test passed");
  } else {
    Serial.println("⚠️ RFID module test failed - check connections");
  }
  
  // Re-initialize RFID after self-test
  rfid.PCD_Init();
  
  Serial.println("Hardware initialization complete");
}

void loadSettings() {
  preferences.begin("clirdec", false);
  currentMode = (OperatingMode)preferences.getInt("mode", WIFI_ATTENDANCE_MODE);
  preferences.end();
}

void saveSettings() {
  preferences.begin("clirdec", false);
  preferences.putInt("mode", currentMode);
  preferences.end();
}

void initWiFiMode() {
  Serial.println("Initializing WiFi mode...");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  Serial.print("Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
    esp_task_wdt_reset();
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println();
    Serial.println("✅ WiFi connected!");
    Serial.println("IP address: " + WiFi.localIP().toString());
    
    // Initialize WebSocket
    initWebSocket();
  } else {
    Serial.println();
    Serial.println("❌ WiFi connection failed");
    wifiConnected = false;
  }
}

void initUSBMode() {
  Serial.println("USB Registration Mode Active");
  Serial.println("Tap RFID cards to output UIDs via USB");
  wifiConnected = false;
  isOnline = false;
}

void initWebSocket() {
  Serial.println("Connecting to WebSocket server...");
  
  webSocket.beginSSL(websocket_server, websocket_port, websocket_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  
  Serial.println("WebSocket connection initiated");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  String message;
  
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("⚠️ WebSocket Disconnected");
      isOnline = false;
      reconnectAttempts++;
      break;
      
    case WStype_CONNECTED:
      Serial.println("✅ WebSocket Connected");
      Serial.println("Server: " + String((char*)payload));
      isOnline = true;
      reconnectAttempts = 0;
      
      // Register device
      registerDevice();
      break;
      
    case WStype_TEXT:
      message = String((char*)payload);
      Serial.println("📨 Received: " + message);
      handleServerMessage(message);
      break;
      
    case WStype_ERROR:
      Serial.println("❌ WebSocket Error: " + String((char*)payload));
      break;
      
    default:
      break;
  }
}

void registerDevice() {
  if (!isOnline) return;
  
  DynamicJsonDocument doc(1024);
  doc["type"] = "device_register";
  doc["deviceId"] = deviceId;
  doc["deviceType"] = "esp32";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["macAddress"] = WiFi.macAddress();
  doc["capabilities"] = JsonArray();
  doc["capabilities"].add("rfid_scan");
  doc["capabilities"].add("presence_detection");
  doc["currentMode"] = "wifi";
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
  Serial.println("📱 Device registration sent");
}

void handleServerMessage(String message) {
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.println("❌ JSON parsing failed");
    return;
  }
  
  String type = doc["type"];
  
  if (type == "welcome") {
    Serial.println("✅ Server welcome: " + String((const char*)doc["message"]));
  }
  else if (type == "registration_success") {
    Serial.println("🎉 Device registered successfully!");
    String classroom = doc["classroomName"];
    if (classroom.length() > 0) {
      Serial.println("Assigned to classroom: " + classroom);
    }
    blinkLED(3, 200);
  }
  else if (type == "scan_result") {
    String status = doc["status"];
    String studentName = doc["studentName"];
    Serial.println("📱 Scan result: " + status + " - " + studentName);
    
    if (status == "checked_in") {
      blinkLED(2, 100);
    } else {
      blinkLED(5, 50);
    }
  }
  else if (type == "error") {
    Serial.println("❌ Server error: " + String((const char*)doc["message"]));
  }
}

bool checkRFID() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return false;
  }
  
  // Prevent duplicate reads
  unsigned long now = millis();
  if (now - lastRFIDTime < RFID_COOLDOWN) {
    return false;
  }
  
  // Read UID
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  
  // Check if same card as last read
  if (uid == lastUID && (now - lastRFIDTime) < 5000) {
    return false;
  }
  
  lastUID = uid;
  lastRFIDTime = now;
  
  Serial.println("📱 RFID Card: " + uid);
  
  if (currentMode == USB_REGISTRATION_MODE) {
    // USB mode - output UID for typing
    Serial.println(uid);
  } else if (currentMode == WIFI_ATTENDANCE_MODE && isOnline) {
    // WiFi mode - send to server
    sendRFIDScan(uid);
  }
  
  // Halt PICC
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  return true;
}

void sendRFIDScan(String uid) {
  if (!isOnline) return;
  
  DynamicJsonDocument doc(512);
  doc["type"] = "rfid_scan";
  doc["deviceId"] = deviceId;
  doc["rfidCardId"] = uid;
  doc["timestamp"] = millis();
  doc["presenceDetected"] = digitalRead(PIR_PIN);
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
  Serial.println("📤 RFID scan sent: " + uid);
}

void checkPresenceSensor() {
  static bool lastPresence = false;
  static unsigned long lastPresenceTime = 0;
  
  bool presence = digitalRead(PIR_PIN);
  unsigned long now = millis();
  
  if (presence != lastPresence && (now - lastPresenceTime) > 1000) {
    lastPresence = presence;
    lastPresenceTime = now;
    
    if (presence) {
      Serial.println("👁️ Motion detected");
    } else {
      Serial.println("👁️ Motion cleared");
    }
    
    sendPresenceUpdate(presence);
  }
}

void sendPresenceUpdate(bool detected) {
  if (!isOnline) return;
  
  DynamicJsonDocument doc(512);
  doc["type"] = "presence_detected";
  doc["deviceId"] = deviceId;
  doc["presenceDetected"] = detected;
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  
  webSocket.sendTXT(message);
}

void sendHeartbeat() {
  unsigned long now = millis();
  if (now - lastHeartbeat < HEARTBEAT_INTERVAL) return;
  
  if (isOnline) {
    DynamicJsonDocument doc(512);
    doc["type"] = "heartbeat";
    doc["deviceId"] = deviceId;
    doc["timestamp"] = now;
    doc["mode"] = (currentMode == WIFI_ATTENDANCE_MODE) ? "wifi" : "usb";
    doc["wifiSignal"] = WiFi.RSSI();
    doc["freeHeap"] = ESP.getFreeHeap();
    
    String message;
    serializeJson(doc, message);
    
    webSocket.sendTXT(message);
  }
  
  lastHeartbeat = now;
}

void checkWiFiConnection() {
  if (currentMode != WIFI_ATTENDANCE_MODE) return;
  
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      Serial.println("⚠️ WiFi connection lost");
      wifiConnected = false;
      isOnline = false;
    }
    
    // Try to reconnect
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      Serial.println("Attempting WiFi reconnection...");
      WiFi.reconnect();
      reconnectAttempts++;
    } else {
      Serial.println("Max reconnection attempts reached - restarting...");
      ESP.restart();
    }
  } else if (!wifiConnected) {
    Serial.println("✅ WiFi reconnected");
    wifiConnected = true;
    reconnectAttempts = 0;
  }
}

void checkModeSwitch() {
  unsigned long now = millis();
  
  if (now - lastButtonTime < BUTTON_DEBOUNCE) return;
  
  bool buttonState = digitalRead(MODE_BUTTON_PIN);
  
  if (buttonState != lastButtonState) {
    lastButtonState = buttonState;
    lastButtonTime = now;
    
    if (buttonState == LOW) {
      // Button pressed - start timer for long press
      static unsigned long pressStartTime = now;
      
      // Check for long press (3 seconds)
      if (now - pressStartTime > 3000) {
        switchMode();
        pressStartTime = now + 10000; // Prevent multiple switches
      }
    }
  }
}

void switchMode() {
  Serial.println("🔄 Switching operating mode...");
  
  if (currentMode == WIFI_ATTENDANCE_MODE) {
    currentMode = USB_REGISTRATION_MODE;
    webSocket.disconnect();
    WiFi.disconnect();
    initUSBMode();
  } else {
    currentMode = WIFI_ATTENDANCE_MODE;
    initWiFiMode();
  }
  
  saveSettings();
  Serial.println("Mode switched to: " + String(currentMode == WIFI_ATTENDANCE_MODE ? "WiFi Attendance" : "USB Registration"));
  
  // Indicate mode change
  blinkLED(5, 100);
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void indicateReady() {
  // Ready indication - slow pulse
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(300);
    digitalWrite(LED_PIN, LOW);
    delay(300);
  }
  Serial.println("🚀 Device ready for operation");
}