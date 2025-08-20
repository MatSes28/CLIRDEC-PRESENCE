/*
 * CLIRDEC: PRESENCE - Simple ESP32 Connection Test
 * 
 * This is a simplified version to test basic WiFi and WebSocket connectivity
 * Upload this first to verify your ESP32 can connect to the server
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// Pin definitions
#define LED_PIN 2

// WiFi credentials
const char* ssid = "Kupal kaba boss?";
const char* password = "MatMir@12030908";

// Server configuration
const char* websocket_server = "074a6fe2-37da-4c7c-8871-ee86e87c61f9-00-3sseewv3uked8.sisko.replit.dev";
const int websocket_port = 443;
const char* websocket_path = "/iot";

WebSocketsClient webSocket;
String deviceId = "ESP32_TEST_" + String(ESP.getEfuseMac(), HEX);
bool isConnected = false;

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("======================================");
  Serial.println("🚀 CLIRDEC ESP32 Simple Connection Test");
  Serial.println("======================================");
  
  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Connect to WiFi
  connectToWiFi();
  
  if (WiFi.status() == WL_CONNECTED) {
    // Setup WebSocket
    setupWebSocket();
  } else {
    Serial.println("❌ Cannot proceed without WiFi connection");
    blinkError();
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    webSocket.loop();
    
    // Send test message every 10 seconds if connected
    static unsigned long lastTest = 0;
    if (isConnected && millis() - lastTest > 10000) {
      sendTestMessage();
      lastTest = millis();
    }
  } else {
    Serial.println("⚠️ WiFi disconnected, attempting reconnection...");
    connectToWiFi();
    delay(5000);
  }
  
  delay(100);
}

void connectToWiFi() {
  Serial.print("🌐 Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("✅ WiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    digitalWrite(LED_PIN, LOW);
    Serial.println("❌ WiFi connection failed!");
    Serial.println("Please check:");
    Serial.println("1. WiFi network name and password");
    Serial.println("2. Network signal strength");
    Serial.println("3. ESP32 is within range");
  }
}

void setupWebSocket() {
  Serial.println("🔗 Setting up WebSocket connection...");
  Serial.print("Server: ");
  Serial.println(websocket_server);
  Serial.print("Port: ");
  Serial.println(websocket_port);
  Serial.print("Path: ");
  Serial.println(websocket_path);
  
  webSocket.beginSSL(websocket_server, websocket_port, websocket_path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  
  Serial.println("WebSocket client initialized");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("⚠️ WebSocket Disconnected");
      isConnected = false;
      digitalWrite(LED_PIN, LOW);
      break;
      
    case WStype_CONNECTED:
      Serial.printf("✅ WebSocket Connected to: %s\n", payload);
      isConnected = true;
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
      
    case WStype_PONG:
      Serial.println("🏓 Received PONG");
      break;
      
    default:
      Serial.printf("ℹ️ WebSocket Event Type: %d\n", type);
      break;
  }
}

void registerDevice() {
  Serial.println("📱 Registering device...");
  
  DynamicJsonDocument doc(1024);
  doc["type"] = "device_register";
  doc["deviceId"] = deviceId;
  doc["deviceType"] = "esp32_test";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["macAddress"] = WiFi.macAddress();
  doc["capabilities"] = JsonArray();
  doc["capabilities"].add("test_connection");
  doc["timestamp"] = millis();
  
  String message;
  serializeJson(doc, message);
  
  Serial.println("Sending registration:");
  Serial.println(message);
  
  webSocket.sendTXT(message);
}

void sendTestMessage() {
  Serial.println("📤 Sending test message...");
  
  DynamicJsonDocument doc(256);
  doc["type"] = "test_message";
  doc["deviceId"] = deviceId;
  doc["timestamp"] = millis();
  doc["message"] = "Hello from ESP32!";
  doc["uptime"] = millis() / 1000;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["wifiRSSI"] = WiFi.RSSI();
  
  String message;
  serializeJson(doc, message);
  webSocket.sendTXT(message);
  
  Serial.println("Test message sent");
}

void handleServerMessage(const char* message) {
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.print("❌ JSON parsing failed: ");
    Serial.println(error.c_str());
    return;
  }
  
  String type = doc["type"];
  Serial.println("📨 Message type: " + type);
  
  if (type == "welcome") {
    Serial.println("✅ Welcome message received!");
    Serial.println("Message: " + String((const char*)doc["message"]));
    blinkSuccess();
  }
  else if (type == "registration_success") {
    Serial.println("✅ Device registered successfully!");
    if (doc.containsKey("classroomName")) {
      Serial.println("Assigned to classroom: " + String((const char*)doc["classroomName"]));
    }
    blinkSuccess();
  }
  else if (type == "registration_error") {
    Serial.println("❌ Registration failed:");
    Serial.println("Error: " + String((const char*)doc["message"]));
    blinkError();
  }
  else if (type == "error") {
    Serial.println("❌ Server error:");
    Serial.println("Error: " + String((const char*)doc["message"]));
  }
  else {
    Serial.println("ℹ️ Unknown message type: " + type);
  }
}

void blinkSuccess() {
  // Success pattern: 3 quick blinks
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, LOW);
    delay(100);
    digitalWrite(LED_PIN, HIGH);
    delay(100);
  }
}

void blinkError() {
  // Error pattern: 5 fast blinks
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    delay(200);
  }
  digitalWrite(LED_PIN, LOW);
}