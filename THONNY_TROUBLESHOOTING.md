# Thonny MicroPython Troubleshooting

## Common "AssertionError: buffers_are_empty()" Fix

This error happens when the ESP32's serial buffer gets stuck. Here's how to fix it:

### Method 1: Reset ESP32 Connection
1. **Disconnect ESP32** from USB
2. **Close Thonny completely**
3. **Reconnect ESP32** to USB
4. **Open Thonny**
5. **Go to Tools → Options → Interpreter**
6. **Select "MicroPython (ESP32)"**
7. **Choose correct COM port**
8. **Click OK**

### Method 2: Reset ESP32 Hardware
1. **Press and hold EN (reset) button** on ESP32 for 3 seconds
2. **Release button**
3. **Try connecting again in Thonny**

### Method 3: Stop/Interrupt Running Code
1. **Click the red STOP button** in Thonny
2. **Press Ctrl+C** in the shell
3. **Try Method 1 if still stuck**

### Method 4: Flash Fresh MicroPython
If all else fails, reflash MicroPython:

```bash
# Erase completely
esptool.py --chip esp32 --port COM3 erase_flash

# Flash MicroPython again
esptool.py --chip esp32 --port COM3 --baud 460800 write_flash -z 0x1000 esp32-firmware.bin
```

## Alternative: Use Simple Code First

Instead of the complex WiFi code, try the simple version:

### Step 1: Test Basic Connection
```python
print("Hello ESP32!")
from machine import Pin
led = Pin(2, Pin.OUT)
led.on()
```

### Step 2: Upload Simple WiFi Code
Use `esp32_simple_wifi.py` - it's more reliable and has fewer dependencies.

## Uploading Code Successfully

### Method A: Copy/Paste (Safest)
1. **Open the .py file** in a text editor
2. **Copy all code** (Ctrl+A, Ctrl+C)
3. **Paste into Thonny shell** (Ctrl+V)
4. **Press Enter** to run

### Method B: Save as File
1. **Create new file** in Thonny (Ctrl+N)
2. **Paste code**
3. **Save to ESP32** as `main.py` (Ctrl+S → This computer → ESP32)

### Method C: Upload via Files
1. **View → Files** in Thonny
2. **Right-click in ESP32 section**
3. **Upload files** → select your .py file

## Configuration Steps

### 1. Update WiFi Credentials
```python
WIFI_SSID = "Your_Actual_WiFi_Name"
WIFI_PASSWORD = "Your_Actual_Password"
```

### 2. Verify Hardware Connections
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

### 3. Test Step by Step
```python
# Test 1: Basic LED
from machine import Pin
led = Pin(2, Pin.OUT)
led.on()
print("LED test passed")

# Test 2: WiFi
import network
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
print("WiFi test passed")

# Test 3: RFID pins
from machine import SPI
spi = SPI(1, sck=Pin(18), mosi=Pin(23), miso=Pin(19))
print("SPI test passed")
```

## Success Indicators

When working correctly, you should see:
```
========================================
CLIRDEC Simple WiFi RFID
========================================
RFID reader initialized
Connecting to Your_WiFi...
Connected! IP: 192.168.1.100
System ready!

Card: A1B2C3D4
✅ Attendance sent: A1B2C3D4
```

## Alternative Tools

If Thonny keeps having issues:
- **Use Arduino IDE** with the Arduino versions instead
- **Try ampy tool:** `pip install adafruit-ampy`
- **Use esptool directly** for file uploads

The simple WiFi version (`esp32_simple_wifi.py`) is much more reliable and easier to debug than the complex WebSocket version.