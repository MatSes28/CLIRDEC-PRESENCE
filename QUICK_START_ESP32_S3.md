# Quick Start Guide - ESP32 S3 Setup

## 📦 What You Have

Looking at your board, you have an **ESP32-S3 DevKit** with dual USB-C ports. Perfect for this project!

---

## 🔌 Step 1: Wire Your Components

### Power First:
```
ESP32 S3:
- 5V pin    → Breadboard + rail (red)
- 3.3V pin  → Breadboard + rail (orange) - ONLY for RFID!
- GND pin   → Breadboard - rail (black)
```

### RC522 RFID Module Connections:
```
RC522     →  ESP32 S3
VCC       →  3.3V  ⚠️ IMPORTANT: 3.3V ONLY!
GND       →  GND
RST       →  GPIO 22
MISO      →  GPIO 19
MOSI      →  GPIO 23
SCK       →  GPIO 18
SDA       →  GPIO 21
```

### HC-SR04 Sensor #1 (ENTRY):
```
HC-SR04   →  ESP32 S3
VCC       →  5V  ⚠️ Must be 5V!
GND       →  GND
Trig      →  GPIO 12
Echo      →  GPIO 13
```

### HC-SR04 Sensor #2 (EXIT):
```
HC-SR04   →  ESP32 S3
VCC       →  5V  ⚠️ Must be 5V!
GND       →  GND
Trig      →  GPIO 25
Echo      →  GPIO 26
```

---

## 💻 Step 2: Install Arduino IDE

1. Download from: https://www.arduino.cc/en/software
2. Install and open Arduino IDE

---

## 🔧 Step 3: Add ESP32 Support

1. Open Arduino IDE
2. Go to **File → Preferences**
3. In "Additional Board Manager URLs", paste:
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
4. Click **OK**
5. Go to **Tools → Board → Boards Manager**
6. Search: **ESP32**
7. Install: **esp32 by Espressif Systems**
8. Wait for it to finish (may take a few minutes)

---

## 📚 Step 4: Install Libraries

Go to **Tools → Manage Libraries**, search and install:

1. **MFRC522** (for RFID reader)
2. **ArduinoWebsockets** by Gil Maimon
3. **ArduinoJson** by Benoit Blanchon

Click "Install" for each and wait.

---

## ⚙️ Step 5: Configure Board Settings

Click **Tools** menu and set these EXACTLY:

```
Board:           "ESP32S3 Dev Module"
Upload Speed:    115200
CPU Frequency:   240MHz
Flash Mode:      DIO
Flash Size:      4MB (32Mb)
Port:            (Select your COM port - it will show when you plug in USB)
```

---

## 📝 Step 6: Edit the Code

1. Open `ESP32_S3_DUAL_SENSOR_ATTENDANCE.ino` in Arduino IDE

2. Find lines 50-52 and change:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* serverHost = "YOUR_REPLIT_URL.replit.dev";
   ```

3. Replace with YOUR information:
   ```cpp
   const char* ssid = "YourActualWiFiName";
   const char* password = "YourActualPassword";
   const char* serverHost = "03e2bce6-b0a5-4306-b014-9edab35e528e-00-2gnxw5t0zy3c8.sisko.replit.dev";
   ```

   **To get your Replit URL:**
   - Look at your browser when viewing your Replit app
   - Copy the domain part only (no https://)
   - Example: `abc123-xyz.replit.dev`

---

## 📤 Step 7: Upload to ESP32

### A. Connect ESP32:
- Plug USB-C cable into **either** USB port
- Use the USB port closest to the edge (usually works better)

### B. Put ESP32 in Upload Mode:
1. **Press and HOLD** the **BOOT** button
2. While holding BOOT, **press and release** the **RST** button
3. **Release** the BOOT button
4. LED should turn on - ESP32 is ready!

### C. Upload:
1. Click the **Upload** button (→ arrow) in Arduino IDE
2. Wait for "Connecting....."
3. If stuck, quickly press BOOT button once
4. Watch for upload progress
5. Success: "Hard resetting via RTS pin..."

### D. Restart:
- Press **RST** button once
- LED blinks 3 times = Success!

---

## 🧪 Step 8: Test Everything

1. Open **Tools → Serial Monitor**
2. Set to **115200 baud** (bottom right dropdown)
3. Press **RST** button on ESP32

You should see:
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
IP Address: 192.168.x.x

Connecting to WebSocket...
✓ WebSocket Connected!
✓ Device registered successfully!
```

---

## ✅ Test Each Sensor:

**RFID Test:**
- Hold RFID card near RC522
- Should show: `📇 RFID Card Detected: XXXXXX`

**Entry Sensor Test:**
- Wave hand 10-20cm in front of sensor #1
- Should show: `✓ Entry sensor validated: XX.X cm`

**Exit Sensor Test:**
- Wave hand in front of sensor #2
- Should show: `✓ Exit sensor validated: XX.X cm`

---

## ❌ Troubleshooting

### Upload Fails:
1. Try the other USB-C port
2. Hold BOOT, press RST, release BOOT, try again
3. Check cable supports data (some cables are power-only)

### RFID Not Working:
- **Double-check:** RC522 VCC → 3.3V (NOT 5V!)
- All 7 wires connected correctly
- Try different RFID card

### Sensors Not Working:
- **Check:** HC-SR04 VCC → 5V (NOT 3.3V!)
- Trig and Echo not swapped
- Nothing blocking sensor (need clear view)

### WiFi Won't Connect:
- Check WiFi name and password (case-sensitive!)
- ESP32 only works with 2.4GHz WiFi (not 5GHz)
- Move closer to router

### WebSocket Error:
- Make sure Replit app is running
- Check URL has no `https://` or trailing `/`
- Verify internet connection

---

## 📍 Pin Reference Card

**Save this for wiring:**

| Component | Pin Name | ESP32 GPIO |
|-----------|----------|------------|
| **RC522 RFID** | | |
| VCC | 3.3V | 3.3V |
| RST | Reset | GPIO 22 |
| GND | Ground | GND |
| MISO | Data Out | GPIO 19 |
| MOSI | Data In | GPIO 23 |
| SCK | Clock | GPIO 18 |
| SDA | Select | GPIO 21 |
| **Entry Sensor** | | |
| VCC | Power | 5V |
| Trig | Trigger | GPIO 12 |
| Echo | Echo | GPIO 13 |
| GND | Ground | GND |
| **Exit Sensor** | | |
| VCC | Power | 5V |
| Trig | Trigger | GPIO 25 |
| Echo | Echo | GPIO 26 |
| GND | Ground | GND |

---

## 🎯 Next Steps

Once everything works:
1. Mount sensors at your classroom door
2. Test the complete attendance flow
3. Check the web dashboard for records
4. Monitor Serial Monitor for any issues

---

**Need help? Check the detailed guide: ESP32_S3_UPLOAD_GUIDE.md**
