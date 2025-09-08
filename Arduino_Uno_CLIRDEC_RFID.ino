/*
 * CLIRDEC: PRESENCE - Arduino Uno RFID Reader
 * 
 * Hardware: Arduino Uno with RC522 RFID Module
 * Mode: USB Serial Communication Only
 * 
 * Pin Connections for Arduino Uno:
 * RC522 RFID Module:
 *   VCC -> 3.3V (IMPORTANT: NOT 5V!)
 *   RST -> Pin 9
 *   GND -> GND
 *   MISO -> Pin 12 (SPI MISO)
 *   MOSI -> Pin 11 (SPI MOSI)
 *   SCK -> Pin 13 (SPI SCK)
 *   SDA -> Pin 10 (SPI SS)
 * 
 * LED (optional):
 *   Anode -> Pin 8
 *   Cathode -> GND (through 220Ω resistor)
 * 
 * Buzzer (optional):
 *   Positive -> Pin 7
 *   Negative -> GND
 */

#include <SPI.h>
#include <MFRC522.h>

// Pin definitions for Arduino Uno
#define SS_PIN 10      // SDA/SS pin
#define RST_PIN 9      // Reset pin  
#define LED_PIN 8      // Status LED (optional)
#define BUZZER_PIN 7   // Buzzer (optional)

MFRC522 rfid(SS_PIN, RST_PIN);

// RFID state management
String lastUID = "";
unsigned long lastRFIDTime = 0;
const unsigned long RFID_COOLDOWN = 2000; // 2 seconds to prevent duplicate reads

void setup() {
  Serial.begin(9600);  // 9600 baud for reliable communication
  
  Serial.println("==========================================");
  Serial.println("CLIRDEC: PRESENCE - Arduino Uno RFID Reader");
  Serial.println("==========================================");
  
  // Initialize SPI and RFID
  SPI.begin();
  rfid.PCD_Init();
  
  // Initialize optional pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  // Test RFID module
  Serial.println("Testing RFID module...");
  delay(1000);
  
  if (!rfid.PCD_PerformSelfTest()) {
    Serial.println("❌ RFID module test failed!");
    Serial.println("Check wiring connections:");
    Serial.println("- VCC to 3.3V (NOT 5V!)");
    Serial.println("- RST to Pin 9");
    Serial.println("- SDA to Pin 10");
    Serial.println("- SCK to Pin 13");
    Serial.println("- MOSI to Pin 11");
    Serial.println("- MISO to Pin 12");
    Serial.println("- GND to GND");
    blinkError();
    while(1); // Stop execution
  } else {
    Serial.println("✅ RFID module initialized successfully");
  }
  
  // Re-initialize RFID for normal operation
  rfid.PCD_Init();
  
  Serial.println("==========================================");
  Serial.println("📝 MODE: USB RFID SCANNER");
  Serial.println("Ready to scan RFID cards...");
  Serial.println("Tap RFID card near the reader");
  Serial.println("==========================================");
  
  // Ready indication
  indicateReady();
}

void loop() {
  // Check for RFID cards
  checkRFID();
  delay(100);
}

void checkRFID() {
  // Check if a new card is present
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Build card ID string
  String cardId = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) cardId += "0";
    cardId += String(rfid.uid.uidByte[i], HEX);
  }
  cardId.toUpperCase();
  
  // Debounce - prevent multiple scans of same card
  unsigned long currentTime = millis();
  if (cardId == lastUID && (currentTime - lastRFIDTime) < RFID_COOLDOWN) {
    rfid.PICC_HaltA();
    return;
  }
  
  lastUID = cardId;
  lastRFIDTime = currentTime;
  
  // Process RFID scan
  handleRFIDScan(cardId);
  
  // Halt the card
  rfid.PICC_HaltA();
}

void handleRFIDScan(String cardId) {
  Serial.println("==========================================");
  Serial.println("📱 RFID Card Detected!");
  Serial.println("Card ID: " + cardId);
  Serial.println("Timestamp: " + String(millis()));
  
  // For web form integration, output just the card ID
  Serial.println("CARD_ID:" + cardId);
  
  Serial.println("==========================================");
  
  // Visual and audio feedback
  blinkLED(2, 200);
  beep(1, 100);
  
  // Additional card information
  Serial.print("Card Type: ");
  MFRC522::PICC_Type piccType = rfid.PICC_GetType(rfid.uid.sak);
  Serial.println(rfid.PICC_GetTypeName(piccType));
  
  Serial.print("Card Size: ");
  Serial.print(rfid.uid.size);
  Serial.println(" bytes");
  
  Serial.println("Ready for next card...");
  Serial.println();
}

// LED Control Functions
void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
}

void blinkError() {
  // Error pattern: fast blinking
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}

void indicateReady() {
  // Ready pattern: 3 slow blinks
  blinkLED(3, 300);
  beep(2, 150);
}

// Buzzer Control Functions  
void beep(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(delayMs);
    digitalWrite(BUZZER_PIN, LOW);
    if (i < times - 1) delay(delayMs);
  }
}