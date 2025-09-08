/**
 * ESP32 S3 + HC-SR04 Ultrasonic Sensor Test Program
 * 
 * This simple test helps diagnose HC-SR04 connection issues
 * Use this to verify your wiring before using the full CLIRDEC firmware
 * 
 * Wiring for ESP32-S3:
 * HC-SR04 VCC  -> 5V
 * HC-SR04 GND  -> GND
 * HC-SR04 Trig -> GPIO 21
 * HC-SR04 Echo -> GPIO 20
 */

// Pin definitions for ESP32-S3
#define TRIG_PIN 21       // HC-SR04 Trigger pin
#define ECHO_PIN 20       // HC-SR04 Echo pin
#define LED_PIN 2         // Built-in LED

void setup() {
  Serial.begin(115200);
  Serial.println("🧪 ESP32 S3 + HC-SR04 Connection Test");
  Serial.println("=====================================");
  
  // Initialize pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Test pin setup
  digitalWrite(TRIG_PIN, LOW);
  digitalWrite(LED_PIN, HIGH);
  
  Serial.println("✅ Pin setup complete");
  Serial.println("📏 Starting distance measurements...");
  Serial.println("Expected range: 2cm to 400cm");
  Serial.println("");
}

void loop() {
  float distance = measureDistance();
  
  if (distance > 0) {
    // Valid measurement
    Serial.print("📐 Distance: ");
    Serial.print(distance, 1);
    Serial.println(" cm");
    
    // Visual feedback - LED blinks normally
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(900);
    
    // Show presence detection
    if (distance <= 50.0) {
      Serial.println("👤 PRESENCE DETECTED (≤50cm)");
    }
  } else {
    // Timeout or error
    Serial.println("❌ TIMEOUT: No echo received");
    Serial.println("🔍 Check connections:");
    Serial.println("   - Trig pin: GPIO 21");
    Serial.println("   - Echo pin: GPIO 20");
    Serial.println("   - VCC: 5V (not 3.3V)");
    Serial.println("   - GND: Connected");
    
    // Error pattern - fast blinking
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(100);
      digitalWrite(LED_PIN, LOW);
      delay(100);
    }
    delay(1000);
  }
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