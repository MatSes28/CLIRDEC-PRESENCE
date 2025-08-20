# USB RFID Reader Setup for CLIRDEC

## Overview
This setup allows you to automatically fill RFID Card ID fields when adding or editing students. Simply tap an RFID card and the UID will be typed into the form.

## Hardware Setup

### ESP32 + RC522 RFID Module Wiring
```
RC522 Module → ESP32
VCC         → 3.3V (NOT 5V!)
RST         → GPIO 22
GND         → GND  
MISO        → GPIO 19
MOSI        → GPIO 23
SCK         → GPIO 18
SDA         → GPIO 5
```

## Software Setup

### Step 1: Upload ESP32 Firmware
1. Open Arduino IDE
2. Open `ESP32_USB_RFID_TYPER.ino`
3. Set board to "ESP32 Dev Module"
4. Upload to ESP32

### Step 2: Install Python Dependencies
```bash
pip install pyserial keyboard
```

### Step 3: Run RFID Typer
```bash
python usb_rfid_typer.py
```

## Usage Instructions

### For Adding New Students:
1. **Start the Python script**
   ```bash
   python usb_rfid_typer.py
   ```

2. **Open CLIRDEC system in browser**
   - Go to Students → Add Student

3. **Prepare the form**
   - Fill in student details (name, email, etc.)
   - Click in the "RFID Card ID" field

4. **Scan the card**
   - Tap RFID card on the reader
   - UID will automatically appear in the field

5. **Save the student**
   - Continue with other fields and save

### For Editing Students:
1. **Start the Python script** (if not already running)
2. **Open student edit form**
3. **Click in RFID Card ID field**
4. **Tap RFID card** - new UID will replace the old one

## Expected Output

### ESP32 Serial Monitor:
```
========================================
CLIRDEC USB RFID Typer Ready
========================================
✅ RFID Reader Test: PASSED
🚀 Ready to read RFID cards...

📱 RFID Card Detected: A1B2C3D4
💾 Typing UID into form...
A1B2C3D4
✅ UID typed: A1B2C3D4
🔄 Ready for next card...
```

### Python Script Output:
```
🔍 Searching for ESP32...
📡 Found potential ESP32: COM3 - Silicon Labs CP210x USB to UART Bridge
✅ ESP32 RFID Reader connected on COM3

📨 Received: RFID Card Detected: A1B2C3D4
📱 Valid RFID UID detected: A1B2C3D4
⌨️  Typed: A1B2C3D4
✅ UID entered successfully!
🔄 Ready for next card...
```

## Troubleshooting

### ESP32 Not Found:
- Check USB cable (must support data)
- Install CP210x or CH340 drivers if needed
- Try different USB port

### RFID Not Working:
- Verify wiring connections
- Use 3.3V for RC522 VCC (NOT 5V)
- Check if ESP32 shows "RFID Reader Test: PASSED"

### Typing Not Working:
- Make sure you clicked in the RFID Card ID field
- Run Python script as administrator (if on Windows)
- Check if keyboard library is installed correctly

### Python Script Won't Start:
```bash
pip install --upgrade pyserial keyboard
```

## Features
- ✅ Automatic ESP32 detection
- ✅ Valid RFID UID verification
- ✅ Automatic typing into web forms
- ✅ Duplicate read prevention
- ✅ Visual LED feedback
- ✅ Cross-platform compatibility

## Supported RFID Cards
- Standard ISO14443A cards (Mifare, NTAG, etc.)
- 4-byte, 7-byte, and 10-byte UIDs
- Most common RFID student ID cards

This setup makes student registration much faster - just tap the card and the ID is automatically filled in!