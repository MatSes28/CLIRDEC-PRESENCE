/*
 * CLIRDEC: PRESENCE - Dual Mode ESP32 IoT Device
 * 
 * MODES:
 * 1. USB_REGISTRATION_MODE: Connects via USB, types RFID UIDs directly into web forms
 * 2. WIFI_ATTENDANCE_MODE: Connects via WiFi, sends real-time attendance data to server
 * 
 * Hardware: ESP32-WROOM-32 with RC522 RFID + HC-SR501 PIR
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
 * Mode Switch:
 *   Push Button -> GPIO 0 (Boot button can be used)
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Preferences.h>

// Pin definitions
#define SS_PIN 5
#define RST_PIN 22
#define PIR_PIN 4
#define LED_PIN 2
#define MODE_BUTTON_PIN 0  // Boot button
#define BUZZER_PIN 25

// WiFi credentials (UPDATE THESE WITH YOUR WIFI)
const char* ssid = "Kupal kaba boss?";
const char* password = "MatMir@12030908";

// Server configuration (UPDATE WITH YOUR REPLIT URL)
const char* websocket_server = "80c100b5-06da-459f-a3df-355da67989d9-00-311s6g7ren528.sisko.replit.dev";
const int websocket_port = 443;
const char* websocket_path = "/iot";

MFRC522 rfid(SS_PIN, RST_PIN);
WebSocketsClient webSocket;
Preferences preferences;

// Operating modes
enum OperatingMode {
  USB_REGISTRATION_MODE,    // Types RFID UIDs via USB Serial
  WIFI_ATTENDANCE_MODE      // Sends attendance data via WiFi
};

OperatingMode currentMode = WIFI_ATTENDANCE_MODE;

// Device state
String deviceId = "ESP32_" + String(ESP.getEfuseMac(), HEX);
bool isOnline = false;
bool wifiConnected = false;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds

// RFID state management
String lastUID = "";
unsigned long lastRFIDTime = 0;
const unsigned long RFID_COOLDOWN = 2000; // 2 seconds to prevent duplicate reads

// Motion detection
bool motionDetected = false;
unsigned long lastMotionTime = 0;
const unsigned long MOTION_TIMEOUT = 5000; // 5 seconds

// Mode switching
unsigned long lastModeCheck = 0;
bool lastButtonState = HIGH;
unsigned long buttonPressTime = 0;
const unsigned long LONG_PRESS_TIME = 3000; // 3 seconds for mode switch

void setup() {
  Serial.begin(9600);  // 9600 baud for USB typing compatibility
  Serial.println("🚀 CLIRDEC: PRESENCE Dual Mode ESP32 Starting...");
  
  // Initialize hardware
  setupHardware();
  
  // Load saved mode from preferences
  loadConfiguration();
  
  // Show current mode
  displayCurrentMode();
  
  // Initialize based on current mode
  if (currentMode == WIFI_ATTENDANCE_MODE) {
    initWiFiMode();
  } else {
    initUSBMode();
  }
  
  Serial.println("✅ Device initialization complete");
  indicateReady();
}

void loop() {
  // Check for mode switch button
  checkModeSwitch();
  
  // Check for RFID cards
  checkRFID();
  
  if (currentMode == WIFI_ATTENDANCE_MODE) {
    // WiFi mode operations
    webSocket.loop();
    checkWiFiConnection();
    checkPresenceSensor();
    sendHeartbeat();
  }
  
  delay(100);
}

void setupHardware() {
  // Initialize SPI for RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Initialize pins
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(MODE_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Test RFID module
  Serial.println("Testing RFID module...");
  if (!rfid.PCD_PerformSelfTest()) {
    Serial.println("❌ RFID module test failed!");
    blinkError();
  } else {
    Serial.println("✅ RFID module initialized");
  }
  
  // Re-initialize RFID for normal operation
  rfid.PCD_Init();
  
  // Initialize preferences
  preferences.begin("clirdec", false);
}

void loadConfiguration() {
  currentMode = (OperatingMode)preferences.getInt("mode", WIFI_ATTENDANCE_MODE);
  deviceId = preferences.getString("deviceId", deviceId);
}

void saveConfiguration() {
  preferences.putInt("mode", currentMode);
  preferences.putString("deviceId", deviceId);
}

void displayCurrentMode() {
  Serial.println("=================================");
  if (currentMode == USB_REGISTRATION_MODE) {
    Serial.println("📝 MODE: USB REGISTRATION");
    Serial.println("Function: Type RFID UIDs to computer");
    Serial.println("Usage: Open form field, tap RFID card");
  } else {
    Serial.println("📡 MODE: WIFI ATTENDANCE");
    Serial.println("Function: Real-time attendance monitoring");
    Serial.println("Usage: Wireless attendance tracking");
  }
  Serial.println("Hold BOOT button 3s to switch modes");
  Serial.println("=================================");
}

void initWiFiMode() {
  Serial.println("Initializing WiFi mode...");
  connectToWiFi();
  if (wifiConnected) {
    setupWebSocket();
  }
}

void initUSBMode() {
  Serial.println("Initializing USB registration mode...");
  Serial.println("Ready to type RFID UIDs");
  Serial.println("Tap RFID card near reader...");
  blinkLED(2, 200); // Indicate USB mode ready
}

void checkModeSwitch() {
  unsigned long currentTime = millis();
  if (currentTime - lastModeCheck < 100) return; // Check every 100ms
  lastModeCheck = currentTime;
  
  bool buttonState = digitalRead(MODE_BUTTON_PIN);
  
  // Detect button press
  if (buttonState == LOW && lastButtonState == HIGH) {
    buttonPressTime = currentTime;
  }
  
  // Detect long press (3 seconds)
  if (buttonState == LOW && lastButtonState == LOW) {
    if (currentTime - buttonPressTime >= LONG_PRESS_TIME) {
      switchMode();
      buttonPressTime = currentTime + 10000; // Prevent immediate re-trigger
    }
  }
  
  lastButtonState = buttonState;
}

void switchMode() {
  Serial.println("🔄 Switching mode...");
  blinkLED(5, 100);
  
  // Switch mode
  if (currentMode == USB_REGISTRATION_MODE) {
    currentMode = WIFI_ATTENDANCE_MODE;
    Serial.println("Switched to WiFi Attendance Mode");
    initWiFiMode();
  } else {
    currentMode = USB_REGISTRATION_MODE;
    Serial.println("Switched to USB Registration Mode");
    // Disconnect WiFi to save power
    if (wifiConnected) {
      WiFi.disconnect();
      wifiConnected = false;
    }
    initUSBMode();
  }
  
  // Save new mode
  saveConfiguration();
  displayCurrentMode();
}

void checkRFID() {
  // Check if a new card is present
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Build card ID string
  String cardId = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) cardId += "0";
    cardId += String(rfid.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();
  
  // Debounce - prevent multiple scans of same card
  unsigned long currentTime = millis();
  if (cardId == lastUID && (currentTime - lastRFIDTime) < RFID_COOLDOWN) {
    rfid.PICC_HaltA();
    return;
  }
  
  lastUID = cardId;
  lastRFIDTime = currentTime;
  
  // Handle based on current mode
  if (currentMode == USB_REGISTRATION_MODE) {
    handleUSBRFID(cardId);
  } else {
    handleWiFiRFID(cardId);
  }
  
  // Halt the card
  rfid.PICC_HaltA();
}

void handleUSBRFID(String cardId) {
  Serial.println("📝 USB Mode - Typing RFID: " + cardId);
  
  // Type the RFID UID directly to computer
  Serial.print(cardId);
  // Optional: add newline to auto-submit form
  Serial.println();
  
  // Visual feedback
  blinkLED(1, 300);
  beep(1, 100);
}

void handleWiFiRFID(String cardId) {
  Serial.println("📡 WiFi Mode - RFID Scanned: " + cardId);
  
  // Send to server via WebSocket
  if (isOnline) {
    DynamicJsonDocument doc(512);
    doc["type"] = "rfid_scan";
    doc["deviceId"] = deviceId;
    doc["rfidCardId"] = cardId;
    doc["timestamp"] = millis();
    doc["presenceDetected"] = motionDetected;
    
    String message;
    serializeJson(doc, message);
    webSocket.sendTXT(message);
    
    Serial.println("📤 Sent to server: " + message);
  } else {
    Serial.println("⚠️ Not connected to server");
  }
  
  // Visual feedback
  blinkLED(1, 300);
  beep(1, 100);
}

void connectToWiFi() {
  Serial.print("🌐 Connecting to WiFi: " + String(ssid));
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    digitalWrite(LED_PIN, HIGH);
    Serial.println("\n✅ WiFi connected!");
    Serial.println("IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ WiFi connection failed!");
    wifiConnected = false;
    digitalWrite(LED_PIN, LOW);
  }
}

void setupWebSocket() {
  webSocket.beginSSL(websocket_server, websocket_port, websocket_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  Serial.println("🔗 WebSocket client initialized");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("⚠️ WebSocket Disconnected");
      isOnline = false;
      digitalWrite(LED_PIN, LOW);
      break;
      
    case WStype_CONNECTED:
      Serial.printf("✅ WebSocket Connected to: %s\n", payload);
      isOnline = true;
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
  doc["deviceType"] = "dual_mode";
  doc["currentMode"] = (currentMode == USB_REGISTRATION_MODE) ? "usb" : "wifi";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["macAddress"] = WiFi.macAddress();
  doc["capabilities"] = JsonArray();
  doc["capabilities"].add("rfid_scan");
  doc["capabilities"].add("presence_detection");
  doc["capabilities"].add("mode_switching");
  
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
  }
  else if (type == "welcome") {
    Serial.println("✅ Welcome message received: " + String((const char*)doc["message"]));
  }
  else if (type == "scan_result") {
    String status = doc["status"];
    Serial.println("Scan result: " + status);
    
    // Provide appropriate feedback
    if (status == "checked_in" || status == "checked_out") {
      blinkLED(2, 200);
      beep(1, 100);
    }
    else if (status == "unknown_card") {
      blinkLED(5, 100);
      beep(3, 200);
    }
  }
  else if (type == "mode_switch_request") {
    Serial.println("📱 Server requested mode switch");
    switchMode();
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    Serial.println("⚠️ WiFi disconnected, reconnecting...");
    wifiConnected = false;
    isOnline = false;
    connectToWiFi();
  }
}

void checkPresenceSensor() {
  bool currentMotion = digitalRead(PIR_PIN);
  unsigned long currentTime = millis();
  
  if (currentMotion != motionDetected) {
    motionDetected = currentMotion;
    lastMotionTime = currentTime;
    
    Serial.println("👁️ Motion " + String(motionDetected ? "detected" : "cleared"));
    
    if (isOnline) {
      DynamicJsonDocument doc(256);
      doc["type"] = "presence_detected";
      doc["deviceId"] = deviceId;
      doc["presenceDetected"] = motionDetected;
      doc["timestamp"] = currentTime;
      
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
  
  if (!isOnline) return;
  
  DynamicJsonDocument doc(256);
  doc["type"] = "heartbeat";
  doc["deviceId"] = deviceId;
  doc["timestamp"] = currentTime;
  doc["mode"] = (currentMode == USB_REGISTRATION_MODE) ? "usb" : "wifi";
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
}

// LED Control Functions
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void blinkError() {
  // Error pattern: fast blinking
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(50);
    digitalWrite(LED_PIN, LOW);
    delay(50);
  }
}

void indicateReady() {
  // Ready pattern: 3 slow blinks
  blinkLED(3, 500);
}

// Buzzer Control Functions
void beep(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(delayMs);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < times - 1) delay(delayMs);
  }
}