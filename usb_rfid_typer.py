#!/usr/bin/env python3
"""
USB RFID Typer for CLIRDEC Student Registration
Automatically types RFID UIDs into web forms when cards are tapped

Requirements:
pip install pyserial keyboard

Usage:
1. Connect ESP32 with RFID reader via USB
2. Run this script: python usb_rfid_typer.py
3. Open student add/edit form in browser
4. Click in RFID Card ID field
5. Tap RFID card - UID will be automatically typed
"""

import serial
import serial.tools.list_ports
import keyboard
import time
import re
import sys

class RFIDTyper:
    def __init__(self):
        self.serial_port = None
        self.is_running = False
        
    def find_esp32_port(self):
        """Find ESP32 USB port automatically"""
        print("🔍 Searching for ESP32...")
        
        ports = serial.tools.list_ports.comports()
        esp32_ports = []
        
        for port in ports:
            # Check for ESP32 identifiers
            if any(identifier in port.description.lower() for identifier in 
                   ['esp32', 'cp210x', 'ch340', 'usb serial', 'silicon labs']):
                esp32_ports.append(port.device)
                print(f"📡 Found potential ESP32: {port.device} - {port.description}")
        
        if not esp32_ports:
            print("❌ No ESP32 found. Check USB connection.")
            return None
            
        # Try each port
        for port in esp32_ports:
            try:
                ser = serial.Serial(port, 9600, timeout=1)
                time.sleep(2)  # Wait for Arduino to initialize
                
                # Check if we get expected output
                for _ in range(10):
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if 'CLIRDEC' in line or 'RFID' in line:
                        print(f"✅ ESP32 RFID Reader connected on {port}")
                        return ser
                        
                ser.close()
            except Exception as e:
                continue
                
        print("❌ ESP32 RFID Reader not responding. Check firmware.")
        return None
    
    def is_valid_rfid_uid(self, text):
        """Check if text looks like an RFID UID"""
        # RFID UIDs are typically 4, 7, or 10 bytes (8, 14, or 20 hex characters)
        if re.match(r'^[0-9A-F]{8}$', text):  # 4 bytes
            return True
        if re.match(r'^[0-9A-F]{14}$', text):  # 7 bytes
            return True
        if re.match(r'^[0-9A-F]{20}$', text):  # 10 bytes
            return True
        return False
    
    def type_text(self, text):
        """Type text into the currently focused field"""
        try:
            # Clear the field first (Ctrl+A, then type)
            keyboard.send('ctrl+a')
            time.sleep(0.1)
            keyboard.write(text)
            print(f"⌨️  Typed: {text}")
            
            # Optional: Press Tab to move to next field
            # keyboard.send('tab')
            
        except Exception as e:
            print(f"❌ Typing error: {e}")
    
    def start(self):
        """Start the RFID typer"""
        print("=" * 50)
        print("CLIRDEC USB RFID Typer")
        print("=" * 50)
        
        # Find and connect to ESP32
        self.serial_port = self.find_esp32_port()
        if not self.serial_port:
            input("Press Enter to exit...")
            return
        
        print("\n📋 Instructions:")
        print("1. Open student form in web browser")
        print("2. Click in the RFID Card ID field")
        print("3. Tap RFID card on reader")
        print("4. UID will be automatically typed")
        print("\nPress Ctrl+C to stop")
        print("=" * 50)
        
        self.is_running = True
        
        try:
            while self.is_running:
                if self.serial_port.in_waiting > 0:
                    line = self.serial_port.readline().decode('utf-8', errors='ignore').strip()
                    
                    if line:
                        print(f"📨 Received: {line}")
                        
                        # Check if this line contains an RFID UID
                        if self.is_valid_rfid_uid(line):
                            print(f"📱 Valid RFID UID detected: {line}")
                            
                            # Type the UID into the current field
                            self.type_text(line)
                            
                            print("✅ UID entered successfully!")
                            print("🔄 Ready for next card...")
                            print("-" * 30)
                
                time.sleep(0.1)
                
        except KeyboardInterrupt:
            print("\n🛑 Stopping RFID typer...")
            
        finally:
            if self.serial_port:
                self.serial_port.close()
            print("👋 RFID typer stopped")

def main():
    try:
        typer = RFIDTyper()
        typer.start()
    except Exception as e:
        print(f"❌ Error: {e}")
        input("Press Enter to exit...")

if __name__ == "__main__":
    main()