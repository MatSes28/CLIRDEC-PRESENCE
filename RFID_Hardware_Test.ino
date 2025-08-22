/*
 * SIMPLE RFID HARDWARE TEST
 * 
 * This basic test will help diagnose your RC522 RFID module connection
 * Upload this first to verify hardware before using the full dual-mode code
 * 
 * CRITICAL: RC522 MUST use 3.3V power (NOT 5V!)
 * 
 * Standard Wiring:
 * RC522 -> ESP32
 * VCC  -> 3.3V (NEVER use 5V!)
 * GND  -> GND
 * RST  -> GPIO 22
 * SCK  -> GPIO 18
 * MOSI -> GPIO 23
 * MISO -> GPIO 19
 * SDA  -> GPIO 5
 * 
 * Alternative Wiring (if standard doesn't work):
 * VCC  -> 3.3V
 * GND  -> GND
 * RST  -> GPIO 21
 * SCK  -> GPIO 18
 * MOSI -> GPIO 23
 * MISO -> GPIO 19
 * SDA  -> GPIO 2
 */

#include <SPI.h>
#include <MFRC522.h>

// Pin definitions - CHANGE THESE IF NEEDED
#define SS_PIN 5    // SDA/SS pin
#define RST_PIN 22  // RST pin
#define LED_PIN 2   // Built-in LED

MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("===============================================");
  Serial.println("🔍 CLIRDEC: RFID Hardware Test");
  Serial.println("===============================================");
  Serial.println("This will test your RC522 RFID module");
  Serial.println("===============================================");
  
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Initialize SPI
  Serial.println("🔧 Step 1: Initializing SPI...");
  SPI.begin();
  Serial.println("✅ SPI initialized");
  
  // Initialize RFID
  Serial.println("🔧 Step 2: Initializing RFID module...");
  rfid.PCD_Init();
  delay(500);
  
  // Test 1: Read version register
  Serial.println("🔧 Step 3: Testing RFID communication...");
  testRFIDCommunication();
  
  // Test 2: Perform self-test
  Serial.println("🔧 Step 4: Performing RFID self-test...");
  testRFIDSelfTest();
  
  // Test 3: Check antenna
  Serial.println("🔧 Step 5: Testing antenna...");
  testAntenna();
  
  Serial.println("===============================================");
  Serial.println("🎯 HARDWARE TEST COMPLETE");
  Serial.println("===============================================");
  Serial.println("If RFID is working, you'll see card detection below");
  Serial.println("Hold an RFID card near the reader...");
  Serial.println("===============================================");
}

void loop() {
  // Simple card detection test
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    
    // Build card UID
    String cardId = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) cardId += "0";
      cardId += String(rfid.uid.uidByte[i], HEX);
    }
    cardId.toUpperCase();
    
    Serial.println("🎉 CARD DETECTED: " + cardId + " (Size: " + String(rfid.uid.size) + " bytes)");
    
    // Blink LED for success
    for (int i = 0; i < 3; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
    
    // Halt the card
    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
    
    delay(2000); // Prevent spam
  }
  
  delay(100);
}

void testRFIDCommunication() {
  // Read the version register multiple times
  Serial.println("   📡 Reading version register...");
  
  for (int attempt = 1; attempt <= 5; attempt++) {
    byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
    Serial.println("   Attempt " + String(attempt) + ": Version = 0x" + String(version, HEX));
    
    if (version == 0x91) {
      Serial.println("   ✅ RC522 Version 1.0 detected!");
      return;
    } else if (version == 0x92) {
      Serial.println("   ✅ RC522 Version 2.0 detected!");
      return;
    } else if (version == 0x90) {
      Serial.println("   ✅ RC522 Version 0.0 detected!");
      return;
    } else if (version == 0x88) {
      Serial.println("   ✅ RC522 Clone detected!");
      return;
    }
    
    delay(500);
  }
  
  Serial.println("   ❌ RFID communication FAILED!");
  Serial.println("   Expected: 0x90, 0x91, 0x92, or 0x88");
  Serial.println("   💡 CHECK YOUR WIRING!");
  printWiringGuide();
}

void testRFIDSelfTest() {
  Serial.println("   🧪 Running self-test...");
  
  if (rfid.PCD_PerformSelfTest()) {
    Serial.println("   ✅ Self-test PASSED!");
    // Re-init after self-test
    rfid.PCD_Init();
  } else {
    Serial.println("   ⚠️ Self-test FAILED, but this is sometimes normal");
    Serial.println("   Continuing with basic functionality test...");
    // Re-init for normal operation
    rfid.PCD_Init();
  }
}

void testAntenna() {
  Serial.println("   📡 Testing antenna gain...");
  
  // Get current antenna gain
  byte gain = rfid.PCD_GetAntennaGain();
  Serial.println("   Current gain: " + String(gain));
  
  // Set maximum antenna gain for better range
  rfid.PCD_SetAntennaGain(rfid.RxGain_max);
  Serial.println("   ✅ Antenna gain set to maximum");
  
  // Turn antenna on
  byte antennaReg = rfid.PCD_ReadRegister(rfid.TxControlReg);
  if ((antennaReg & 0x03) == 0x03) {
    Serial.println("   ✅ Antenna is ON");
  } else {
    Serial.println("   ⚠️ Antenna appears to be OFF");
    rfid.PCD_WriteRegister(rfid.TxControlReg, antennaReg | 0x03);
    Serial.println("   🔧 Antenna turned ON");
  }
}

void printWiringGuide() {
  Serial.println("");
  Serial.println("📋 WIRING GUIDE:");
  Serial.println("=================");
  Serial.println("RC522 Pin -> ESP32 Pin");
  Serial.println("VCC       -> 3.3V (CRITICAL!)");
  Serial.println("GND       -> GND");
  Serial.println("RST       -> GPIO 22");
  Serial.println("SCK       -> GPIO 18");
  Serial.println("MOSI      -> GPIO 23");
  Serial.println("MISO      -> GPIO 19");
  Serial.println("SDA/SS    -> GPIO 5");
  Serial.println("");
  Serial.println("❗ COMMON PROBLEMS:");
  Serial.println("• Using 5V instead of 3.3V (will damage RC522!)");
  Serial.println("• Loose jumper wires");
  Serial.println("• Wrong pin connections");
  Serial.println("• Faulty breadboard connections");
  Serial.println("• Defective RC522 module");
  Serial.println("");
  Serial.println("🔧 TROUBLESHOOTING:");
  Serial.println("1. Double-check ALL connections");
  Serial.println("2. Try different jumper wires");
  Serial.println("3. Use direct wire connections (no breadboard)");
  Serial.println("4. Try alternative pins:");
  Serial.println("   RST -> GPIO 21, SDA -> GPIO 2");
  Serial.println("5. Test with a different RC522 module");
  Serial.println("");
}