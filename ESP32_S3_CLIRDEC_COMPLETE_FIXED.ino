/*
 * CLIRDEC: PRESENCE - Dual Mode ESP32-S3 IoT Device
 * 
 * MODES:
 * 1. USB_REGISTRATION_MODE: Connects via USB, types RFID UIDs directly into web forms
 * 2. WIFI_ATTENDANCE_MODE: Connects via WiFi, sends real-time attendance data to server
 * 
 * Hardware: ESP32-S3 with RC522 RFID + HC-SR04 Ultrasonic Sensor
 * 
 * Pin Connections for ESP32-S3:
 * RC522 RFID Module:
 *   VCC -> 3.3V
 *   RST -> GPIO 4
 *   GND -> GND
 *   MISO -> GPIO 13
 *   MOSI -> GPIO 11
 *   SCK -> GPIO 12
 *   SDA -> GPIO 10
 * 
 * HC-SR04 Ultrasonic Sensor:
 *   VCC -> 5V
 *   GND -> GND
 *   Trig -> GPIO 5
 *   Echo -> GPIO 18
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

// Pin definitions for ESP32-S3
#define SS_PIN 10         // SDA/SS pin
#define RST_PIN 4         // Reset pin
#define TRIG_PIN 5        // HC-SR04 Trigger pin (UPDATED)
#define ECHO_PIN 18       // HC-SR04 Echo pin (UPDATED)
#define LED_PIN 2         // Built-in LED
#define MODE_BUTTON_PIN 0 // Boot button
#define BUZZER_PIN 47     // Buzzer pin for ESP32-S3

// WiFi credentials (UPDATE THESE WITH YOUR WIFI)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server configuration (UPDATED TO CURRENT REPLIT URL)
const char* websocket_server = "ecb19220-a007-487b-9ee7-d84bf401b8be-00-vw37dlwicktt.pike.replit.dev";
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
String deviceId = "ESP32S3_" + String(ESP.getEfuseMac(), HEX);
bool isOnline = false;
bool wifiConnected = false;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds

// RFID state management
String lastUID = "";
unsigned long lastRFIDTime = 0;
const unsigned long RFID_COOLDOWN = 2000; // 2 seconds to prevent duplicate reads

// Distance detection
float currentDistance = 0;
float lastDistance = 0;
bool presenceDetected = false;
unsigned long lastDistanceTime = 0;
const unsigned long DISTANCE_INTERVAL = 1000; // Check every 1 second
const float PRESENCE_THRESHOLD = 50.0; // Distance in cm to detect presence

// Mode switching
unsigned long lastModeCheck = 0;
bool lastButtonState = HIGH;
unsigned long buttonPressTime = 0;
const unsigned long LONG_PRESS_TIME = 3000; // 3 seconds for mode switch

void setup() {
  Serial.begin(9600);  // 9600 baud for USB typing compatibility
  Serial.println("🚀 CLIRDEC: PRESENCE Dual Mode ESP32-S3 Starting...");
  
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
    handleWiFiMode();
  } else {
    // USB mode operations
    handleUSBMode();
  }
  
  // Small delay to prevent excessive CPU usage
  delay(100);
}

void setupHardware() {
  // Initialize SPI for RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Initialize pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(MODE_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Initialize pin states
  digitalWrite(TRIG_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  
  // Initialize preferences
  preferences.begin("clirdec", false);
  
  Serial.println("🔧 Hardware initialized");
  Serial.println("📍 HC-SR04: GPIO 5 (Trig), GPIO 18 (Echo)");
  Serial.println("📡 RC522: SPI interface configured");
}

void loadConfiguration() {
  // Load saved operating mode
  int savedMode = preferences.getInt("mode", WIFI_ATTENDANCE_MODE);
  currentMode = (OperatingMode)savedMode;
}

void saveConfiguration() {
  preferences.putInt("mode", (int)currentMode);
}

void displayCurrentMode() {
  Serial.println("🎯 Current Operating Mode:");
  if (currentMode == WIFI_ATTENDANCE_MODE) {
    Serial.println("   📶 WIFI_ATTENDANCE_MODE - Real-time attendance tracking");
  } else {
    Serial.println("   🔌 USB_REGISTRATION_MODE - RFID typing for registration");
  }
}

void initWiFiMode() {
  Serial.println("🌐 Initializing WiFi mode...");
  connectToWiFi();
  
  if (wifiConnected) {
    connectWebSocket();
  }
}

void initUSBMode() {
  Serial.println("🔌 Initializing USB mode...");
  Serial.println("📝 Ready to type RFID UIDs for registration");
  Serial.println("💡 Tap RFID cards to type their UIDs via USB");
}

void connectToWiFi() {
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("");
    Serial.print("✅ WiFi connected! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println("");
    Serial.println("❌ WiFi connection failed");
  }
}

void connectWebSocket() {
  Serial.print("🔌 Connecting to WebSocket server: ");
  Serial.print(websocket_server);
  Serial.print(":");
  Serial.print(websocket_port);
  Serial.println(websocket_path);
  
  webSocket.begin(websocket_server, websocket_port, websocket_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(10000); // 10 seconds reconnect interval
  webSocket.enableHeartbeat(15000, 3000, 2); // Enable heartbeat: 15s ping, 3s pong timeout, 2 retries
  
  Serial.println("🔌 WebSocket connection initiated...");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("🔌 WebSocket Disconnected");
      isOnline = false;
      // Visual indicator for disconnection
      digitalWrite(LED_PIN, LOW);
      break;
      
    case WStype_CONNECTED:
      Serial.printf("🔌 WebSocket Connected to: %s\n", payload);
      isOnline = true;
      registerDevice();
      // Visual indicator for connection
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      break;
      
    case WStype_TEXT:
      Serial.printf("📨 Received: %s\n", payload);
      handleServerMessage((char*)payload);
      break;
      
    case WStype_ERROR:
      Serial.println("❌ WebSocket Error");
      isOnline = false;
      // Error pattern - rapid blinking
      for (int i = 0; i < 3; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(100);
        digitalWrite(LED_PIN, LOW);
        delay(100);
      }
      break;
      
    case WStype_PONG:
      Serial.println("💓 WebSocket Pong received");
      break;
      
    default:
      Serial.printf("🔍 WebSocket event type: %d\n", type);
      break;
  }
}

void registerDevice() {
  if (!isOnline) {
    Serial.println("⚠️  Cannot register device - not connected");
    return;
  }
  
  DynamicJsonDocument doc(512);
  doc["type"] = "device_register";
  doc["deviceId"] = deviceId;
  doc["deviceType"] = "ESP32S3_RFID_PRESENCE";
  doc["capabilities"] = "rfid,presence";
  doc["location"] = "Computer Lab";
  doc["firmware_version"] = "2.0.0";
  doc["pin_config"]["trig"] = TRIG_PIN;
  doc["pin_config"]["echo"] = ECHO_PIN;
  
  String message;
  serializeJson(doc, message);
  
  if (webSocket.sendTXT(message)) {
    Serial.println("📝 Device registered with server successfully");
  } else {
    Serial.println("❌ Failed to send device registration");
  }
}

void handleServerMessage(const char* message) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);
  
  String msgType = doc["type"];
  
  if (msgType == "ping") {
    // Respond to ping
    DynamicJsonDocument response(256);
    response["type"] = "pong";
    response["deviceId"] = deviceId;
    response["timestamp"] = millis();
    
    String responseStr;
    serializeJson(response, responseStr);
    webSocket.sendTXT(responseStr);
  }
  else if (msgType == "config_update") {
    // Handle configuration updates
    Serial.println("⚙️  Configuration updated");
  }
}

void checkModeSwitch() {
  if (millis() - lastModeCheck < 100) return; // Check every 100ms
  lastModeCheck = millis();
  
  bool buttonState = digitalRead(MODE_BUTTON_PIN);
  
  // Detect button press (HIGH to LOW transition)
  if (lastButtonState == HIGH && buttonState == LOW) {
    buttonPressTime = millis();
  }
  
  // Detect long press (button held for 3+ seconds)
  if (buttonState == LOW && (millis() - buttonPressTime) > LONG_PRESS_TIME) {
    switchMode();
    buttonPressTime = millis() + 5000; // Prevent multiple triggers
  }
  
  lastButtonState = buttonState;
}

void switchMode() {
  Serial.println("🔄 Switching operating mode...");
  
  // Switch mode
  if (currentMode == WIFI_ATTENDANCE_MODE) {
    currentMode = USB_REGISTRATION_MODE;
    // Disconnect WiFi and WebSocket
    webSocket.disconnect();
    WiFi.disconnect();
    wifiConnected = false;
    isOnline = false;
    initUSBMode();
  } else {
    currentMode = WIFI_ATTENDANCE_MODE;
    initWiFiMode();
  }
  
  // Save new mode
  saveConfiguration();
  displayCurrentMode();
  
  // Visual and audio feedback
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 1000, 200);
    delay(300);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
}

void checkRFID() {
  // Prevent too frequent reads
  if (millis() - lastRFIDTime < RFID_COOLDOWN) return;
  
  // Check for new RFID card
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Read UID
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uid += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  
  // Prevent duplicate reads of same card
  if (uid == lastUID && (millis() - lastRFIDTime) < 5000) {
    rfid.PICC_HaltA();
    return;
  }
  
  lastUID = uid;
  lastRFIDTime = millis();
  
  Serial.print("🏷️  RFID Card detected: ");
  Serial.println(uid);
  
  // Handle based on current mode
  if (currentMode == WIFI_ATTENDANCE_MODE) {
    handleAttendanceRFID(uid);
  } else {
    handleRegistrationRFID(uid);
  }
  
  // Visual feedback
  digitalWrite(LED_PIN, HIGH);
  tone(BUZZER_PIN, 2000, 100);
  delay(100);
  digitalWrite(LED_PIN, LOW);
  
  // Halt the card
  rfid.PICC_HaltA();
}

void handleAttendanceRFID(String uid) {
  if (!isOnline) {
    Serial.println("⚠️  Device offline - cannot send attendance");
    return;
  }
  
  // Measure distance for presence validation
  float distance = measureDistance();
  bool validPresence = (distance > 0 && distance <= PRESENCE_THRESHOLD);
  
  // Send attendance data
  DynamicJsonDocument doc(512);
  doc["type"] = "attendance";
  doc["deviceId"] = deviceId;
  doc["rfidUID"] = uid;
  doc["timestamp"] = millis();
  doc["distance"] = distance;
  doc["presenceConfirmed"] = validPresence;
  doc["location"] = "Computer Lab";
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.print("📊 Attendance sent - Distance: ");
  Serial.print(distance);
  Serial.print("cm, Presence: ");
  Serial.println(validPresence ? "✅" : "❌");
}

void handleRegistrationRFID(String uid) {
  // Type the UID via USB (acts like a keyboard)
  Serial.print(uid);
  delay(100); // Small delay to ensure proper typing
  
  Serial.print("⌨️  Typed UID: ");
  Serial.println(uid);
}

void handleWiFiMode() {
  // Handle WebSocket communication
  webSocket.loop();
  
  // Check WiFi connection status
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      Serial.println("❌ WiFi connection lost - attempting to reconnect");
      wifiConnected = false;
      isOnline = false;
      
      // Visual indicator for WiFi disconnection
      for (int i = 0; i < 2; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(200);
        digitalWrite(LED_PIN, LOW);
        delay(200);
      }
    }
    
    // Try to reconnect WiFi
    connectToWiFi();
    
    // If WiFi reconnected but WebSocket not connected, reconnect WebSocket
    if (wifiConnected && !isOnline) {
      delay(1000); // Give WiFi time to stabilize
      connectWebSocket();
    }
  }
  
  // Send heartbeat periodically
  if (isOnline && (millis() - lastHeartbeat) > HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeat = millis();
  }
  
  // Check presence detection
  checkPresence();
}

void handleUSBMode() {
  // In USB mode, we just wait for RFID cards
  // The main logic is handled in checkRFID()
  
  // Blink LED slowly to indicate USB mode
  static unsigned long lastBlink = 0;
  if (millis() - lastBlink > 2000) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    lastBlink = millis();
  }
}

void sendHeartbeat() {
  DynamicJsonDocument doc(256);
  doc["type"] = "heartbeat";
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  doc["status"] = "online";
  doc["presence"] = presenceDetected;
  doc["distance"] = currentDistance;
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
}

void checkPresence() {
  if (millis() - lastDistanceTime < DISTANCE_INTERVAL) return;
  
  float distance = measureDistance();
  
  if (distance > 0) {
    currentDistance = distance;
    bool wasPresent = presenceDetected;
    presenceDetected = (distance <= PRESENCE_THRESHOLD);
    
    // Log presence changes
    if (presenceDetected != wasPresent) {
      Serial.print("👤 Presence ");
      Serial.print(presenceDetected ? "DETECTED" : "LOST");
      Serial.print(" at ");
      Serial.print(distance);
      Serial.println("cm");
      
      // Send presence update
      if (isOnline) {
        DynamicJsonDocument doc(256);
        doc["type"] = "presence";
        doc["deviceId"] = deviceId;
        doc["timestamp"] = millis();
        doc["present"] = presenceDetected;
        doc["distance"] = distance;
        
        String message;
        serializeJson(doc, message);
        webSocket.sendTXT(message);
      }
    }
  } else {
    // Sensor timeout - assume no presence
    if (presenceDetected) {
      presenceDetected = false;
      Serial.println("⚠️  HC-SR04 sensor timeout - assuming no presence");
    }
  }
  
  lastDistanceTime = millis();
}

float measureDistance() {
  // Clear trigger
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Send 10µs pulse
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Read echo pulse duration (30ms timeout)
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  
  if (duration == 0) {
    return -1; // Timeout
  }
  
  // Calculate distance: (duration * speed of sound) / 2
  // Speed of sound = 343 m/s = 0.0343 cm/µs
  float distance = (duration * 0.0343) / 2;
  
  // Validate range
  if (distance < 2 || distance > 400) {
    return -1; // Out of valid range
  }
  
  return distance;
}

void indicateReady() {
  // Startup sequence
  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, 1500 + (i * 200), 100);
    delay(150);
    digitalWrite(LED_PIN, LOW);
    delay(150);
  }
  
  Serial.println("🎉 Device ready for operation!");
}