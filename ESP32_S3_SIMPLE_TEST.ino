/*
 * ESP32-S3 Simple Test for CLIRDEC: PRESENCE
 * 
 * This is a basic test to verify your ESP32-S3 is working correctly
 * Upload this first before the main firmware
 */

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  // Initialize built-in LED
  pinMode(2, OUTPUT);
  
  Serial.println("=======================================");
  Serial.println("ESP32-S3 Test Started - CLIRDEC");
  Serial.println("=======================================");
  Serial.println("If you see this message, your ESP32-S3 is working!");
  Serial.println("Board: ESP32-S3 Development Board");
  Serial.println("✅ ESP32-S3 Hardware Test Passed");
  Serial.println("=======================================");
  
  // Flash LED to indicate success
  for (int i = 0; i < 5; i++) {
    digitalWrite(2, HIGH);
    delay(200);
    digitalWrite(2, LOW);
    delay(200);
  }
}

void loop() {
  Serial.println("ESP32-S3 is alive and ready! - " + String(millis()));
  digitalWrite(2, HIGH);
  delay(500);
  digitalWrite(2, LOW);
  delay(1500);
}