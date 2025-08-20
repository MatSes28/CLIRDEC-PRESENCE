"""
RFID UID Typing Script for CLIRDEC Presence System

This script listens to ESP32 via USB serial and automatically types
RFID UIDs into web forms for student registration.

Usage:
1. Connect ESP32 to USB port
2. Set ESP32 to USB Registration Mode (hold BOOT button 3 seconds)
3. Run: python type_uid.py
4. Open your web browser and click in RFID card ID field
5. Tap RFID cards - UIDs will be automatically typed

Requirements:
pip install pyserial keyboard
"""

import serial
import keyboard
import time
import sys
from datetime import datetime

# Configuration
PORT = "COM3"  # Windows: COM3, COM4, etc. | Linux/Mac: /dev/ttyUSB0, /dev/ttyACM0
BAUD = 9600
TIMEOUT = 1

# Duplicate prevention
last_uid = ""
last_time = 0
DUPLICATE_TIMEOUT = 2  # seconds

def find_esp32_port():
    """Auto-detect ESP32 port"""
    import serial.tools.list_ports
    
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if "ESP32" in port.description or "Silicon Labs" in port.description or "CP210" in port.description:
            return port.device
    return None

def main():
    global last_uid, last_time
    
    print("🚀 CLIRDEC RFID USB Typer Starting...")
    print("=" * 50)
    
    # Try to auto-detect ESP32 port
    auto_port = find_esp32_port()
    if auto_port:
        port = auto_port
        print(f"✅ Auto-detected ESP32 on: {port}")
    else:
        port = PORT
        print(f"⚠️ Using default port: {port}")
    
    print("\n📋 Instructions:")
    print("1. Make sure ESP32 is in USB Registration Mode")
    print("2. Open your web browser")
    print("3. Click in the RFID Card ID field")
    print("4. Tap RFID cards near the reader")
    print("5. UIDs will be automatically typed!")
    print("\n🛑 Press Ctrl+C to stop")
    print("=" * 50)
    
    try:
        # Connect to ESP32
        ser = serial.Serial(port, BAUD, timeout=TIMEOUT)
        print(f"📡 Connected to {port} at {BAUD} baud")
        print("🎯 Listening for RFID cards...\n")
        
        while True:
            try:
                # Read line from ESP32
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                
                if line:
                    current_time = time.time()
                    
                    # Filter out non-UID messages
                    if any(word in line.lower() for word in ['rfid', 'mode', 'wifi', 'connected', 'ready', '===', 'boot']):
                        print(f"📢 ESP32: {line}")
                        continue
                    
                    # Check if it looks like a UID (hex characters, 6-20 chars)
                    if len(line) >= 6 and len(line) <= 20 and all(c in '0123456789ABCDEFabcdef' for c in line):
                        uid = line.upper()
                        
                        # Prevent duplicates
                        if uid == last_uid and (current_time - last_time) < DUPLICATE_TIMEOUT:
                            continue
                        
                        last_uid = uid
                        last_time = current_time
                        
                        # Type the UID
                        timestamp = datetime.now().strftime("%H:%M:%S")
                        print(f"[{timestamp}] 📝 Typing UID: {uid}")
                        
                        # Type UID where cursor is positioned
                        keyboard.write(uid)
                        
                        # Optional: uncomment to auto-press Enter
                        # keyboard.press_and_release('enter')
                        
                        print(f"✅ Typed successfully!")
                    else:
                        print(f"📢 ESP32: {line}")
                        
            except UnicodeDecodeError:
                # Skip binary data
                continue
            except Exception as e:
                print(f"❌ Error processing data: {e}")
                continue
                
    except serial.SerialException as e:
        print(f"❌ Serial connection error: {e}")
        print("\n💡 Troubleshooting:")
        print("1. Check if ESP32 is connected via USB")
        print("2. Verify the correct COM port")
        print("3. Make sure ESP32 is in USB Registration Mode")
        print("4. Try a different USB cable")
        print("5. Check Windows Device Manager for port number")
        
    except KeyboardInterrupt:
        print("\n🛑 Stopped by user")
        
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
    
    finally:
        try:
            if 'ser' in locals():
                ser.close()
                print("📱 Serial connection closed")
        except:
            pass

if __name__ == "__main__":
    main()