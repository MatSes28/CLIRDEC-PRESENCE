/*
 * CLIRDEC: PRESENCE - Dual Mode ESP32 S3 IoT Device
 * 
 * MODES:
 * 1. USB_REGISTRATION_MODE: Connects via USB, types RFID UIDs directly into web forms
 * 2. WIFI_ATTENDANCE_MODE: Connects via WiFi, sends real-time attendance data to server
 * 
 * Hardware: ESP32 S3 with RC522 RFID + 2x HC-SR04 Ultrasonic Sensors + I2C LCD Display
 * 
 * Pin Connections (ESP32 S3 Compatible):
 * RC522 RFID Module:
 *   VCC -> 3.3V
 *   RST -> GPIO 22
 *   GND -> GND
 *   MISO -> GPIO 19
 *   MOSI -> GPIO 11 (FIXED for ESP32 S3!)
 *   SCK -> GPIO 18
 *   SS -> GPIO 5
 * 
 * HC-SR04 Ultrasonic Sensor #1 (Entry):
 *   VCC -> 5V
 *   GND -> GND
 *   TRIG -> GPIO 4
 *   ECHO -> GPIO 16
 * 
 * HC-SR04 Ultrasonic Sensor #2 (Exit):
 *   VCC -> 5V
 *   GND -> GND
 *   TRIG -> GPIO 17
 *   ECHO -> GPIO 21
 * 
 * I2C LCD Display (16x2):
 *   VCC -> 5V
 *   GND -> GND
 *   SDA -> GPIO 8
 *   SCL -> GPIO 9
 * 
 * Other:
 *   LED -> GPIO 2 (Built-in)
 *   Buzzer -> GPIO 25
 *   Mode Button -> GPIO 0 (Boot button)
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Preferences.h>
#include <LiquidCrystal_I2C.h>
#include <Wire.h>

// Pin definitions (ESP32 S3 Compatible)
#define SS_PIN 5
#define RST_PIN 22
#define LED_PIN 2
#define MODE_BUTTON_PIN 0  // Boot button
#define BUZZER_PIN 25

// I2C LCD pins (ESP32 S3)
#define LCD_SDA 8
#define LCD_SCL 9

// HC-SR04 Ultrasonic Sensor #1 (Entry)
#define TRIG_PIN_1 4
#define ECHO_PIN_1 16

// HC-SR04 Ultrasonic Sensor #2 (Exit)
#define TRIG_PIN_2 17
#define ECHO_PIN_2 21

// WiFi credentials (update these)
const char* ssid = "Kupal kaba boss?";
const char* password = "MatMir@12030908";

// Server configuration (update with your Replit URL)
const char* websocket_server = "your-replit-url.replit.dev";
const int websocket_port = 443;
const char* websocket_path = "/iot";

// Initialize LCD (16x2 display, I2C address usually 0x27 or 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);

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
String deviceId = "ESP32_" + String((uint32_t)ESP.getEfuseMac(), HEX);
bool isOnline = false;
bool wifiConnected = false;
unsigned long lastHeartbeat = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000; // 30 seconds

// RFID state management
String lastUID = "";
unsigned long lastRFIDTime = 0;
const unsigned long RFID_COOLDOWN = 2000; // 2 seconds to prevent duplicate reads

// Ultrasonic sensor detection
const float DETECTION_DISTANCE = 50.0; // Detect objects within 50cm
bool entrySensorDetected = false;
bool exitSensorDetected = false;
unsigned long lastEntrySensorTime = 0;
unsigned long lastExitSensorTime = 0;
const unsigned long SENSOR_TIMEOUT = 3000; // 3 seconds
float entryDistance = 999.9;
float exitDistance = 999.9;

// Mode switching
unsigned long lastModeCheck = 0;
bool lastButtonState = HIGH;
unsigned long buttonPressTime = 0;
const unsigned long LONG_PRESS_TIME = 3000; // 3 seconds for mode switch

void setup() {
  Serial.begin(9600);  // 9600 baud for USB typing compatibility
  Serial.println("🚀 CLIRDEC: PRESENCE Dual Mode ESP32 S3 Starting...");
  
  // Initialize I2C for LCD with ESP32 S3 pins
  Wire.begin(LCD_SDA, LCD_SCL);
  
  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CLIRDEC PRESENCE");
  lcd.setCursor(0, 1);
  lcd.print("Initializing...");
  
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
    checkUltrasonicSensors();
    sendHeartbeat();
  }
  
  delay(100);
}

void setupHardware() {
  // Initialize SPI for RFID (ESP32 S3 uses GPIO 11 for MOSI)
  SPI.begin(18, 19, 11, 5);  // SCK, MISO, MOSI, SS
  rfid.PCD_Init();
  
  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(MODE_BUTTON_PIN, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Initialize ultrasonic sensor pins
  pinMode(TRIG_PIN_1, OUTPUT);
  pinMode(ECHO_PIN_1, INPUT);
  pinMode(TRIG_PIN_2, OUTPUT);
  pinMode(ECHO_PIN_2, INPUT);
  
  // Set trigger pins low initially
  digitalWrite(TRIG_PIN_1, LOW);
  digitalWrite(TRIG_PIN_2, LOW);
  
  // Test RFID module
  Serial.println("Testing RFID module...");
  lcd.setCursor(0, 1);
  lcd.print("Testing RFID... ");
  
  if (!rfid.PCD_PerformSelfTest()) {
    Serial.println("❌ RFID module test failed!");
    lcd.setCursor(0, 1);
    lcd.print("RFID Failed!    ");
    blinkError();
  } else {
    Serial.println("✅ RFID module initialized");
    lcd.setCursor(0, 1);
    lcd.print("RFID OK!        ");
  }
  
  delay(1000);
  
  // Re-initialize RFID for normal operation
  rfid.PCD_Init();
  
  // Test ultrasonic sensors
  Serial.println("Testing ultrasonic sensors...");
  lcd.setCursor(0, 1);
  lcd.print("Testing Sensors ");
  testUltrasonicSensors();
  
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
  lcd.clear();
  
  if (currentMode == USB_REGISTRATION_MODE) {
    Serial.println("📝 MODE: USB REGISTRATION");
    Serial.println("Function: Type RFID UIDs to computer");
    Serial.println("Usage: Open form field, tap RFID card");
    
    lcd.setCursor(0, 0);
    lcd.print("MODE: USB REG   ");
    lcd.setCursor(0, 1);
    lcd.print("Tap card to type");
  } else {
    Serial.println("📡 MODE: WIFI ATTENDANCE");
    Serial.println("Function: Real-time attendance monitoring");
    Serial.println("Usage: Wireless attendance tracking");
    
    lcd.setCursor(0, 0);
    lcd.print("MODE: WiFi ATT  ");
    lcd.setCursor(0, 1);
    lcd.print("Connecting...   ");
  }
  Serial.println("Hold BOOT button 3s to switch modes");
  Serial.println("=================================");
}

void initWiFiMode() {
  Serial.println("Initializing WiFi mode...");
  lcd.setCursor(0, 1);
  lcd.print("WiFi Connecting ");
  connectToWiFi();
  
  if (wifiConnected) {
    setupWebSocket();
  }
}

void initUSBMode() {
  Serial.println("Initializing USB registration mode...");
  Serial.println("Ready to type RFID UIDs");
  Serial.println("Tap RFID card near reader...");
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("USB Mode Ready  ");
  lcd.setCursor(0, 1);
  lcd.print("Tap RFID Card   ");
}

void connectToWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    lcd.setCursor(0, 1);
    lcd.print("WiFi...");
    lcd.print(attempts);
    lcd.print("        ");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected! ");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString().substring(0, 16));
    delay(2000);
  } else {
    wifiConnected = false;
    Serial.println("\n❌ WiFi connection failed!");
    
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!    ");
    lcd.setCursor(0, 1);
    lcd.print("Check Settings  ");
  }
}

void setupWebSocket() {
  Serial.println("Setting up WebSocket connection...");
  lcd.setCursor(0, 1);
  lcd.print("Connecting WS..."); 
  
  webSocket.beginSSL(websocket_server, websocket_port, websocket_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket Disconnected");
      isOnline = false;
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Server Offline  ");
      lcd.setCursor(0, 1);
      lcd.print("Reconnecting... ");
      break;
      
    case WStype_CONNECTED:
      Serial.println("✅ WebSocket Connected");
      isOnline = true;
      sendDeviceRegistration();
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("Server Online!  ");
      lcd.setCursor(0, 1);
      lcd.print("Ready to scan   ");
      break;
      
    case WStype_TEXT: {
      Serial.printf("📨 Message received: %s\n", payload);
      
      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, payload);
      
      if (!error) {
        String type = doc["type"] | "";
        String status = doc["status"] | "";
        String message = doc["message"] | "";
        
        if (type == "registration_ack") {
          Serial.println("✅ Device registered with server");
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print("Device Ready!   ");
          lcd.setCursor(0, 1);
          lcd.print("Tap RFID Card   ");
        }
        else if (type == "attendance_response") {
          handleAttendanceResponse(status, message);
        }
      }
      break;
    }
  }
}

void handleAttendanceResponse(String status, String message) {
  Serial.print("Attendance Status: ");
  Serial.println(status);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  
  if (status == "checked_in") {
    Serial.println("✅ Student checked in!");
    lcd.print("CHECK IN OK!    ");
    lcd.setCursor(0, 1);
    lcd.print(message.substring(0, 16));
    blinkLED(2, 200);
    beep(1, 100);
  }
  else if (status == "checked_out") {
    Serial.println("✅ Student checked out!");
    lcd.print("CHECK OUT OK!   ");
    lcd.setCursor(0, 1);
    lcd.print(message.substring(0, 16));
    blinkLED(2, 200);
    beep(1, 100);
  }
  else if (status == "unknown_card") {
    Serial.println("❌ Unknown RFID card!");
    lcd.print("UNKNOWN CARD!   ");
    lcd.setCursor(0, 1);
    lcd.print("Not registered  ");
    blinkLED(5, 100);
    beep(3, 200);
  }
  else if (status == "error") {
    Serial.println("❌ Server error!");
    lcd.print("ERROR!          ");
    lcd.setCursor(0, 1);
    lcd.print(message.substring(0, 16));
    beep(2, 300);
  }
  
  delay(3000);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready to scan   ");
  lcd.setCursor(0, 1);
  lcd.print("Entry:" + String(entryDistance, 0) + " Exit:" + String(exitDistance, 0));
}

void sendDeviceRegistration() {
  StaticJsonDocument<256> doc;
  doc["type"] = "register";
  doc["deviceId"] = deviceId;
  doc["deviceType"] = "combined";
  doc["classroom"] = "Lab 1";
  
  String jsonString;
  serializeJson(doc, jsonString);
  webSocket.sendTXT(jsonString);
  Serial.println("📤 Device registration sent");
}

void checkRFID() {
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;
  
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  
  unsigned long currentTime = millis();
  if (uid == lastUID && (currentTime - lastRFIDTime) < RFID_COOLDOWN) {
    rfid.PICC_HaltA();
    return;
  }
  
  lastUID = uid;
  lastRFIDTime = currentTime;
  
  Serial.print("🔖 RFID Card detected: ");
  Serial.println(uid);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Card Detected!  ");
  lcd.setCursor(0, 1);
  lcd.print(uid.substring(0, 16));
  beep(1, 100);
  
  if (currentMode == USB_REGISTRATION_MODE) {
    typeUID(uid);
  } else if (currentMode == WIFI_ATTENDANCE_MODE) {
    sendAttendanceData(uid);
  }
  
  rfid.PICC_HaltA();
}

void typeUID(String uid) {
  Serial.println("⌨️ Typing UID via USB...");
  Serial.println(uid);
  delay(100);
  
  lcd.setCursor(0, 1);
  lcd.print("Typing UID...   ");
  beep(2, 100);
  delay(1000);
  
  lcd.setCursor(0, 1);
  lcd.print("Tap next card   ");
}

void sendAttendanceData(String uid) {
  if (!isOnline) {
    Serial.println("⚠️ Offline - cannot send attendance");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Offline!        ");
    lcd.setCursor(0, 1);
    lcd.print("Check WiFi      ");
    beep(3, 200);
    return;
  }
  
  StaticJsonDocument<512> doc;
  doc["type"] = "rfid_tap";
  doc["deviceId"] = deviceId;
  doc["rfidUid"] = uid;
  doc["entrySensor"] = entrySensorDetected;
  doc["exitSensor"] = exitSensorDetected;
  doc["entryDistance"] = entryDistance;
  doc["exitDistance"] = exitDistance;
  doc["timestamp"] = millis();
  
  String jsonString;
  serializeJson(doc, jsonString);
  webSocket.sendTXT(jsonString);
  
  Serial.println("📤 Attendance data sent");
  lcd.setCursor(0, 1);
  lcd.print("Sending...      ");
}

void checkUltrasonicSensors() {
  entryDistance = measureDistance(TRIG_PIN_1, ECHO_PIN_1);
  exitDistance = measureDistance(TRIG_PIN_2, ECHO_PIN_2);
  
  unsigned long currentTime = millis();
  
  if (entryDistance < DETECTION_DISTANCE) {
    entrySensorDetected = true;
    lastEntrySensorTime = currentTime;
  } else if ((currentTime - lastEntrySensorTime) > SENSOR_TIMEOUT) {
    entrySensorDetected = false;
  }
  
  if (exitDistance < DETECTION_DISTANCE) {
    exitSensorDetected = true;
    lastExitSensorTime = currentTime;
  } else if ((currentTime - lastExitSensorTime) > SENSOR_TIMEOUT) {
    exitSensorDetected = false;
  }
  
  // Update LCD with sensor status
  static unsigned long lastLCDUpdate = 0;
  if (currentTime - lastLCDUpdate > 1000) {
    lastLCDUpdate = currentTime;
    if (!rfid.PICC_IsNewCardPresent()) {
      lcd.setCursor(0, 1);
      lcd.print("E:" + String(entryDistance, 0) + "cm X:" + String(exitDistance, 0) + "cm    ");
    }
  }
}

float measureDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long duration = pulseIn(echoPin, HIGH, 30000);
  if (duration == 0) return 999.9;
  
  float distance = duration * 0.034 / 2;
  return distance;
}

void testUltrasonicSensors() {
  float dist1 = measureDistance(TRIG_PIN_1, ECHO_PIN_1);
  float dist2 = measureDistance(TRIG_PIN_2, ECHO_PIN_2);
  
  Serial.print("Entry Sensor: ");
  Serial.print(dist1);
  Serial.println(" cm");
  
  Serial.print("Exit Sensor: ");
  Serial.print(dist2);
  Serial.println(" cm");
  
  lcd.setCursor(0, 1);
  lcd.print("E:" + String(dist1, 0) + " X:" + String(dist2, 0) + "     ");
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    Serial.println("⚠️ WiFi connection lost! Reconnecting...");
    wifiConnected = false;
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Lost!      ");
    lcd.setCursor(0, 1);
    lcd.print("Reconnecting... ");
    connectToWiFi();
  }
}

void sendHeartbeat() {
  unsigned long currentTime = millis();
  if (isOnline && (currentTime - lastHeartbeat) > HEARTBEAT_INTERVAL) {
    lastHeartbeat = currentTime;
    
    StaticJsonDocument<256> doc;
    doc["type"] = "heartbeat";
    doc["deviceId"] = deviceId;
    doc["uptime"] = currentTime;
    
    String jsonString;
    serializeJson(doc, jsonString);
    webSocket.sendTXT(jsonString);
  }
}

void checkModeSwitch() {
  bool buttonState = digitalRead(MODE_BUTTON_PIN);
  unsigned long currentTime = millis();
  
  if (buttonState == LOW && lastButtonState == HIGH) {
    buttonPressTime = currentTime;
  }
  
  if (buttonState == LOW && (currentTime - buttonPressTime) >= LONG_PRESS_TIME) {
    switchMode();
    while(digitalRead(MODE_BUTTON_PIN) == LOW) {
      delay(10);
    }
  }
  
  lastButtonState = buttonState;
}

void switchMode() {
  Serial.println("🔄 Switching mode...");
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Switching Mode..");
  beep(2, 150);
  
  if (currentMode == USB_REGISTRATION_MODE) {
    currentMode = WIFI_ATTENDANCE_MODE;
    saveConfiguration();
    ESP.restart();
  } else {
    currentMode = USB_REGISTRATION_MODE;
    saveConfiguration();
    ESP.restart();
  }
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    if (i < times - 1) delay(delayMs);
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

void blinkError() {
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_PIN, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

void indicateReady() {
  blinkLED(3, 200);
  beep(2, 150);
}
