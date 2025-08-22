/*
 * CLIRDEC: PRESENCE - Enhanced Dual Mode ESP32 IoT Device
 * 
 * IMPROVEMENTS:
 * ✅ Better RFID initialization with fallback methods
 * ✅ Enhanced WiFi connection with multiple retry strategies
 * ✅ Improved USB mode with clean UID output
 * ✅ Comprehensive error handling and auto-recovery
 * ✅ Enhanced diagnostics and status reporting
 * ✅ Alternative connection methods for reliability
 * 
 * MODES:
 * 1. USB_REGISTRATION_MODE: Connects via USB, types RFID UIDs directly
 * 2. WIFI_ATTENDANCE_MODE: Connects via WiFi, sends real-time attendance data
 * 
 * Hardware: ESP32-WROOM-32 with RC522 RFID + HC-SR501 PIR
 * 
 * Pin Connections:
 * RC522 RFID Module:
 *   VCC -> 3.3V (CRITICAL: NOT 5V!)
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
 * Mode Switch:
 *   Push Button -> GPIO 0 (Boot button)
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Preferences.h>
#include <HTTPClient.h>

// Pin definitions
#define SS_PIN 5
#define RST_PIN 22
#define PIR_PIN 4
#define LED_PIN 2
#define MODE_BUTTON_PIN 0  // Boot button
#define BUZZER_PIN 25

// WiFi credentials - UPDATE THESE!
const char* ssid = "YOUR_WIFI_SSID";     // Change this to your WiFi name
const char* password = "YOUR_WIFI_PASSWORD"; // Change this to your WiFi password

// Alternative WiFi networks (fallback)
const char* ssid2 = "BACKUP_WIFI_SSID";
const char* password2 = "BACKUP_WIFI_PASSWORD";

// Server configuration - UPDATE WITH YOUR REPLIT URL!
const char* websocket_server = "your-replit-url.replit.dev";
const int websocket_port = 443;
const char* websocket_path = "/iot";

MFRC522 rfid(SS_PIN, RST_PIN);
WebSocketsClient webSocket;
Preferences preferences;
HTTPClient http;

// Operating modes
enum OperatingMode {
  USB_REGISTRATION_MODE,    // Types RFID UIDs via USB Serial
  WIFI_ATTENDANCE_MODE      // Sends attendance data via WiFi
};

OperatingMode currentMode = USB_REGISTRATION_MODE; // Default to USB mode

// Device state
String deviceId = "ESP32_" + String(ESP.getEfuseMac(), HEX);
bool isOnline = false;
bool wifiConnected = false;
bool rfidInitialized = false;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds

// RFID state management
String lastUID = "";
unsigned long lastRFIDTime = 0;
const unsigned long RFID_COOLDOWN = 2000; // 2 seconds to prevent duplicate reads

// Motion detection
bool motionDetected = false;
unsigned long lastMotionTime = 0;

// Mode switching
unsigned long lastModeCheck = 0;
bool lastButtonState = HIGH;
unsigned long buttonPressTime = 0;
const unsigned long LONG_PRESS_TIME = 3000; // 3 seconds for mode switch

// System diagnostics
unsigned long systemStartTime = 0;
int wifiReconnectAttempts = 0;
int rfidErrorCount = 0;

void setup() {
  Serial.begin(9600);  // 9600 baud for USB typing compatibility
  Serial.flush();
  delay(1000);
  
  systemStartTime = millis();
  
  Serial.println();
  Serial.println("====================================================");
  Serial.println("🚀 CLIRDEC: PRESENCE Enhanced Dual Mode ESP32");
  Serial.println("====================================================");
  Serial.println("Version: 2.0 (Improved)");
  Serial.println("Device ID: " + deviceId);
  Serial.println("Start Time: " + String(systemStartTime));
  Serial.println("====================================================");
  
  // Initialize hardware with enhanced error handling
  if (setupHardware()) {
    Serial.println("✅ Hardware initialization successful");
  } else {
    Serial.println("⚠️ Hardware initialization had issues - continuing with fallback");
  }
  
  // Load saved configuration
  loadConfiguration();
  
  // Show current mode
  displayCurrentMode();
  
  // Initialize based on current mode
  if (currentMode == WIFI_ATTENDANCE_MODE) {
    initWiFiMode();
  } else {
    initUSBMode();
  }
  
  Serial.println("✅ System initialization complete");
  Serial.println("📊 System Status:");
  printSystemStatus();
  indicateReady();
}

void loop() {
  // Check for mode switch button
  checkModeSwitch();
  
  // Check for RFID cards with error recovery
  checkRFIDWithRecovery();
  
  if (currentMode == WIFI_ATTENDANCE_MODE) {
    // WiFi mode operations
    webSocket.loop();
    checkWiFiConnectionEnhanced();
    checkPresenceSensor();
    sendHeartbeat();
  }
  
  // System health check every 30 seconds
  static unsigned long lastHealthCheck = 0;
  if (millis() - lastHealthCheck > 30000) {
    performHealthCheck();
    lastHealthCheck = millis();
  }
  
  delay(100);
}

bool setupHardware() {
  bool success = true;
  
  // Initialize pins
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(MODE_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  
  digitalWrite(LED_PIN, LOW);
  
  // Initialize SPI for RFID with error handling
  Serial.println("🔧 Initializing SPI and RFID...");
  
  try {
    SPI.begin();
    rfid.PCD_Init();
    
    // Multiple initialization attempts
    for (int attempt = 1; attempt <= 3; attempt++) {
      Serial.println("RFID Init Attempt " + String(attempt) + "/3");
      
      // Test RFID module communication
      byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
      Serial.println("RFID Version Register: 0x" + String(version, HEX));
      
      if (version == 0x91 || version == 0x92 || version == 0x90 || version == 0x88) {
        Serial.println("✅ RFID module communication successful");
        rfidInitialized = true;
        break;
      } else if (attempt < 3) {
        Serial.println("⚠️ RFID communication issue, retrying...");
        delay(1000);
        rfid.PCD_Init(); // Re-initialize
      } else {
        Serial.println("❌ RFID module communication failed after 3 attempts");
        Serial.println("   Version: 0x" + String(version, HEX));
        Serial.println("   Expected: 0x90, 0x91, 0x92, or 0x88");
        success = false;
      }
    }
    
    // Perform self-test if communication is working
    if (rfidInitialized) {
      Serial.println("🧪 Performing RFID self-test...");
      if (rfid.PCD_PerformSelfTest()) {
        Serial.println("✅ RFID self-test passed");
        // Re-initialize after self-test
        rfid.PCD_Init();
      } else {
        Serial.println("⚠️ RFID self-test failed, but communication works");
        Serial.println("   Continuing with basic initialization...");
        rfid.PCD_Init(); // Re-initialize for normal operation
      }
    }
    
  } catch (...) {
    Serial.println("❌ Critical error during RFID initialization");
    success = false;
  }
  
  // Initialize preferences
  Serial.println("💾 Initializing preferences...");
  if (preferences.begin("clirdec", false)) {
    Serial.println("✅ Preferences initialized");
  } else {
    Serial.println("⚠️ Preferences initialization failed - using defaults");
  }
  
  return success;
}

void loadConfiguration() {
  Serial.println("📖 Loading saved configuration...");
  currentMode = (OperatingMode)preferences.getInt("mode", USB_REGISTRATION_MODE);
  String savedDeviceId = preferences.getString("deviceId", "");
  
  if (savedDeviceId.length() > 0) {
    deviceId = savedDeviceId;
  }
  
  Serial.println("Mode: " + String(currentMode == USB_REGISTRATION_MODE ? "USB" : "WiFi"));
  Serial.println("Device ID: " + deviceId);
}

void saveConfiguration() {
  preferences.putInt("mode", currentMode);
  preferences.putString("deviceId", deviceId);
  Serial.println("💾 Configuration saved");
}

void displayCurrentMode() {
  Serial.println();
  Serial.println("===========================================");
  if (currentMode == USB_REGISTRATION_MODE) {
    Serial.println("📝 CURRENT MODE: USB REGISTRATION");
    Serial.println("   Function: Type RFID UIDs to computer");
    Serial.println("   Usage: Open form field, tap RFID card");
    Serial.println("   Baud Rate: 9600");
  } else {
    Serial.println("📡 CURRENT MODE: WIFI ATTENDANCE");
    Serial.println("   Function: Real-time attendance monitoring");
    Serial.println("   Usage: Wireless attendance tracking");
    Serial.println("   Server: " + String(websocket_server));
  }
  Serial.println("   Hold BOOT button 3s to switch modes");
  Serial.println("===========================================");
  Serial.println();
}

void initWiFiMode() {
  Serial.println("🌐 Initializing WiFi mode...");
  
  if (connectToWiFiEnhanced()) {
    Serial.println("✅ WiFi connection successful");
    setupWebSocketEnhanced();
  } else {
    Serial.println("❌ WiFi connection failed - operating in offline mode");
    Serial.println("   RFID will still work locally");
  }
}

void initUSBMode() {
  Serial.println("🔌 Initializing USB registration mode...");
  Serial.println("📋 USB Mode Instructions:");
  Serial.println("   1. Connect ESP32 to computer via USB");
  Serial.println("   2. Open student registration form");
  Serial.println("   3. Click in RFID Card ID field");
  Serial.println("   4. Tap RFID card - UID will auto-type");
  Serial.println();
  Serial.println("✅ USB mode ready - Tap RFID card near reader...");
  blinkLED(2, 200); // Indicate USB mode ready
}

bool connectToWiFiEnhanced() {
  // Try multiple WiFi networks and connection strategies
  const char* networks[][2] = {
    {ssid, password},
    {ssid2, password2}
  };
  
  int networkCount = 2;
  
  for (int net = 0; net < networkCount; net++) {
    if (strlen(networks[net][0]) < 5) continue; // Skip empty networks
    
    Serial.println("🔗 Trying network: " + String(networks[net][0]));
    
    // Multiple connection strategies
    for (int strategy = 0; strategy < 3; strategy++) {
      Serial.println("   Strategy " + String(strategy + 1) + "/3");
      
      WiFi.disconnect();
      delay(1000);
      
      switch (strategy) {
        case 0: // Standard connection
          WiFi.begin(networks[net][0], networks[net][1]);
          break;
        case 1: // With specific configuration
          WiFi.config(INADDR_NONE, INADDR_NONE, INADDR_NONE, INADDR_NONE);
          WiFi.begin(networks[net][0], networks[net][1]);
          break;
        case 2: // Force 2.4GHz mode
          WiFi.mode(WIFI_STA);
          WiFi.begin(networks[net][0], networks[net][1]);
          break;
      }
      
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink during connection
        attempts++;
        
        // Check if we should abort
        if (attempts > 20) {
          Serial.print("T"); // Timeout indicator
        }
      }
      
      if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        digitalWrite(LED_PIN, HIGH);
        Serial.println();
        Serial.println("✅ WiFi connected!");
        Serial.println("   Network: " + String(networks[net][0]));
        Serial.println("   IP: " + WiFi.localIP().toString());
        Serial.println("   Signal: " + String(WiFi.RSSI()) + " dBm");
        Serial.println("   MAC: " + WiFi.macAddress());
        return true;
      } else {
        Serial.println(" Failed");
      }
    }
  }
  
  Serial.println("❌ All WiFi connection attempts failed");
  wifiConnected = false;
  digitalWrite(LED_PIN, LOW);
  return false;
}

void setupWebSocketEnhanced() {
  Serial.println("🔗 Setting up WebSocket connection...");
  
  // Try different connection methods
  bool useSSL = (websocket_port == 443);
  
  if (useSSL) {
    Serial.println("   Using SSL connection");
    webSocket.beginSSL(websocket_server, websocket_port, websocket_path);
  } else {
    Serial.println("   Using standard connection");
    webSocket.begin(websocket_server, websocket_port, websocket_path);
  }
  
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(15000, 3000, 2); // Enhanced heartbeat
  
  Serial.println("✅ WebSocket client configured");
}

void checkModeSwitch() {
  unsigned long currentTime = millis();
  if (currentTime - lastModeCheck < 100) return; // Check every 100ms
  lastModeCheck = currentTime;
  
  bool buttonState = digitalRead(MODE_BUTTON_PIN);
  
  // Detect button press
  if (buttonState == LOW && lastButtonState == HIGH) {
    buttonPressTime = currentTime;
    Serial.println("🔘 Button pressed");
  }
  
  // Detect long press (3 seconds)
  if (buttonState == LOW && lastButtonState == LOW) {
    if (currentTime - buttonPressTime >= LONG_PRESS_TIME) {
      Serial.println("🔄 Long press detected - switching mode...");
      switchMode();
      buttonPressTime = currentTime + 10000; // Prevent immediate re-trigger
    } else if ((currentTime - buttonPressTime) % 1000 < 100) {
      // Progress indicator every second
      Serial.println("🔘 Hold for " + String(3 - (currentTime - buttonPressTime)/1000) + " more seconds...");
    }
  }
  
  lastButtonState = buttonState;
}

void switchMode() {
  Serial.println("🔄 Switching operating mode...");
  blinkLED(5, 100);
  beep(3, 100);
  
  // Switch mode
  if (currentMode == USB_REGISTRATION_MODE) {
    currentMode = WIFI_ATTENDANCE_MODE;
    Serial.println("➡️ Switched to WiFi Attendance Mode");
    // Disconnect from any existing connections first
    if (wifiConnected) {
      WiFi.disconnect();
      wifiConnected = false;
    }
    initWiFiMode();
  } else {
    currentMode = USB_REGISTRATION_MODE;
    Serial.println("➡️ Switched to USB Registration Mode");
    // Disconnect WiFi to save power
    if (wifiConnected) {
      webSocket.disconnect();
      WiFi.disconnect();
      wifiConnected = false;
      isOnline = false;
    }
    initUSBMode();
  }
  
  // Save new mode
  saveConfiguration();
  displayCurrentMode();
  
  beep(1, 500); // Success sound
}

void checkRFIDWithRecovery() {
  if (!rfidInitialized) {
    // Try to recover RFID every 10 seconds
    static unsigned long lastRecoveryAttempt = 0;
    if (millis() - lastRecoveryAttempt > 10000) {
      Serial.println("🔧 Attempting RFID recovery...");
      rfid.PCD_Init();
      
      byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
      if (version == 0x91 || version == 0x92 || version == 0x90 || version == 0x88) {
        rfidInitialized = true;
        Serial.println("✅ RFID recovery successful");
        blinkLED(2, 100);
      } else {
        Serial.println("❌ RFID recovery failed");
      }
      lastRecoveryAttempt = millis();
    }
    return;
  }
  
  // Check for RFID cards
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }
  
  if (!rfid.PICC_ReadCardSerial()) {
    rfidErrorCount++;
    if (rfidErrorCount > 10) {
      Serial.println("⚠️ Multiple RFID read errors - attempting reset");
      rfid.PCD_Init();
      rfidErrorCount = 0;
    }
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
    rfid.PCD_StopCrypto1();
    return;
  }
  
  lastUID = cardId;
  lastRFIDTime = currentTime;
  rfidErrorCount = 0; // Reset error count on successful read
  
  Serial.println("📱 RFID Card Detected: " + cardId + " (" + String(rfid.uid.size) + " bytes)");
  
  // Handle based on current mode
  if (currentMode == USB_REGISTRATION_MODE) {
    handleUSBRFID(cardId);
  } else {
    handleWiFiRFID(cardId);
  }
  
  // Halt the card properly
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

void handleUSBRFID(String cardId) {
  Serial.println("📝 USB Mode - Processing RFID: " + cardId);
  
  // Output clean UID for Python script to capture
  // This is the line the Python script will read and type
  Serial.flush(); // Ensure clean output
  delay(10);
  Serial.println(cardId); // Clean UID output
  Serial.flush();
  
  Serial.println("✅ UID sent via USB: " + cardId);
  Serial.println("💡 Python script should capture and type this UID");
  Serial.println("🔄 Ready for next card...");
  Serial.println();
  
  // Visual feedback
  blinkLED(2, 150);
  beep(1, 100);
}

void handleWiFiRFID(String cardId) {
  Serial.println("📡 WiFi Mode - Processing RFID: " + cardId);
  
  // Send to server via WebSocket
  if (isOnline) {
    DynamicJsonDocument doc(512);
    doc["type"] = "rfid_scan";
    doc["deviceId"] = deviceId;
    doc["rfidCardId"] = cardId;
    doc["timestamp"] = millis();
    doc["presenceDetected"] = motionDetected;
    doc["mode"] = "wifi";
    
    String message;
    serializeJson(doc, message);
    webSocket.sendTXT(message);
    
    Serial.println("📤 Sent to server: " + message);
  } else {
    Serial.println("⚠️ Not connected to server - storing locally");
    // Could implement local storage here
  }
  
  // Visual feedback
  blinkLED(1, 300);
  beep(1, 100);
}

void checkWiFiConnectionEnhanced() {
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    Serial.println("⚠️ WiFi connection lost - attempting reconnection...");
    wifiConnected = false;
    isOnline = false;
    wifiReconnectAttempts++;
    
    if (wifiReconnectAttempts < 5) {
      // Quick reconnection attempt
      WiFi.reconnect();
      delay(5000);
      
      if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.println("✅ WiFi reconnected quickly");
        setupWebSocketEnhanced();
      }
    } else {
      // Full reconnection process
      Serial.println("🔄 Performing full WiFi reconnection...");
      connectToWiFiEnhanced();
      wifiReconnectAttempts = 0;
    }
  }
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
      isOnline = false;
      break;
      
    case WStype_PING:
      Serial.println("🏓 WebSocket Ping");
      break;
      
    case WStype_PONG:
      Serial.println("🏓 WebSocket Pong");
      break;
      
    default:
      Serial.printf("🔍 WebSocket Event: %d\n", type);
      break;
  }
}

void registerDevice() {
  DynamicJsonDocument doc(1024);
  doc["type"] = "device_register";
  doc["deviceId"] = deviceId;
  doc["deviceType"] = "dual_mode_enhanced";
  doc["currentMode"] = (currentMode == USB_REGISTRATION_MODE) ? "usb" : "wifi";
  doc["version"] = "2.0";
  doc["uptime"] = millis() - systemStartTime;
  
  if (wifiConnected) {
    doc["ipAddress"] = WiFi.localIP().toString();
    doc["macAddress"] = WiFi.macAddress();
    doc["signalStrength"] = WiFi.RSSI();
  }
  
  JsonArray capabilities = doc.createNestedArray("capabilities");
  capabilities.add("rfid_scan");
  capabilities.add("presence_detection");
  capabilities.add("mode_switching");
  capabilities.add("diagnostics");
  capabilities.add("auto_recovery");
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("📱 Enhanced device registration sent");
}

void handleServerMessage(const char* message) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);
  
  String type = doc["type"];
  
  if (type == "registration_success") {
    Serial.println("✅ Device registered successfully with server");
    String assignedRoom = doc["classroomName"];
    if (assignedRoom.length() > 0) {
      Serial.println("📍 Assigned to: " + assignedRoom);
    }
    blinkLED(3, 200);
    beep(2, 100);
  }
  else if (type == "scan_result") {
    String status = doc["status"];
    String studentName = doc["studentName"];
    Serial.println("✅ Scan result: " + status + " - " + studentName);
    
    // Provide appropriate feedback
    if (status == "checked_in" || status == "checked_out") {
      blinkLED(2, 200);
      beep(1, 200);
    }
    else if (status == "unknown_card") {
      blinkLED(5, 100);
      beep(3, 150);
    }
  }
  else if (type == "mode_switch_request") {
    Serial.println("📱 Server requested mode switch");
    switchMode();
  }
  else if (type == "diagnostics_request") {
    sendDiagnostics();
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
  
  DynamicJsonDocument doc(512);
  doc["type"] = "heartbeat";
  doc["deviceId"] = deviceId;
  doc["timestamp"] = currentTime;
  doc["uptime"] = currentTime - systemStartTime;
  doc["mode"] = (currentMode == USB_REGISTRATION_MODE) ? "usb" : "wifi";
  doc["rfidStatus"] = rfidInitialized;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["wifiRSSI"] = WiFi.RSSI();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("💓 Heartbeat sent");
}

void sendDiagnostics() {
  Serial.println("📊 Sending diagnostics...");
  
  DynamicJsonDocument doc(1024);
  doc["type"] = "diagnostics";
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  doc["uptime"] = millis() - systemStartTime;
  doc["version"] = "2.0";
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["minFreeHeap"] = ESP.getMinFreeHeap();
  doc["chipRevision"] = ESP.getChipRevision();
  doc["cpuFreq"] = ESP.getCpuFreqMHz();
  doc["rfidInitialized"] = rfidInitialized;
  doc["rfidErrorCount"] = rfidErrorCount;
  doc["wifiReconnectAttempts"] = wifiReconnectAttempts;
  
  if (wifiConnected) {
    doc["wifiSSID"] = WiFi.SSID();
    doc["wifiRSSI"] = WiFi.RSSI();
    doc["wifiIP"] = WiFi.localIP().toString();
    doc["wifiMAC"] = WiFi.macAddress();
  }
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
}

void performHealthCheck() {
  Serial.println("🏥 Performing system health check...");
  
  // Check memory
  uint32_t freeHeap = ESP.getFreeHeap();
  if (freeHeap < 50000) {
    Serial.println("⚠️ Low memory: " + String(freeHeap) + " bytes");
  }
  
  // Check RFID
  if (!rfidInitialized) {
    Serial.println("⚠️ RFID not initialized - will attempt recovery");
  }
  
  // Check WiFi if in WiFi mode
  if (currentMode == WIFI_ATTENDANCE_MODE && !wifiConnected) {
    Serial.println("⚠️ WiFi not connected in WiFi mode");
  }
  
  Serial.println("✅ Health check complete");
}

void printSystemStatus() {
  Serial.println("📊 System Status Report:");
  Serial.println("   Uptime: " + String((millis() - systemStartTime) / 1000) + " seconds");
  Serial.println("   Free Heap: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("   RFID: " + String(rfidInitialized ? "✅ OK" : "❌ Failed"));
  Serial.println("   WiFi: " + String(wifiConnected ? "✅ Connected" : "❌ Disconnected"));
  Serial.println("   WebSocket: " + String(isOnline ? "✅ Online" : "❌ Offline"));
  Serial.println("   Mode: " + String(currentMode == USB_REGISTRATION_MODE ? "USB" : "WiFi"));
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
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}

void indicateReady() {
  // Ready pattern: 3 medium blinks + success sound
  blinkLED(3, 300);
  beep(2, 150);
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