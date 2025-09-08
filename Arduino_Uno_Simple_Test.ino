/*
 * Arduino Uno Simple Test for CLIRDEC: PRESENCE
 * 
 * Upload this first to test your Arduino Uno board
 */

void setup() {
  Serial.begin(9600);
  delay(2000);
  
  // Initialize built-in LED (Pin 13)
  pinMode(13, OUTPUT);
  
  Serial.println("==========================================");
  Serial.println("Arduino Uno Test Started - CLIRDEC");
  Serial.println("==========================================");
  Serial.println("If you see this message, your Arduino Uno is working!");
  Serial.println("Board: Arduino Uno ATmega328P");
  Serial.println("✅ Arduino Uno Hardware Test Passed");
  Serial.println("==========================================");
  
  // Flash built-in LED to indicate success
  for (int i = 0; i < 5; i++) {
    digitalWrite(13, HIGH);
    delay(300);
    digitalWrite(13, LOW);
    delay(300);
  }
}

void loop() {
  Serial.println("Arduino Uno is alive and ready! - " + String(millis()));
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(1500);
}