#!/usr/bin/env python3
"""
Automatic RFID Service for CLIRDEC
Runs in the background and automatically types RFID UIDs when cards are tapped
Only activates when browser is on student registration pages

Requirements:
pip install pyserial keyboard psutil requests

Usage:
1. Install as Windows Service: python auto_rfid_service.py --install
2. Or run manually: python auto_rfid_service.py
"""

import serial
import keyboard
import time
import threading
import psutil
import re
import sys
import argparse
import logging
from datetime import datetime
import serial.tools.list_ports
import requests
import json
import os

class AutoRFIDService:
    def __init__(self):
        self.is_running = False
        self.serial_port = None
        self.last_uid = ""
        self.last_uid_time = 0
        self.uid_cooldown = 2.0  # seconds
        
        # Setup logging
        self.setup_logging()
        
        # Browser detection
        self.target_urls = [
            'localhost:5000',
            '127.0.0.1:5000', 
            'clirdec',
            'student',
            'registration'
        ]
        
        self.logger.info("CLIRDEC Auto RFID Service initialized")
    
    def setup_logging(self):
        """Setup logging to file and console"""
        log_dir = os.path.expanduser("~/Documents/CLIRDEC_Logs")
        os.makedirs(log_dir, exist_ok=True)
        
        log_file = os.path.join(log_dir, f"rfid_service_{datetime.now().strftime('%Y%m%d')}.log")
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        self.logger = logging.getLogger('CLIRDEC_RFID')
    
    def find_esp32_port(self):
        """Auto-detect ESP32 COM port"""
        self.logger.info("🔍 Searching for ESP32 device...")
        ports = serial.tools.list_ports.comports()
        
        esp32_identifiers = ['esp32', 'cp210x', 'ch340', 'usb serial', 'silicon labs', 'uart']
        
        for port in ports:
            desc = port.description.lower()
            if any(identifier in desc for identifier in esp32_identifiers):
                try:
                    # Test connection
                    test_serial = serial.Serial(port.device, 9600, timeout=1)
                    test_serial.close()
                    self.logger.info(f"✅ Found ESP32 at {port.device}: {port.description}")
                    return port.device
                except Exception as e:
                    self.logger.debug(f"❌ Failed to connect to {port.device}: {e}")
                    continue
        
        self.logger.warning("⚠️ No ESP32 device found")
        return None
    
    def connect_to_esp32(self):
        """Connect to ESP32 with retry logic"""
        max_retries = 5
        retry_count = 0
        
        while retry_count < max_retries and self.is_running:
            port = self.find_esp32_port()
            if not port:
                retry_count += 1
                self.logger.warning(f"Retry {retry_count}/{max_retries} - No ESP32 found")
                time.sleep(5)
                continue
            
            try:
                self.serial_port = serial.Serial(port, 9600, timeout=1)
                self.logger.info(f"🔗 Connected to ESP32 on {port}")
                return True
                
            except Exception as e:
                retry_count += 1
                self.logger.error(f"❌ Connection failed: {e}")
                time.sleep(5)
        
        self.logger.error("❌ Failed to connect to ESP32 after retries")
        return False
    
    def is_browser_on_registration_page(self):
        """Check if any browser is on a student registration page"""
        try:
            # Get all running processes
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    name = proc.info['name'].lower()
                    if any(browser in name for browser in ['chrome', 'firefox', 'edge', 'brave']):
                        cmdline = ' '.join(proc.info['cmdline']).lower()
                        if any(url in cmdline for url in self.target_urls):
                            return True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            self.logger.debug(f"Browser detection error: {e}")
        
        return False
    
    def is_valid_rfid_uid(self, text):
        """Check if text looks like a valid RFID UID"""
        text = text.strip().upper()
        # RFID UIDs: 4, 7, or 10 bytes (8, 14, or 20 hex chars)
        if re.match(r'^[0-9A-F]{8}$', text):  # 4 bytes
            return True
        if re.match(r'^[0-9A-F]{14}$', text):  # 7 bytes  
            return True
        if re.match(r'^[0-9A-F]{20}$', text):  # 10 bytes
            return True
        if len(text) >= 6 and len(text) <= 20 and re.match(r'^[0-9A-F]+$', text):
            return True
        return False
    
    def should_type_uid(self, uid):
        """Check if we should type this UID (prevent duplicates)"""
        current_time = time.time()
        
        # Same UID within cooldown period
        if uid == self.last_uid and (current_time - self.last_uid_time) < self.uid_cooldown:
            return False
        
        self.last_uid = uid
        self.last_uid_time = current_time
        return True
    
    def type_rfid_uid(self, uid):
        """Type RFID UID into the active field"""
        try:
            # Small delay to ensure focus
            time.sleep(0.1)
            
            # Clear field and type UID
            keyboard.send('ctrl+a')
            time.sleep(0.05)
            keyboard.write(uid.upper())
            
            self.logger.info(f"⌨️ Typed UID: {uid}")
            
            # Optional: Send notification to system
            self.send_notification(f"RFID Card Scanned: {uid}")
            
        except Exception as e:
            self.logger.error(f"❌ Typing error: {e}")
    
    def send_notification(self, message):
        """Send notification to system (Windows toast or system tray)"""
        try:
            # Try to send Windows 10+ toast notification
            if sys.platform == "win32":
                import win10toast
                toaster = win10toast.ToastNotifier()
                toaster.show_toast("CLIRDEC RFID", message, duration=2)
        except ImportError:
            # Fallback to console notification
            self.logger.info(f"📢 {message}")
    
    def monitor_rfid(self):
        """Main RFID monitoring loop"""
        self.logger.info("🚀 Starting RFID monitoring...")
        
        while self.is_running:
            try:
                if not self.serial_port or not self.serial_port.is_open:
                    if not self.connect_to_esp32():
                        time.sleep(10)
                        continue
                
                # Check if data is available
                if self.serial_port and self.serial_port.in_waiting > 0:
                    line = self.serial_port.readline().decode('utf-8', errors='ignore').strip()
                    
                    if line:
                        self.logger.debug(f"📨 Received: {line}")
                        
                        # Check if it's a valid RFID UID
                        if self.is_valid_rfid_uid(line):
                            if not self.should_type_uid(line):
                                continue
                            
                            self.logger.info(f"📱 Valid RFID detected: {line}")
                            
                            # Check if browser is on registration page
                            if self.is_browser_on_registration_page():
                                self.type_rfid_uid(line)
                            else:
                                self.logger.info("⏸️ Browser not on registration page - skipping auto-type")
                
                time.sleep(0.1)
                
            except serial.SerialException as e:
                self.logger.error(f"❌ Serial error: {e}")
                self.serial_port = None
                time.sleep(5)
                
            except Exception as e:
                self.logger.error(f"❌ Monitoring error: {e}")
                time.sleep(1)
    
    def start(self):
        """Start the RFID service"""
        self.logger.info("="*60)
        self.logger.info("🚀 CLIRDEC Auto RFID Service Starting...")
        self.logger.info("="*60)
        
        self.is_running = True
        
        # Start monitoring in separate thread
        monitor_thread = threading.Thread(target=self.monitor_rfid, daemon=True)
        monitor_thread.start()
        
        self.logger.info("✅ Service started successfully")
        self.logger.info("📋 Instructions:")
        self.logger.info("1. Open student registration form in browser")
        self.logger.info("2. Click in RFID Card ID field") 
        self.logger.info("3. Tap RFID card - UID will auto-type")
        self.logger.info("4. Press Ctrl+C to stop service")
        
        try:
            # Keep main thread alive
            while self.is_running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()
    
    def stop(self):
        """Stop the RFID service"""
        self.logger.info("🛑 Stopping RFID service...")
        self.is_running = False
        
        if self.serial_port and self.serial_port.is_open:
            self.serial_port.close()
        
        self.logger.info("👋 RFID service stopped")
    
    def install_as_service(self):
        """Install as Windows service"""
        try:
            if sys.platform == "win32":
                import win32serviceutil
                import win32service
                
                class CLIRDECRFIDService(win32serviceutil.ServiceFramework):
                    _svc_name_ = "CLIRDECRFIDService"
                    _svc_display_name_ = "CLIRDEC Auto RFID Service"
                    _svc_description_ = "Automatically types RFID UIDs for CLIRDEC student registration"
                    
                    def __init__(self, args):
                        win32serviceutil.ServiceFramework.__init__(self, args)
                        self.rfid_service = AutoRFIDService()
                    
                    def SvcStop(self):
                        self.ReportServiceStatus(win32service.SERVICE_STOP_PENDING)
                        self.rfid_service.stop()
                    
                    def SvcDoRun(self):
                        self.rfid_service.start()
                
                win32serviceutil.HandleCommandLine(CLIRDECRFIDService)
            else:
                self.logger.error("Service installation only supported on Windows")
                
        except ImportError:
            self.logger.error("Windows service modules not available")
            self.logger.error("Install with: pip install pywin32")

def main():
    parser = argparse.ArgumentParser(description='CLIRDEC Auto RFID Service')
    parser.add_argument('--install', action='store_true', help='Install as Windows service')
    parser.add_argument('--debug', action='store_true', help='Enable debug logging')
    
    args = parser.parse_args()
    
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
    
    service = AutoRFIDService()
    
    if args.install:
        service.install_as_service()
    else:
        try:
            service.start()
        except KeyboardInterrupt:
            service.stop()

if __name__ == "__main__":
    main()