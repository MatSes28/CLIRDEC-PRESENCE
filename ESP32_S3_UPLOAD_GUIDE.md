# ESP32 S3 Upload Guide - Dual Sensor Attendance System

## What You Need

### Hardware:
- ESP32-S3 Development Board
- RC522 RFID Module
- 2x HC-SR04 Ultrasonic Sensors
- Jumper wires
- Breadboard (optional)
- USB-C cable (data transfer capable)

### Software:
- Arduino IDE (Version 1.8.19 or 2.x)
- Required Libraries (see installation steps below)

---

## Step 1: Install Arduino IDE

1. Download Arduino IDE from: https://www.arduino.cc/en/software
2. Install and open Arduino IDE

---

## Step 2: Install ESP32 Board Support

1. In Arduino IDE, go to **File → Preferences**
2. In "Additional Board Manager URLs", add:
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
3. Click **OK**
4. Go to **Tools → Board → Boards Manager**
5. Search for "**ESP32**"
6. Install "**esp32 by Espressif Systems**" (latest version)
7. Wait for installation to complete

---

## Step 3: Install Required Libraries

Go to **Tools → Manage Libraries**, then search and install each of these:

1. **MFRC522** by GithubCommunity (for RFID)
2. **ArduinoWebsockets** by Gil Maimon (for WiFi communication)
3. **ArduinoJson** by Benoit Blanchon (version 6.x)

Click "Install" for each library and wait for completion.

---

## Step 4: Hardware Wiring

### Power Connections:
- Connect ESP32 **5V** pin to breadboard power rail
- Connect ESP32 **GND** pin to breadboard ground rail
- Connect ESP32 **3.3V** pin to a separate power rail (for RFID only)

### RC522 RFID Module → ESP32-S3:
```
RC522 Pin    →    ESP32 Pin    →    Notes
VCC          →    3.3V         →    IMPORTANT: Use 3.3V, NOT 5V!
RST          →    GPIO 22      →    Reset pin
GND          →    GND          →    Ground
MISO         →    GPIO 19      →    SPI Data Out
MOSI         →    GPIO 23      →    SPI Data In  
SCK          →    GPIO 18      →    SPI Clock
SDA/SS       →    GPIO 21      →    Chip Select
```

### HC-SR04 Sensor #1 (ENTRY) → ESP32-S3:
```
HC-SR04 Pin  →    ESP32 Pin    →    Notes
VCC          →    5V           →    Must be 5V
GND          →    GND          →    Ground
Trig         →    GPIO 32      →    Trigger pulse
Echo         →    GPIO 33      →    Echo response
```

### HC-SR04 Sensor #2 (EXIT) → ESP32-S3:
```
HC-SR04 Pin  →    ESP32 Pin    →    Notes
VCC          →    5V           →    Must be 5V
GND          →    GND          →    Ground
Trig         →    GPIO 25      →    Trigger pulse
Echo         →    GPIO 26      →    Echo response
```

### Visual Wiring Diagram:
```
ESP32-S3
┌─────────────────┐
│                 │
│  3.3V ──────────┼──→ RC522 VCC
│  GND  ──────────┼──→ All GND connections
│  5V   ──────────┼──→ HC-SR04 #1 & #2 VCC
│                 │
│  GPIO 21 ───────┼──→ RC522 SDA
│  GPIO 22 ───────┼──→ RC522 RST
│  GPIO 18 ───────┼──→ RC522 SCK
│  GPIO 19 ───────┼──→ RC522 MISO
│  GPIO 23 ───────┼──→ RC522 MOSI
│                 │
│  GPIO 32 ───────┼──→ HC-SR04 #1 Trig (Entry)
│  GPIO 33 ───────┼──→ HC-SR04 #1 Echo (Entry)
│                 │
│  GPIO 25 ───────┼──→ HC-SR04 #2 Trig (Exit)
│  GPIO 26 ───────┼──→ HC-SR04 #2 Echo (Exit)
│                 │
└─────────────────┘
```

---

## Step 5: Configure the Code

1. Open `ESP32_S3_DUAL_SENSOR_ATTENDANCE.ino` in Arduino IDE

2. Update WiFi credentials (lines 34-35):
   ```cpp
   const char* ssid = "YourWiFiName";      // Replace with your WiFi name
   const char* password = "YourPassword";   // Replace with your WiFi password
   ```

3. Update server URL (line 36):
   ```cpp
   const char* serverHost = "your-app-name.replit.dev";  // Replace with your Replit URL
   ```
   
   **To find your Replit URL:**
   - Go to your Replit project
   - Click the "Webview" button
   - Copy the URL (without https://, just the domain)
   - Example: `03e2bce6-b0a5-4306-b014-9edab35e528e-00-2gnxw5t0zy3c8.sisko.replit.dev`

---

## Step 6: Upload Firmware to ESP32

### Configure Arduino IDE Settings:

1. **Tools → Board** → Select "**ESP32S3 Dev Module**"

2. **Configure these settings exactly:**
   - **Upload Speed**: 115200 (IMPORTANT!)
   - **CPU Frequency**: 240MHz
   - **Flash Frequency**: 80MHz
   - **Flash Mode**: DIO
   - **Flash Size**: 4MB (32Mb)
   - **Partition Scheme**: Default 4MB with spiffs
   - **Core Debug Level**: None
   - **Erase All Flash Before Sketch Upload**: Enabled

3. **Select Port**:
   - Go to **Tools → Port**
   - Select the COM port your ESP32 is connected to
   - (On Windows: COM3, COM4, etc. | On Mac: /dev/cu.usbserial...)

### Upload Process:

1. **Put ESP32 in Upload Mode:**
   - Press and HOLD the **BOOT** button on ESP32
   - While holding BOOT, press and release the **EN/RST** button
   - Release the **BOOT** button after 2 seconds
   - The ESP32 is now in upload mode

2. **Click the Upload button** (→ arrow icon) in Arduino IDE

3. **Watch the output window:**
   - You should see "Connecting....."
   - If it gets stuck, quickly press and release the BOOT button again
   - Wait for "Writing at 0x..." messages
   - Success message: "Hard resetting via RTS pin..."

4. **After upload completes:**
   - Press the **EN/RST** button once to restart the ESP32
   - LED should blink 3 times (startup indication)

---

## Step 7: Test & Verify

### Open Serial Monitor:
1. Go to **Tools → Serial Monitor**
2. Set baud rate to **115200** (bottom right)
3. You should see:
   ```
   ========================================
   CLIRDEC: PRESENCE - Dual Sensor System
   ========================================
   Device ID: ESP32_S3_xxxxxx
   
   Testing sensors...
   1. Testing RFID Reader...
      ✓ RFID reader OK (Version: 0x92)
   
   2. Testing Entry Sensor (HC-SR04 #1)...
      ✓ Entry sensor OK (45.2 cm)
   
   3. Testing Exit Sensor (HC-SR04 #2)...
      ✓ Exit sensor OK (52.3 cm)
   
   ✓ Sensor test complete
   
   Connecting to WiFi: YourWiFiName
   ✓ WiFi Connected!
   IP Address: 192.168.1.xxx
   
   Connecting to WebSocket: wss://your-app.replit.dev/iot
   ✓ WebSocket Connected!
   → Device registration sent
   ✓ Device registered successfully!
   ```

### Test Each Component:

**1. Test RFID:**
- Hold an RFID card near the RC522 module
- Serial Monitor should show: `📇 RFID Card Detected: XXXXXX`

**2. Test Entry Sensor:**
- Wave your hand in front of HC-SR04 #1
- Serial Monitor should show: `✓ Entry sensor validated: XX.X cm`

**3. Test Exit Sensor:**
- Wave your hand in front of HC-SR04 #2
- Serial Monitor should show: `✓ Exit sensor validated: XX.X cm`

---

## Troubleshooting

### ❌ Upload Failed / Stuck at "Connecting...":
**Solution:**
1. Press and hold BOOT button
2. Press and release RST button
3. Release BOOT button
4. Try upload again

### ❌ RFID Not Detected:
**Check:**
- VCC connected to 3.3V (NOT 5V!)
- All 7 wires properly connected
- RC522 module not damaged
- Try different RFID cards

### ❌ HC-SR04 Shows Error:
**Check:**
- VCC connected to 5V (NOT 3.3V!)
- Trig and Echo wires not swapped
- No obstacles within 50cm
- Sensors have clear line of sight

### ❌ WiFi Won't Connect:
**Check:**
- WiFi name and password are correct
- WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- WiFi signal is strong enough
- Restart ESP32 and try again

### ❌ WebSocket Won't Connect:
**Check:**
- Replit app is running
- Server URL is correct (no https://, no trailing /)
- Internet connection is working
- Check Replit logs for errors

---

## Next Steps

Once everything is working:

1. **Position the sensors** at your classroom entrance
   - Place Entry sensor on one side of doorway
   - Place Exit sensor on opposite side
   - Mount RFID reader between them

2. **Test the complete flow:**
   - Student taps RFID card
   - Student walks through entry sensor
   - System validates and records attendance
   - Check the web dashboard for the record

3. **Monitor the Serial output** to debug any issues in real-time

---

## Need Help?

- Check the Serial Monitor for error messages
- Verify all wiring connections match the diagram
- Make sure all libraries are installed correctly
- Ensure ESP32 settings match exactly as specified

---

**Created for CLIRDEC: PRESENCE Attendance System**
**ESP32-S3 + RC522 + 2x HC-SR04 Configuration**
