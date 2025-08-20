/*
 * ESP32 Simple Recovery Test
 * Upload this first to verify ESP32 is working after flash recovery
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
  
  // Blink LED to show it's alive
  for (int i = 0; i < 5; i++) {
    digitalWrite(2, HIGH);
    delay(200);
    digitalWrite(2, LOW);
    delay(200);
  }
  
  Serial.println("✅ ESP32 Hardware Test Passed");
  Serial.println("Next: Upload ESP32_CLIRDEC_COMPLETE.ino");
}

void loop() {
  Serial.println("ESP32 is alive and ready!");
  
  // Blink LED every 2 seconds
  digitalWrite(2, HIGH);
  delay(100);
  digitalWrite(2, LOW);
  delay(1900);
}