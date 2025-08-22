# MicroPython ESP32 RFID Setup for CLIRDEC

## Overview
Using MicroPython on ESP32 for RFID card reading. Simpler to modify and debug than Arduino IDE.

## Setup Steps

### Step 1: Install MicroPython on ESP32

1. **Download MicroPython firmware:**
   - Go to https://micropython.org/download/esp32/
   - Download latest stable version (e.g., esp32-20230426-v1.20.0.bin)

2. **Install esptool:**
   ```bash
   pip install esptool
   ```

3. **Erase ESP32 flash:**
   ```bash
   esptool.py --chip esp32 --port COM3 erase_flash
   ```
   (Replace COM3 with your port)

4. **Flash MicroPython:**
   ```bash
   esptool.py --chip esp32 --port COM3 --baud 460800 write_flash -z 0x1000 esp32-20230426-v1.20.0.bin
   ```

### Step 2: Upload RFID Code

1. **Install Thonny IDE:**
   - Download from https://thonny.org/
   - Great for MicroPython development

2. **Connect to ESP32:**
   - Open Thonny
   - Go to Tools → Options → Interpreter
   - Select "MicroPython (ESP32)"
   - Choose correct COM port

3. **Upload the code:**
   - Copy contents of `esp32_rfid_micropython.py`
   - Save as `main.py` on ESP32 (so it runs automatically)

### Step 3: Python Typer Setup (Same as before)

```bash
pip install pyserial keyboard
python usb_rfid_typer.py
```

## Hardware Wiring (Same as Arduino version)

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

## Advantages of MicroPython Version

✅ **Easy to modify** - Just edit Python code
✅ **No Arduino IDE needed** - Use any text editor
✅ **Interactive debugging** - REPL console available
✅ **Faster development** - No compile/upload cycle
✅ **Same functionality** - Reads RFID, outputs UIDs

## Usage

1. **Flash MicroPython firmware to ESP32**
2. **Upload `esp32_rfid_micropython.py` as `main.py`**
3. **Run `usb_rfid_typer.py` on computer**
4. **Tap RFID cards** - UIDs auto-fill in student forms

## Troubleshooting

### ESP32 Not Found:
- Check USB cable (data support required)
- Try different COM port
- Install CP210x or CH340 drivers

### MicroPython Flash Failed:
- Use slower baud rate: `--baud 115200`
- Try different USB port
- Hold BOOT button during flash

### RFID Not Working:
- Verify 3.3V power (NOT 5V)
- Check all wiring connections
- Test with Thonny REPL console

### Can't Connect with Thonny:
- Check COM port in Tools → Options
- Try disconnecting/reconnecting ESP32
- Reset ESP32 (press EN button)

## Expected Output

```
==================================================
CLIRDEC USB RFID Typer - MicroPython
==================================================
Instructions:
1. Open student form in browser
2. Click in RFID Card ID field
3. Tap RFID card on reader
4. UID will be typed automatically
==================================================
✅ RFID Reader initialized successfully
🚀 Ready to read RFID cards...

📱 RFID Card Detected: A1B2C3D4
💾 Typing UID into form...
A1B2C3D4
✅ UID typed: A1B2C3D4
🔄 Ready for next card...
```

MicroPython version is easier to modify and debug while providing the same RFID reading functionality for your CLIRDEC system.