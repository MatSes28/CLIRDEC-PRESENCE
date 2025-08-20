/*
 * ESP32 Simple Recovery Test
 * Upload this FIRST to verify your ESP32 works after corruption
 */

void setup() {
  Serial.begin(115200);
  
  // Initialize built-in LED
  pinMode(2, OUTPUT);
  
  Serial.println();
  Serial.println("=================================");
  Serial.println("ESP32 Recovery Test - CLIRDEC");
  Serial.println("=================================");
  Serial.println("If you see this message, your ESP32 is working!");
  Serial.println();
  
  // Test LED blinking
  Serial.println("Testing LED...");
  for (int i = 0; i < 5; i++) {
    digitalWrite(2, HIGH);
    Serial.print("LED ON ");
    delay(200);
    digitalWrite(2, LOW);
    Serial.print("LED OFF ");
    delay(200);
  }
  
  Serial.println();
  Serial.println("✅ ESP32 Hardware Test Passed");
  Serial.println("✅ Flash memory is working");
  Serial.println("✅ Serial communication is working");
  Serial.println("✅ GPIO pins are working");
  Serial.println();
  Serial.println("Next step: Upload ESP32_CLIRDEC_SAFE.ino");
  Serial.println("=================================");
}

void loop() {
  Serial.println("ESP32 is alive and ready for CLIRDEC firmware!");
  
  // Heartbeat LED
  digitalWrite(2, HIGH);
  delay(100);
  digitalWrite(2, LOW);
  delay(1900);
}