/*
 * ESP32 Basic Test - Verify ESP32 is working
 * Upload this first to confirm ESP32 functionality
 */

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  delay(1000); // Give time for serial to initialize
  
  Serial.println();
  Serial.println("================================");
  Serial.println("🚀 ESP32 Basic Test Started!");
  Serial.println("================================");
  Serial.println("If you see this, the ESP32 is working!");
  Serial.println("Board: ESP32");
  Serial.println("CPU Frequency: " + String(getCpuFrequencyMhz()) + " MHz");
  Serial.println("Free Heap: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("Chip Model: " + String(ESP.getChipModel()));
  Serial.println("Chip Revision: " + String(ESP.getChipRevision()));
  Serial.println("================================");
  
  // Test built-in LED
  pinMode(2, OUTPUT);
  Serial.println("Testing built-in LED on GPIO 2...");
  
  for (int i = 0; i < 5; i++) {
    digitalWrite(2, HIGH);
    Serial.println("LED ON");
    delay(500);
    digitalWrite(2, LOW);
    Serial.println("LED OFF");
    delay(500);
  }
  
  Serial.println("✅ Basic test completed successfully!");
  Serial.println("Now you can upload the WiFi test code.");
}

void loop() {
  // Blink LED and print status every 2 seconds
  static unsigned long lastPrint = 0;
  static bool ledState = false;
  
  if (millis() - lastPrint > 2000) {
    lastPrint = millis();
    ledState = !ledState;
    digitalWrite(2, ledState);
    
    Serial.println("ESP32 is alive - Uptime: " + String(millis() / 1000) + " seconds");
    Serial.println("Free Heap: " + String(ESP.getFreeHeap()) + " bytes");
  }
}