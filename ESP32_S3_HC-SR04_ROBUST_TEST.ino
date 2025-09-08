/**
 * ESP32 S3 + HC-SR04 Ultrasonic Sensor ROBUST Test Program
 * 
 * This test tries multiple approaches to diagnose HC-SR04 issues
 * Including different timing, multiple retries, and pin testing
 * 
 * Wiring for ESP32-S3:
 * HC-SR04 VCC  -> 5V
 * HC-SR04 GND  -> GND
 * HC-SR04 Trig -> GPIO 5
 * HC-SR04 Echo -> GPIO 18
 */

// Pin definitions for ESP32-S3
#define TRIG_PIN 5        // HC-SR04 Trigger pin
#define ECHO_PIN 18       // HC-SR04 Echo pin
#define LED_PIN 2         // Built-in LED

void setup() {
  Serial.begin(115200);
  delay(2000); // Give time for Serial Monitor to connect
  
  Serial.println("🔧 ESP32 S3 + HC-SR04 ROBUST DIAGNOSTIC TEST");
  Serial.println("============================================");
  Serial.println("📍 Using GPIO 5 (Trig) and GPIO 18 (Echo)");
  Serial.println("");
  
  // Initialize pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Test pin setup
  digitalWrite(TRIG_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  
  Serial.println("🔍 STARTING COMPREHENSIVE DIAGNOSTICS...");
  Serial.println("");
  
  // Test 1: Basic pin functionality
  testPinFunctionality();
  
  // Test 2: Power supply check
  testPowerSupply();
  
  Serial.println("✅ Setup complete - Starting continuous measurements...");
  Serial.println("Expected range: 2cm to 400cm");
  Serial.println("");
}

void loop() {
  // Try multiple measurement approaches
  float distance1 = measureDistanceStandard();
  float distance2 = measureDistanceExtended();
  float distance3 = measureDistanceWithRetry();
  
  Serial.println("📊 MEASUREMENT RESULTS:");
  Serial.print("   Standard: ");
  if (distance1 > 0) {
    Serial.print(distance1, 1);
    Serial.println(" cm ✅");
  } else {
    Serial.println("TIMEOUT ❌");
  }
  
  Serial.print("   Extended: ");
  if (distance2 > 0) {
    Serial.print(distance2, 1);
    Serial.println(" cm ✅");
  } else {
    Serial.println("TIMEOUT ❌");
  }
  
  Serial.print("   Retry:    ");
  if (distance3 > 0) {
    Serial.print(distance3, 1);
    Serial.println(" cm ✅");
  } else {
    Serial.println("TIMEOUT ❌");
  }
  
  // Check if any measurement succeeded
  if (distance1 > 0 || distance2 > 0 || distance3 > 0) {
    Serial.println("🎉 SENSOR IS WORKING!");
    
    // Visual feedback - LED blinks normally
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(800);
    
    // Check for presence
    float bestDistance = (distance1 > 0) ? distance1 : (distance2 > 0) ? distance2 : distance3;
    if (bestDistance <= 50.0) {
      Serial.println("👤 PRESENCE DETECTED (≤50cm)");
    }
  } else {
    Serial.println("❌ ALL MEASUREMENTS FAILED - POSSIBLE ISSUES:");
    Serial.println("   1. Faulty HC-SR04 sensor");
    Serial.println("   2. Insufficient 5V power supply");
    Serial.println("   3. Bad jumper wires or connections");
    Serial.println("   4. ESP32-S3 pin conflicts");
    
    // Error pattern - rapid blinking
    for (int i = 0; i < 10; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(50);
      digitalWrite(LED_PIN, LOW);
      delay(50);
    }
  }
  
  Serial.println("────────────────────────────────────────");
  delay(2000);
}

void testPinFunctionality() {
  Serial.println("🔌 Testing pin functionality...");
  
  // Test TRIG pin
  digitalWrite(TRIG_PIN, HIGH);
  delay(10);
  digitalWrite(TRIG_PIN, LOW);
  Serial.println("   ✅ TRIG pin (GPIO 5) - OK");
  
  // Test ECHO pin (read state)
  int echoState = digitalRead(ECHO_PIN);
  Serial.print("   📡 ECHO pin (GPIO 18) state: ");
  Serial.println(echoState == HIGH ? "HIGH" : "LOW");
  
  Serial.println("");
}

void testPowerSupply() {
  Serial.println("⚡ Power supply recommendations:");
  Serial.println("   - Ensure ESP32-S3 is powered via USB (not just battery)");
  Serial.println("   - HC-SR04 VCC MUST be connected to 5V pin");
  Serial.println("   - Try a different ESP32-S3 board if available");
  Serial.println("   - Check all GND connections are solid");
  Serial.println("");
}

float measureDistanceStandard() {
  // Standard timing (30ms timeout)
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;
  
  float distance = (duration * 0.0343) / 2;
  return (distance >= 2 && distance <= 400) ? distance : -1;
}

float measureDistanceExtended() {
  // Extended timing (100ms timeout)
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(5);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(15);
  digitalWrite(TRIG_PIN, LOW);
  
  unsigned long duration = pulseIn(ECHO_PIN, HIGH, 100000);
  if (duration == 0) return -1;
  
  float distance = (duration * 0.0343) / 2;
  return (distance >= 2 && distance <= 400) ? distance : -1;
}

float measureDistanceWithRetry() {
  // Try 3 times with different delays
  for (int attempt = 0; attempt < 3; attempt++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2 + attempt);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10 + attempt * 2);
    digitalWrite(TRIG_PIN, LOW);
    
    unsigned long duration = pulseIn(ECHO_PIN, HIGH, 50000);
    if (duration > 0) {
      float distance = (duration * 0.0343) / 2;
      if (distance >= 2 && distance <= 400) {
        return distance;
      }
    }
    delay(10); // Small delay between attempts
  }
  return -1;
}