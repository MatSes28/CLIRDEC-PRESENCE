# ESP32 Setup Instructions for CLIRDEC System

## Quick Setup Guide

### 1. Download Arduino Firmware
Your ESP32 firmware files have been updated with the correct server URL. Use either:
- `ESP32_CLIRDEC_COMPLETE.ino` (recommended - full features)
- `arduino/ESP32_DUAL_MODE/ESP32_DUAL_MODE.ino` (dual mode)

### 2. Configure WiFi Credentials
Open the Arduino file and update these lines:
```cpp
// WiFi credentials (UPDATE THESE)
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 3. Server Configuration (Already Updated)
The server URL is already configured:
```cpp
const char* websocket_server = "80c100b5-06da-459f-a3df-355da67989d9-00-311s6g7ren528.sisko.replit.dev";
```

### 4. Hardware Wiring
Follow the wiring diagram in `RFID_SETUP_GUIDE.md`:

**RC522 RFID Module to ESP32:**
```
RC522 Pin → ESP32 Pin → Function
VCC       → 3.3V      → Power (3.3V, NOT 5V!)
RST       → GPIO 22   → Reset
GND       → GND       → Ground
MISO      → GPIO 19   → SPI MISO
MOSI      → GPIO 23   → SPI MOSI
SCK       → GPIO 18   → SPI Clock
SDA/SS    → GPIO 5    → SPI Slave Select
```

### 5. Upload Firmware
1. Connect ESP32 to computer via USB
2. Open Arduino IDE
3. Select: Tools → Board → ESP32 Dev Module
4. Select correct COM port
5. Click Upload

### 6. Monitor Connection
Open Serial Monitor (Tools → Serial Monitor) to see:
```
WiFi connecting...
WiFi connected!
WebSocket connecting...
Device registered successfully!
```

## Connection Verification

### Server Status: ✅ WORKING
- IoT WebSocket server is running
- SSL certificate is valid
- Connection endpoint is accessible

### Test Results:
- ✅ WebSocket handshake successful
- ✅ Server responds with welcome message
- ✅ IoT endpoint `/iot` is functional

## Troubleshooting

### If ESP32 Won't Connect to WiFi:
1. Check WiFi credentials are correct
2. Ensure WiFi network is 2.4GHz (not 5GHz)
3. Verify network allows device connections
4. Check signal strength near ESP32

### If WebSocket Connection Fails:
1. Verify internet connectivity
2. Check firewall/router settings
3. Monitor ESP32 serial output for error messages
4. Ensure server URL is exactly as shown above

### If RFID Cards Not Reading:
1. Check all wiring connections
2. Verify RC522 powered by 3.3V (NOT 5V)
3. Test different RFID cards
4. Check card proximity (0-60mm range)

## Support Files
- Full setup guide: `RFID_SETUP_GUIDE.md`
- Arduino code: `ESP32_CLIRDEC_COMPLETE.ino`
- Dual mode code: `arduino/ESP32_DUAL_MODE/ESP32_DUAL_MODE.ino`
- Hardware alternatives: `HARDWARE_ALTERNATIVES.md`