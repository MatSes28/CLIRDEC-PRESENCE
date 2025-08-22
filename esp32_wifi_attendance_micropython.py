"""
ESP32 WiFi RFID Attendance System - MicroPython Version
Connects to WiFi and communicates with CLIRDEC system for real-time attendance

Hardware: ESP32 + RC522 RFID Module + PIR Sensor (optional)
Pin Connections:
- RC522 VCC -> 3.3V (NOT 5V!)
- RC522 RST -> GPIO 22
- RC522 GND -> GND
- RC522 MISO -> GPIO 19
- RC522 MOSI -> GPIO 23
- RC522 SCK -> GPIO 18
- RC522 SDA -> GPIO 5
- PIR OUT -> GPIO 4 (optional)
- LED -> GPIO 2 (built-in)

Features:
- Automatic WiFi connection
- WebSocket communication with CLIRDEC server
- Real-time attendance tracking
- Device registration and heartbeat
- Motion detection (if PIR connected)
"""

import network
import socket
import time
import json
import ubinascii
import machine
from machine import Pin, SPI
import urequests as requests
import websocket
import _thread

# Configuration - UPDATE THESE VALUES
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"
SERVER_HOST = "80c100b5-06da-459f-a3df-355da67989d9-00-311s6g7ren528.sisko.replit.dev"
WS_PATH = "/iot"

class MFRC522:
    """MFRC522 RFID reader driver for MicroPython"""
    
    def __init__(self, spi, cs_pin, rst_pin):
        self.spi = spi
        self.cs = Pin(cs_pin, Pin.OUT)
        self.rst = Pin(rst_pin, Pin.OUT)
        self.init()
    
    def _wreg(self, reg, val):
        self.cs.off()
        self.spi.write(bytes([(reg << 1) & 0x7E, val]))
        self.cs.on()
    
    def _rreg(self, reg):
        self.cs.off()
        self.spi.write(bytes([((reg << 1) & 0x7E) | 0x80]))
        val = self.spi.read(1)
        self.cs.on()
        return val[0]
    
    def init(self):
        self.rst.off()
        time.sleep_ms(50)
        self.rst.on()
        time.sleep_ms(50)
        
        # Configure MFRC522
        self._wreg(0x2A, 0x8D)  # TModeReg
        self._wreg(0x2B, 0x3E)  # TPrescalerReg
        self._wreg(0x2D, 30)    # TReloadRegL
        self._wreg(0x2C, 0)     # TReloadRegH
        self._wreg(0x15, 0x40)  # TxASKReg
        self._wreg(0x11, 0x3D)  # ModeReg
        
        # Turn on antenna
        current = self._rreg(0x14)  # TxControlReg
        if not (current & 0x03):
            self._wreg(0x14, current | 0x03)
    
    def is_card(self):
        self._wreg(0x0D, 0x07)  # BitFramingReg
        (status, recv, bits) = self._card_write(0x26, [])
        return status == 0 and bits == 0x10
    
    def read_card(self):
        (status, recv, bits) = self._card_write(0x93, [0x20])
        if status == 0:
            return recv[:4]
        return None
    
    def _card_write(self, command, send_data):
        recv = []
        bits = irq_en = wait_irq = 0
        
        if command == 0x0E:
            irq_en = 0x12
            wait_irq = 0x10
        elif command == 0x0C or command == 0x93:
            irq_en = 0x77
            wait_irq = 0x30
        elif command == 0x26:
            irq_en = 0x12
            wait_irq = 0x10
        
        self._wreg(0x02, irq_en | 0x80)  # ComIEnReg
        self._wreg(0x04, 0x7F)           # ComIrqReg
        self._wreg(0x0A, 0x80)           # FIFOLevelReg
        
        for data in send_data:
            self._wreg(0x09, data)       # FIFODataReg
        self._wreg(0x01, command)        # CommandReg
        
        if command == 0x0C or command == 0x93:
            self._wreg(0x0D, 0x80)       # BitFramingReg
        
        # Wait for completion
        i = 2000
        while True:
            n = self._rreg(0x04)         # ComIrqReg
            i -= 1
            if not ((i != 0) and not (n & 0x01) and not (n & wait_irq)):
                break
        
        self._wreg(0x0D, 0x00)           # BitFramingReg
        
        if i != 0:
            if (self._rreg(0x06) & 0x1B) == 0x00:  # ErrorReg
                status = 0
                if n & irq_en & 0x01:
                    status = 2
                
                if command == 0x0C or command == 0x93:
                    n = self._rreg(0x0A)     # FIFOLevelReg
                    lbits = self._rreg(0x0C) & 0x07  # ControlReg
                    if lbits != 0:
                        bits = (n - 1) * 8 + lbits
                    else:
                        bits = n * 8
                    
                    if n == 0:
                        n = 1
                    if n > 16:
                        n = 16
                    
                    for _ in range(n):
                        recv.append(self._rreg(0x09))  # FIFODataReg
            else:
                status = 1
        else:
            status = 1
        
        return (status, recv, bits)

class CLIRDECAttendance:
    def __init__(self):
        self.device_id = "ESP32_" + ubinascii.hexlify(machine.unique_id()).decode().upper()
        self.led = Pin(2, Pin.OUT)
        self.pir = Pin(4, Pin.IN)
        self.ws = None
        self.connected = False
        self.last_heartbeat = 0
        self.last_rfid_time = 0
        self.last_uid = ""
        
        # Initialize RFID
        spi = SPI(1, baudrate=1000000, polarity=0, phase=0,
                  sck=Pin(18), mosi=Pin(23), miso=Pin(19))
        self.rfid = MFRC522(spi, cs_pin=5, rst_pin=22)
        
        print("=" * 50)
        print("CLIRDEC WiFi Attendance System")
        print("=" * 50)
        print(f"Device ID: {self.device_id}")
    
    def connect_wifi(self):
        """Connect to WiFi network"""
        wlan = network.WLAN(network.STA_IF)
        wlan.active(True)
        
        if not wlan.isconnected():
            print(f"Connecting to WiFi: {WIFI_SSID}")
            wlan.connect(WIFI_SSID, WIFI_PASSWORD)
            
            attempts = 0
            while not wlan.isconnected() and attempts < 20:
                print(".", end="")
                time.sleep(1)
                attempts += 1
            
            if wlan.isconnected():
                print(f"\nWiFi connected!")
                print(f"IP address: {wlan.ifconfig()[0]}")
                return True
            else:
                print(f"\nWiFi connection failed")
                return False
        return True
    
    def blink_led(self, times, delay_ms=100):
        """Blink LED for status indication"""
        for _ in range(times):
            self.led.on()
            time.sleep_ms(delay_ms)
            self.led.off()
            time.sleep_ms(delay_ms)
    
    def connect_websocket(self):
        """Connect to WebSocket server"""
        try:
            ws_url = f"wss://{SERVER_HOST}{WS_PATH}"
            print(f"Connecting to WebSocket: {ws_url}")
            
            self.ws = websocket.websocket()
            self.ws.connect(ws_url)
            self.connected = True
            
            print("WebSocket connected!")
            self.register_device()
            self.blink_led(3, 200)
            return True
            
        except Exception as e:
            print(f"WebSocket connection failed: {e}")
            self.connected = False
            return False
    
    def register_device(self):
        """Register device with server"""
        if not self.connected:
            return
            
        try:
            wlan = network.WLAN(network.STA_IF)
            mac = ubinascii.hexlify(wlan.config('mac')).decode()
            ip = wlan.ifconfig()[0]
            
            registration = {
                "type": "device_register",
                "deviceId": self.device_id,
                "deviceType": "esp32",
                "ipAddress": ip,
                "macAddress": mac,
                "capabilities": ["rfid_scan", "presence_detection"],
                "currentMode": "wifi"
            }
            
            self.ws.send(json.dumps(registration))
            print("Device registration sent")
            
        except Exception as e:
            print(f"Registration failed: {e}")
    
    def send_heartbeat(self):
        """Send periodic heartbeat to server"""
        current_time = time.ticks_ms()
        
        if time.ticks_diff(current_time, self.last_heartbeat) < 30000:  # 30 seconds
            return
            
        if not self.connected:
            return
            
        try:
            heartbeat = {
                "type": "heartbeat",
                "deviceId": self.device_id,
                "timestamp": current_time,
                "mode": "wifi",
                "freeHeap": machine.mem_free(),
                "presenceDetected": self.pir.value()
            }
            
            self.ws.send(json.dumps(heartbeat))
            self.last_heartbeat = current_time
            
        except Exception as e:
            print(f"Heartbeat failed: {e}")
            self.connected = False
    
    def check_rfid(self):
        """Check for RFID card and send to server"""
        current_time = time.ticks_ms()
        
        # Prevent rapid reads
        if time.ticks_diff(current_time, self.last_rfid_time) < 2000:
            return False
            
        if not self.rfid.is_card():
            return False
            
        uid_bytes = self.rfid.read_card()
        if not uid_bytes:
            return False
            
        uid = ubinascii.hexlify(bytearray(uid_bytes)).decode().upper()
        
        # Skip duplicate reads
        if uid == self.last_uid and time.ticks_diff(current_time, self.last_rfid_time) < 5000:
            return False
            
        self.last_uid = uid
        self.last_rfid_time = current_time
        
        print(f"RFID Card: {uid}")
        
        if self.connected:
            self.send_rfid_scan(uid)
        
        self.blink_led(2, 100)
        return True
    
    def send_rfid_scan(self, uid):
        """Send RFID scan to server"""
        try:
            scan_data = {
                "type": "rfid_scan",
                "deviceId": self.device_id,
                "rfidCardId": uid,
                "timestamp": time.ticks_ms(),
                "presenceDetected": self.pir.value()
            }
            
            self.ws.send(json.dumps(scan_data))
            print(f"RFID scan sent: {uid}")
            
        except Exception as e:
            print(f"Failed to send RFID scan: {e}")
            self.connected = False
    
    def handle_message(self, message):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(message)
            msg_type = data.get("type", "")
            
            if msg_type == "welcome":
                print(f"Server welcome: {data.get('message', '')}")
                
            elif msg_type == "registration_success":
                print("Device registered successfully!")
                classroom = data.get("classroomName", "")
                if classroom:
                    print(f"Assigned to classroom: {classroom}")
                self.blink_led(3, 200)
                
            elif msg_type == "scan_result":
                status = data.get("status", "")
                student_name = data.get("studentName", "")
                print(f"Scan result: {status} - {student_name}")
                
                if status == "checked_in":
                    self.blink_led(2, 100)
                else:
                    self.blink_led(5, 50)
                    
            elif msg_type == "error":
                print(f"Server error: {data.get('message', '')}")
                
        except Exception as e:
            print(f"Message handling error: {e}")
    
    def run(self):
        """Main program loop"""
        print("Initializing...")
        
        # Test RFID
        try:
            if self.rfid.is_card():
                print("RFID reader test: PASSED")
            else:
                print("RFID reader ready")
            self.blink_led(3, 300)
        except:
            print("RFID reader test: FAILED - Check wiring")
            self.blink_led(5, 100)
            return
        
        # Connect to WiFi
        if not self.connect_wifi():
            print("WiFi connection required. Check credentials.")
            return
        
        # Connect to WebSocket
        reconnect_attempts = 0
        max_reconnect = 5
        
        while True:
            try:
                if not self.connected:
                    if reconnect_attempts < max_reconnect:
                        if self.connect_websocket():
                            reconnect_attempts = 0
                        else:
                            reconnect_attempts += 1
                            time.sleep(5)
                            continue
                    else:
                        print("Max reconnection attempts reached")
                        time.sleep(30)
                        reconnect_attempts = 0
                        continue
                
                # Check for RFID cards
                self.check_rfid()
                
                # Send heartbeat
                self.send_heartbeat()
                
                # Check for incoming messages
                try:
                    message = self.ws.recv()
                    if message:
                        self.handle_message(message)
                except:
                    pass  # No message available
                
                time.sleep_ms(100)
                
            except KeyboardInterrupt:
                print("\nStopping...")
                break
            except Exception as e:
                print(f"Main loop error: {e}")
                self.connected = False
                time.sleep(1)
        
        # Cleanup
        if self.ws:
            self.ws.close()
        print("System stopped")

# Start the system
if __name__ == "__main__":
    system = CLIRDECAttendance()
    system.run()