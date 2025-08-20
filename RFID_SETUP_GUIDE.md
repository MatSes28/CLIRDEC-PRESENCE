# CLIRDEC PRESENCE - RFID Setup Guide

## Dual-Mode ESP32 System Overview

The CLIRDEC PRESENCE system uses a dual-mode ESP32 device that can operate in two modes:

1. **USB Registration Mode**: Direct USB connection for typing RFID UIDs into web forms
2. **WiFi Attendance Mode**: Wireless real-time attendance monitoring via WiFi

## Hardware Requirements

### ESP32 Development Board
- **Recommended**: ESP32-WROOM-32 38-pin development board
- **Features**: Built-in WiFi, Bluetooth, USB programming interface

### RFID Module (RC522)
- **Model**: MFRC522 RFID Reader/Writer Module
- **Frequency**: 13.56 MHz
- **Reading Distance**: 0-60mm
- **Interface**: SPI

### Motion Sensor (Optional)
- **Model**: HC-SR501 PIR Motion Sensor
- **Detection Range**: 3-7 meters
- **Detection Angle**: 120°

### Additional Components
- **Breadboard or PCB**: For connections
- **Jumper Wires**: Male-to-male and male-to-female
- **LED**: Status indicator (optional, ESP32 has built-in LED)
- **Buzzer**: Audio feedback (optional)
- **USB Cable**: Micro-USB or USB-C for ESP32 programming/power

## Wiring Diagram

### RC522 RFID Module to ESP32
```
RC522 Pin    →    ESP32 Pin    →    Function
VCC          →    3.3V         →    Power (3.3V, NOT 5V!)
RST          →    GPIO 22      →    Reset
GND          →    GND          →    Ground
MISO         →    GPIO 19      →    SPI MISO
MOSI         →    GPIO 23      →    SPI MOSI
SCK          →    GPIO 18      →    SPI Clock
SDA/SS       →    GPIO 5       →    SPI Slave Select
```

### HC-SR501 PIR Sensor to ESP32 (Optional)
```
PIR Pin      →    ESP32 Pin    →    Function
VCC          →    5V           →    Power
GND          →    GND          →    Ground
OUT          →    GPIO 4       →    Motion Detection Signal
```

### Status LED (Optional)
```
LED Pin      →    ESP32 Pin    →    Function
Anode (+)    →    GPIO 2       →    Built-in LED
Cathode (-)  →    GND          →    Ground
```

## Software Setup

### 1. Arduino IDE Configuration

1. **Install ESP32 Board Package**:
   - Open Arduino IDE
   - Go to File → Preferences
   - Add this URL to "Additional Board Manager URLs": 
     ```
     https://dl.espressif.com/dl/package_esp32_index.json
     ```
   - Go to Tools → Board → Boards Manager
   - Search for "ESP32" and install "ESP32 by Espressif Systems"

2. **Install Required Libraries**:
   - Go to Tools → Manage Libraries
   - Install the following libraries:
     - `MFRC522` by GithubCommunity
     - `ArduinoJson` by Benoit Blanchon
     - `WebSockets` by Markus Sattler

### 2. ESP32 Firmware Upload

1. **Open the Dual-Mode Firmware**:
   - Open `arduino/ESP32_DUAL_MODE/ESP32_DUAL_MODE.ino`

2. **Configure Settings**:
   ```cpp
   // Update WiFi credentials
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   
   // Update server URL (your Replit URL)
   const char* websocket_server = "your-app.replit.dev";
   ```

3. **Upload Firmware**:
   - Select Board: "ESP32 Dev Module"
   - Select Port: Your ESP32 COM port
   - Click Upload

### 3. Python Typing Script Setup

1. **Install Python Dependencies**:
   ```bash
   pip install pyserial keyboard
   ```

2. **Configure COM Port**:
   - Open `python_backend/type_uid.py`
   - Update the PORT variable:
     ```python
     PORT = "COM3"  # Windows: COM3, COM4, etc.
     # PORT = "/dev/ttyUSB0"  # Linux
     # PORT = "/dev/ttyACM0"  # macOS
     ```

## Operating Modes

### USB Registration Mode

**Purpose**: Register new RFID cards by typing UIDs directly into web forms

**Setup Process**:
1. Connect ESP32 to computer via USB
2. Hold BOOT button on ESP32 for 3 seconds (LED will blink 5 times)
3. ESP32 switches to USB Registration Mode
4. Run Python typing script: `python python_backend/type_uid.py`
5. Open web browser and navigate to student registration form
6. Click in the "RFID Card ID" field
7. Tap RFID cards near the reader - UIDs will be automatically typed

**Usage**:
- ESP32 outputs clean RFID UIDs via USB serial (9600 baud)
- Python script captures UIDs and types them where cursor is positioned
- No WiFi connection required
- Ideal for bulk card registration

### WiFi Attendance Mode

**Purpose**: Real-time wireless attendance monitoring and data collection

**Setup Process**:
1. ESP32 automatically connects to configured WiFi network
2. Establishes WebSocket connection to server
3. Registers device with classroom management system
4. Begins monitoring for RFID cards and motion

**Features**:
- Real-time RFID card scanning
- Motion detection for classroom presence
- Automatic attendance logging
- Device health monitoring
- Remote configuration updates

## Web Interface Integration

### Student Registration Form

The web interface includes an integrated RFID helper:

1. **Open Add Student Modal**
2. **Click "Show Setup Guide"** in RFID Card ID section
3. **Follow step-by-step instructions** for USB mode setup
4. **Download Python script** directly from interface
5. **Auto-detection** of typed RFID UIDs

### Features:
- Real-time UID detection and validation
- Visual connection status indicators
- Step-by-step setup instructions
- Download Python typing script
- Mode switching guidance

## Troubleshooting

### Common Issues

**1. ESP32 Not Detected**
- Check USB cable (must support data, not just charging)
- Install CP210x USB drivers if needed
- Try different USB port
- Press and hold BOOT button while connecting

**2. RFID Cards Not Reading**
- Check wiring connections (especially VCC to 3.3V, NOT 5V)
- Verify RFID card compatibility (13.56 MHz MIFARE)
- Test different cards
- Check card proximity (0-60mm range)

**3. WiFi Connection Failed**
- Verify SSID and password in code
- Check WiFi network compatibility (2.4GHz, not 5GHz)
- Monitor serial output for connection status
- Restart ESP32 if connection fails

**4. Python Script Not Working**
- Verify correct COM port in script
- Install required Python packages
- Check ESP32 is in USB Registration Mode
- Run script as administrator if needed

**5. WebSocket Connection Issues**
- Verify server URL is correct
- Check firewall settings
- Ensure server is running
- Monitor server logs for connection attempts

### Diagnostic Commands

**Check ESP32 Connection**:
```bash
# Windows
mode COM3
# Linux/macOS
ls /dev/tty*
```

**Test Python Serial Connection**:
```python
import serial
ser = serial.Serial('COM3', 9600, timeout=1)
print(ser.readline().decode())
```

**Monitor ESP32 Serial Output**:
- Open Arduino IDE Serial Monitor
- Set baud rate to 9600
- Watch for status messages and error codes

## Security Considerations

1. **WiFi Security**: Use WPA2/WPA3 encryption
2. **Device Authentication**: Each ESP32 has unique device ID
3. **Data Encryption**: WebSocket connections use SSL/TLS
4. **Access Control**: Server validates device registrations
5. **Physical Security**: Secure ESP32 in tamper-resistant enclosure

## Maintenance

### Regular Tasks
- **Monitor device health** via web dashboard
- **Update firmware** when new versions available
- **Clean RFID reader** surface regularly
- **Check power connections** and USB cables
- **Backup device configurations** and settings

### Performance Optimization
- **Position RFID reader** for optimal card detection
- **Adjust PIR sensor sensitivity** for room size
- **Monitor WiFi signal strength** and relocate if needed
- **Regular system restarts** to clear memory leaks

## Support

For technical support and updates:
- **Project Repository**: Check GitHub for latest firmware
- **Documentation**: Refer to `replit.md` for system overview
- **Logs**: Check ESP32 serial output and server logs
- **Community**: ESP32 and Arduino forums for hardware issues