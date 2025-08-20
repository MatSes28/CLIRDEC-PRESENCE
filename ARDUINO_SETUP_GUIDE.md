# ESP32 Arduino Setup Guide for CLIRDEC: PRESENCE

## Step 1: Install Required Libraries

Open Arduino IDE and install these libraries via Library Manager (Tools > Manage Libraries):

1. **ESP32 Board Package** (if not already installed):
   - Go to File > Preferences
   - Add this URL to Additional Board Manager URLs: `https://dl.espressif.com/dl/package_esp32_index.json`
   - Go to Tools > Board > Board Manager
   - Search "ESP32" and install "esp32 by Espressif Systems"

2. **Required Libraries**:
   - `WebSockets` by Markus Sattler
   - `ArduinoJson` by Benoit Blanchon
   - `MFRC522` by GithubCommunity (for RFID)

## Step 2: Basic Connection Test

1. Copy this minimal test code and upload it first:

```cpp
void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Test Started!");
  Serial.println("If you see this, the ESP32 is working!");
}

void loop() {
  Serial.println("ESP32 is alive - " + String(millis()));
  delay(2000);
}
```

## Step 3: Arduino IDE Settings

- **Board**: "ESP32 Dev Module"
- **Upload Speed**: 921600
- **CPU Frequency**: 240MHz
- **Flash Frequency**: 80MHz
- **Flash Mode**: QIO
- **Flash Size**: 4MB
- **Serial Monitor Baud Rate**: 115200

## Step 4: Troubleshooting

If you only see boot messages and no "ESP32 Test Started!":

1. **Check COM port** - Make sure correct port is selected
2. **Try different baud rate** - Set Serial Monitor to 115200
3. **Press EN button** on ESP32 after upload
4. **Check USB cable** - Some cables are power-only
5. **Install CH340/CP2102 drivers** if needed

## Expected Output

You should see:
```
ESP32 Test Started!
If you see this, the ESP32 is working!
ESP32 is alive - 1000
ESP32 is alive - 3000
ESP32 is alive - 5000
...
```

## Next Steps

Once basic test works, then upload the WiFi connection test code.