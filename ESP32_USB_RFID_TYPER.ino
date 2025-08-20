/*
 * ESP32 USB RFID Typer for CLIRDEC Student Registration
 * 
 * Simple RFID reader that types card UIDs directly into web forms
 * No WiFi needed - just USB connection
 * 
 * Hardware: ESP32-WROOM-32 with RC522 RFID Module
 * 
 * Pin Connections:
 * RC522 RFID Module:
 *   VCC -> 3.3V (IMPORTANT: NOT 5V!)
 *   RST -> GPIO 22
 *   GND -> GND
 *   MISO -> GPIO 19
 *   MOSI -> GPIO 23
 *   SCK -> GPIO 18
 *   SDA -> GPIO 5
 * 
 * Status LED: GPIO 2 (Built-in)
 * 
 * Usage:
 * 1. Connect ESP32 to computer via USB
 * 2. Open student add/edit form in browser
 * 3. Click in RFID Card ID field
 * 4. Tap RFID card on reader
 * 5. UID will be automatically typed into the field
 */

#include <SPI.h>
#include <MFRC522.h>

// Pin definitions
#define SS_PIN 5
#define RST_PIN 22
#define LED_PIN 2

// RFID module
MFRC522 rfid(SS_PIN, RST_PIN);

// RFID state
String lastUID = "";
unsigned long lastRFIDTime = 0;
const unsigned long RFID_COOLDOWN = 2000; // 2 seconds between reads

void setup() {
  Serial.begin(9600); // 9600 baud for reliable USB typing
  
  // Initialize LED
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  Serial.println();
  Serial.println("========================================");
  Serial.println("CLIRDEC USB RFID Typer Ready");
  Serial.println("========================================");
  Serial.println("Instructions:");
  Serial.println("1. Open student form in browser");
  Serial.println("2. Click in RFID Card ID field");
  Serial.println("3. Tap RFID card on reader");
  Serial.println("4. UID will be typed automatically");
  Serial.println("========================================");
  
  // Initialize SPI and RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Test RFID module
  if (rfid.PCD_PerformSelfTest()) {
    Serial.println("✅ RFID Reader Test: PASSED");
    blinkSuccess();
  } else {
    Serial.println("❌ RFID Reader Test: FAILED");
    Serial.println("Check wiring connections:");
    Serial.println("VCC -> 3.3V, RST -> GPIO 22, GND -> GND");
    Serial.println("MISO -> GPIO 19, MOSI -> GPIO 23");
    Serial.println("SCK -> GPIO 18, SDA -> GPIO 5");
    blinkError();
  }
  
  // Re-initialize RFID after self-test
  rfid.PCD_Init();
  
  Serial.println("🚀 Ready to read RFID cards...");
  indicateReady();
}

void loop() {
  // Check for RFID card
  if (checkRFID()) {
    // Card detected and processed
    blinkSuccess();
  }
  
  // Small delay
  delay(100);
}

bool checkRFID() {
  // Check if new card is present
  if (!rfid.PICC_IsNewCardPresent()) {
    return false;
  }
  
  // Check if card can be read
  if (!rfid.PICC_ReadCardSerial()) {
    return false;
  }
  
  // Prevent duplicate reads too quickly
  unsigned long now = millis();
  if (now - lastRFIDTime < RFID_COOLDOWN) {
    return false;
  }
  
  // Read UID
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uid += "0";
    }
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  
  // Check if it's the same card as last read
  if (uid == lastUID && (now - lastRFIDTime) < 5000) {
    return false;
  }
  
  // Update state
  lastUID = uid;
  lastRFIDTime = now;
  
  // Output the UID for typing
  Serial.println("📱 RFID Card Detected: " + uid);
  Serial.println("💾 Typing UID into form...");
  
  // Type the UID (this will be captured by the Python script)
  Serial.println(uid);
  
  // Show confirmation
  Serial.println("✅ UID typed: " + uid);
  Serial.println("🔄 Ready for next card...");
  Serial.println();
  
  // Halt the card
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  return true;
}

void blinkSuccess() {
  // Green blink pattern (2 quick blinks)
  for (int i = 0; i < 2; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}

void blinkError() {
  // Red blink pattern (5 quick blinks)
  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(80);
    digitalWrite(LED_PIN, LOW);
    delay(80);
  }
}

void indicateReady() {
  // Ready pattern (3 slow pulses)
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(300);
    digitalWrite(LED_PIN, LOW);
    delay(300);
  }
}