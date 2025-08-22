# MicroPython WiFi Attendance System Setup

## Overview
Complete WiFi-enabled attendance system using MicroPython on ESP32. Automatically connects to your CLIRDEC system for real-time attendance tracking.

## Features
✅ **Automatic WiFi connection**
✅ **WebSocket communication with CLIRDEC server**
✅ **Real-time attendance tracking**
✅ **Device registration and heartbeat**
✅ **Motion detection support**
✅ **LED status indicators**
✅ **Automatic reconnection**

## Hardware Setup

### Required Components
- ESP32-WROOM-32 development board
- RC522 RFID module
- PIR motion sensor (HC-SR501) - Optional
- Jumper wires
- Breadboard (optional)

### Wiring Connections
```
RC522 RFID → ESP32
VCC        → 3.3V (IMPORTANT: NOT 5V!)
RST        → GPIO 22
GND        → GND
MISO       → GPIO 19
MOSI       → GPIO 23
SCK        → GPIO 18
SDA        → GPIO 5

PIR Sensor → ESP32 (Optional)
VCC        → 5V
GND        → GND
OUT        → GPIO 4

Built-in Components
LED        → GPIO 2 (built-in)
USB        → USB port (for power and programming)
```

## Software Setup

### Step 1: Install MicroPython
1. **Download MicroPython firmware:**
   - Go to https://micropython.org/download/esp32/
   - Download latest version (e.g., esp32-20230426-v1.20.0.bin)

2. **Install esptool:**
   ```bash
   pip install esptool
   ```

3. **Flash MicroPython:**
   ```bash
   # Erase flash first
   esptool.py --chip esp32 --port COM3 erase_flash
   
   # Flash MicroPython
   esptool.py --chip esp32 --port COM3 --baud 460800 write_flash -z 0x1000 esp32-20230426-v1.20.0.bin
   ```

### Step 2: Install Required Libraries
Connect to ESP32 using Thonny and install libraries:

```python
import upip
upip.install('urequests')
upip.install('websocket-client')
```

### Step 3: Configure WiFi Settings
Edit the configuration section in `esp32_wifi_attendance_micropython.py`:

```python
# Configuration - UPDATE THESE VALUES
WIFI_SSID = "Your_WiFi_Network_Name"
WIFI_PASSWORD = "Your_WiFi_Password"
SERVER_HOST = "80c100b5-06da-459f-a3df-355da67989d9-00-311s6g7ren528.sisko.replit.dev"
WS_PATH = "/iot"
```

### Step 4: Upload Code
1. **Open Thonny IDE**
2. **Connect to ESP32** (Tools → Options → Interpreter → MicroPython ESP32)
3. **Save code as `main.py`** on ESP32 (runs automatically on boot)

## Usage Instructions

### Initial Setup
1. **Power on ESP32** - it will automatically start
2. **Check serial output** for connection status
3. **Verify RFID reader** - LED should blink 3 times if working
4. **Confirm WiFi connection** - IP address will be displayed
5. **Wait for server connection** - "Device registered successfully!" message

### Daily Operation
1. **Students tap RFID cards** - attendance is automatically recorded
2. **LED feedback:**
   - 2 quick blinks = card read successfully
   - 5 fast blinks = error or unregistered card
   - 3 slow blinks = system ready/registered
3. **Motion detection** (if PIR connected) - enhances presence verification

## Expected Serial Output

```
==================================================
CLIRDEC WiFi Attendance System
==================================================
Device ID: ESP32_A1B2C3D4E5F6G7H8
Initializing...
RFID reader ready
Connecting to WiFi: Your_Network_Name
.....
WiFi connected!
IP address: 192.168.1.100
Connecting to WebSocket: wss://80c100b5-06da-459f-a3df-355da67989d9-00-311s6g7ren528.sisko.replit.dev/iot
WebSocket connected!
Device registration sent
Server welcome: Welcome to CLIRDEC IoT Hub
Device registered successfully!
Assigned to classroom: Lab 204

RFID Card: A1B2C3D4
RFID scan sent: A1B2C3D4
Scan result: checked_in - Juan Dela Cruz
```

## System Integration

### CLIRDEC Dashboard
- Device appears in IoT Device Manager
- Real-time attendance updates
- Device health monitoring
- Classroom assignment management

### Attendance Flow
1. **Student taps RFID card**
2. **ESP32 reads card UID**
3. **Sends data to CLIRDEC server via WebSocket**
4. **Server processes attendance:**
   - Identifies student
   - Records attendance
   - Updates dashboard
   - Sends notifications if needed
5. **ESP32 receives confirmation with LED feedback**

## Troubleshooting

### WiFi Connection Issues
- **Check SSID and password** in configuration
- **Verify network compatibility** (2.4GHz networks work best)
- **Check signal strength** - move closer to router

### WebSocket Connection Fails
- **Verify server URL** is correct
- **Check firewall settings** - port 443 must be open
- **Network proxy issues** - try different network

### RFID Not Working
- **Check wiring** - ensure 3.3V power (NOT 5V)
- **Test with known good card**
- **Verify SPI connections**

### Device Not Registering
- **Check server is running** - verify CLIRDEC system is active
- **WebSocket endpoint** - confirm /iot path is correct
- **Device ID conflicts** - each device needs unique ID

### Memory Issues
```python
# Check free memory
import gc
gc.collect()
print(f"Free memory: {gc.mem_free()} bytes")
```

## Advanced Configuration

### Custom Device ID
```python
# In the code, modify:
self.device_id = "CLASSROOM_01_READER_01"
```

### Heartbeat Interval
```python
# Change heartbeat frequency (milliseconds)
if time.ticks_diff(current_time, self.last_heartbeat) < 15000:  # 15 seconds
```

### RFID Read Cooldown
```python
# Adjust duplicate read prevention (milliseconds)
if time.ticks_diff(current_time, self.last_rfid_time) < 1000:  # 1 second
```

## Security Notes
- WiFi credentials stored in flash memory
- WebSocket uses TLS encryption
- Device authentication via unique ID
- No sensitive data stored locally

This MicroPython system provides the same functionality as the Arduino version but with easier customization and debugging capabilities.