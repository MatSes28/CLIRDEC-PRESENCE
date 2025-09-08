# HC-SR04 Ultrasonic Sensor Troubleshooting Guide

## 🚨 Common Issue: Sensor Timeout Errors

If you're seeing `⚠️ HC-SR04 sensor timeout - check connections`, follow this systematic troubleshooting guide.

## 🔍 Quick Diagnosis Steps

### Step 1: Use the Test Firmware
Upload `ESP32_S3_HC-SR04_TEST.ino` to quickly test your sensor connections:

```arduino
// This test program will:
// ✅ Show successful distance readings
// ❌ Display specific error messages for connection issues
// 💡 Provide visual LED feedback
```

### Step 2: Verify Wiring

**ESP32-S3 + HC-SR04 Connections:**
```
HC-SR04 Pin → ESP32-S3 Pin → Notes
VCC         → 5V           → CRITICAL: Must be 5V (not 3.3V)
GND         → GND          → Solid ground connection required  
Trig        → GPIO 21      → Trigger pulse output
Echo        → GPIO 20      → Echo pulse input
```

## ⚡ Power Supply Issues (Most Common)

**Problem**: HC-SR04 requires 5V but ESP32-S3 pins are 3.3V

**Solutions**:
1. **Connect VCC to 5V pin** (not 3.3V)
2. **Use external 5V power supply** if USB power is insufficient
3. **Add power indicator LED** to verify 5V is available

```arduino
// Test 5V availability
void setup() {
  Serial.println("Testing 5V supply...");
  // If sensor works intermittently, power supply is likely the issue
}
```

## 🔌 Wiring Problems

### Loose Connections
- **Symptom**: Intermittent timeouts
- **Fix**: Use solid jumper wires, avoid breadboard for permanent installations

### Wrong GPIO Pins
- **Symptom**: Constant timeouts
- **Fix**: Double-check pin assignments match firmware:
  ```cpp
  #define TRIG_PIN 21
  #define ECHO_PIN 20
  ```

### Ground Issues
- **Symptom**: Erratic readings or constant timeouts
- **Fix**: Ensure solid GND connection between sensor and ESP32

## 🔧 Code-Level Fixes

### Increase Timeout Duration
```cpp
// If environment has long-range requirements
unsigned long duration = pulseIn(ECHO_PIN, HIGH, 50000); // 50ms timeout
```

### Add Retry Logic
```cpp
float measureDistanceWithRetry() {
  for (int attempt = 0; attempt < 3; attempt++) {
    float distance = measureDistance();
    if (distance > 0) return distance;
    delay(100); // Wait before retry
  }
  return -1; // All attempts failed
}
```

## 🧪 Systematic Testing

### Test 1: Basic Connectivity
```bash
Expected Output:
📐 Distance: 25.3 cm
👤 PRESENCE DETECTED (≤50cm)
```

### Test 2: Range Validation
- **Close object (5-10cm)**: Should detect
- **Medium range (20-100cm)**: Should measure accurately  
- **Far object (200-300cm)**: Should measure or timeout gracefully
- **No object (>400cm)**: Should timeout as expected

### Test 3: Environmental Factors
- **Temperature**: Extreme cold/heat affects readings
- **Humidity**: High humidity can cause issues
- **Sound interference**: Avoid noisy environments during testing

## 🔄 Alternative Solutions

### If HC-SR04 Continues to Fail:

1. **Try HC-SR04P** (improved version with better reliability)
2. **Use VL53L0X ToF sensor** (more accurate, I2C interface)
3. **Return to PIR sensor** if distance measurement isn't critical

### Code Fallback for Unreliable Sensors:
```cpp
void checkPresenceSensor() {
  float distance = measureDistance();
  
  if (distance == -1) {
    // Sensor failed - use last known state or assume no presence
    Serial.println("⚠️ Sensor timeout - using fallback logic");
    presenceDetected = false; // Safe fallback
    return;
  }
  
  // Normal processing
  presenceDetected = (distance <= PRESENCE_THRESHOLD);
}
```

## 📱 Expected Working Output

```
🧪 ESP32 S3 + HC-SR04 Connection Test
=====================================
✅ Pin setup complete
📏 Starting distance measurements...

📐 Distance: 45.2 cm
👤 PRESENCE DETECTED (≤50cm)
📐 Distance: 78.1 cm
📐 Distance: 23.5 cm
👤 PRESENCE DETECTED (≤50cm)
```

## 🆘 If All Else Fails

1. **Hardware replacement**: Try a different HC-SR04 sensor
2. **Pin change**: Test with different GPIO pins
3. **Oscilloscope check**: Verify trigger/echo signals (advanced)
4. **Contact support**: Report persistent issues with detailed logs

## ✅ Success Indicators

- ✅ Consistent distance readings
- ✅ No timeout errors
- ✅ LED blinks normally (not error pattern)
- ✅ Presence detection works at 50cm threshold