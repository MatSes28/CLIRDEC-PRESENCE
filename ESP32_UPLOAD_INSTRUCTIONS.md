# Safe ESP32 Upload Instructions

## IMPORTANT: Follow these steps exactly to prevent corruption

### Step 1: Prepare Arduino IDE Settings
```
Board: "ESP32 Dev Module"
Upload Speed: 115200 (NEVER use higher speeds)
CPU Frequency: 240MHz
Flash Frequency: 80MHz  
Flash Mode: DIO
Flash Size: 4MB (32Mb)
Partition Scheme: Default 4MB with spiffs
Core Debug Level: None
Erase Flash: All Flash Contents (IMPORTANT!)
```

### Step 2: Hardware Preparation
1. Connect ESP32 to computer with quality USB cable
2. Press and hold BOOT button
3. Press and release EN (reset) button
4. Release BOOT button
5. ESP32 is now in download mode

### Step 3: Update WiFi Credentials
In `ESP32_CLIRDEC_SAFE.ino`, change lines 43-44:
```cpp
const char* ssid = "YOUR_ACTUAL_WIFI_NAME";
const char* password = "YOUR_ACTUAL_WIFI_PASSWORD";
```

### Step 4: Upload Process
1. Select Tools → Erase Flash → "All Flash Contents"
2. Click Upload
3. When "Connecting..." appears, quickly press and release BOOT button
4. Wait for "Hard resetting via RTS pin..." message
5. DO NOT disconnect until upload is 100% complete

### Step 5: Verify Upload
After successful upload, you should see:
```
======================================
CLIRDEC: PRESENCE ESP32 Starting...
======================================
Device ID: ESP32_XXXXXXXXX
Initializing hardware...
✅ RFID module test passed
Hardware initialization complete
Current Mode: WiFi Attendance
Connecting to WiFi.....
✅ WiFi connected!
IP address: 192.168.x.x
Connecting to WebSocket server...
✅ WebSocket Connected
📱 Device registration sent
🎉 Device registered successfully!
🚀 Device ready for operation
```

## Safety Features in This Firmware:
- ✅ Watchdog timer prevents hangs
- ✅ Automatic WiFi reconnection
- ✅ Safe JSON parsing
- ✅ RFID collision prevention
- ✅ Memory monitoring
- ✅ Graceful error handling
- ✅ Automatic mode switching
- ✅ Connection recovery

## If Upload Fails:
1. Check USB cable (must support data)
2. Try different USB port
3. Use slower upload speed (57600)
4. Hold BOOT button throughout upload
5. Restart Arduino IDE

## Hardware Wiring (Double-check):
```
RC522 → ESP32
VCC   → 3.3V (NOT 5V!)
RST   → GPIO 22
GND   → GND
MISO  → GPIO 19
MOSI  → GPIO 23
SCK   → GPIO 18
SDA   → GPIO 5
```

Your ESP32 will be ready for CLIRDEC attendance system after successful upload.