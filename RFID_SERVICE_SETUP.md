# CLIRDEC Auto RFID Service Setup Guide

This service automatically detects RFID card taps and types the UIDs into student registration forms without manual intervention.

## Features

✅ **Automatic Operation** - Runs in background, no manual script execution  
✅ **Smart Detection** - Only types when browser is on registration pages  
✅ **Auto-Reconnect** - Automatically reconnects if ESP32 disconnects  
✅ **Duplicate Prevention** - Prevents typing the same UID multiple times  
✅ **System Integration** - Can run as Windows service or startup program  
✅ **Logging** - Comprehensive logs for troubleshooting  

## Quick Setup (Windows)

### Option 1: Automatic Installation
```bash
# 1. Download the files to a folder
# 2. Right-click "install_rfid_service.bat" → Run as Administrator
# 3. Follow the prompts
```

### Option 2: Manual Setup
```bash
# Install dependencies
pip install pyserial keyboard psutil requests win10toast

# Run the service
python auto_rfid_service.py
```

## Hardware Setup

1. **Connect ESP32** via USB cable
2. **Upload Arduino code** (ESP32_DUAL_MODE.ino)
3. **Switch to USB mode** - Hold BOOT button 3 seconds
4. **Verify connection** - Check Windows Device Manager

## Usage

1. **Start the service** (automatically starts with Windows if installed)
2. **Open student registration** in your browser
3. **Click in RFID Card ID field**
4. **Tap RFID card** - UID automatically types in

## Advanced Options

### Install as Windows Service
```bash
python auto_rfid_service.py --install
```

### Debug Mode
```bash
python auto_rfid_service.py --debug
```

### View Logs
Logs are saved to: `%USERPROFILE%\Documents\CLIRDEC_Logs\`

## Troubleshooting

### ESP32 Not Detected
- Check USB cable (must support data transfer)
- Install ESP32 drivers: https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers
- Try different USB ports

### Service Not Typing
- Ensure browser is on localhost:5000 or contains "student", "registration"
- Click in RFID field before tapping card
- Check logs for errors

### Permission Issues
- Run as Administrator first time
- Allow through Windows Firewall if prompted

## Configuration

Edit `auto_rfid_service.py` to customize:

```python
# Change target URLs
self.target_urls = [
    'localhost:5000',
    'your-domain.com',
    'student', 
    'registration'
]

# Adjust cooldown time
self.uid_cooldown = 2.0  # seconds
```

## System Requirements

- Windows 10/11 (Linux/Mac support available)
- Python 3.7+
- ESP32 with RFID reader
- USB cable with data support

## Support

Check logs in `~/Documents/CLIRDEC_Logs/` for detailed error information.