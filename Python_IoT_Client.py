#!/usr/bin/env python3
"""
CLIRDEC: PRESENCE - Python IoT Client
Alternative hardware solution for testing server connectivity
Works with Raspberry Pi, PC, or any system with GPIO/Serial access
"""

from websocket._app import WebSocketApp
import json
import time
import threading
import uuid
import sys

# Configuration
WEBSOCKET_URL = "wss://80c100b5-06da-459f-a3df-355da67989d9-00-311s6g7ren528.sisko.replit.dev/iot"
DEVICE_ID = f"PYTHON_CLIENT_{uuid.uuid4().hex[:8].upper()}"

class CLIRDECClient:
    def __init__(self):
        self.ws = None
        self.connected = False
        self.device_registered = False
        
    def on_open(self, ws):
        print("✅ WebSocket Connected to CLIRDEC server")
        self.connected = True
        self.register_device()
        
    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            print(f"📨 Received: {data.get('type', 'unknown')}")
            
            if data.get('type') == 'welcome':
                print(f"✅ Welcome: {data.get('message')}")
                
            elif data.get('type') == 'registration_success':
                print(f"✅ Device registered successfully!")
                print(f"Assigned to classroom: {data.get('classroomName', 'Unknown')}")
                self.device_registered = True
                
            elif data.get('type') == 'scan_result':
                status = data.get('status')
                student_name = data.get('studentName', 'Unknown')
                print(f"📱 RFID Scan Result: {status} - {student_name}")
                
            elif data.get('type') == 'error':
                print(f"❌ Server Error: {data.get('message')}")
                
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON received: {message}")
            
    def on_error(self, ws, error):
        print(f"❌ WebSocket Error: {error}")
        
    def on_close(self, ws, close_status_code, close_msg):
        print("⚠️ WebSocket Disconnected")
        self.connected = False
        self.device_registered = False
        
    def register_device(self):
        registration_data = {
            "type": "device_register",
            "deviceId": DEVICE_ID,
            "deviceType": "python_client",
            "ipAddress": "127.0.0.1",
            "macAddress": "00:00:00:00:00:00",
            "capabilities": ["rfid_scan", "presence_detection", "test_mode"],
            "currentMode": "test"
        }
        
        self.send_message(registration_data)
        print(f"📱 Device registration sent: {DEVICE_ID}")
        
    def send_message(self, data):
        if self.ws and self.connected:
            try:
                message = json.dumps(data)
                self.ws.send(message)
                return True
            except Exception as e:
                print(f"❌ Failed to send message: {e}")
                return False
        return False
        
    def simulate_rfid_scan(self, card_id):
        if not self.device_registered:
            print("⚠️ Device not registered yet")
            return
            
        scan_data = {
            "type": "rfid_scan",
            "deviceId": DEVICE_ID,
            "rfidCardId": card_id,
            "timestamp": int(time.time() * 1000),
            "presenceDetected": True
        }
        
        if self.send_message(scan_data):
            print(f"📤 RFID scan sent: {card_id}")
        else:
            print(f"❌ Failed to send RFID scan")
            
    def simulate_presence_detection(self, detected):
        if not self.device_registered:
            return
            
        presence_data = {
            "type": "presence_detected",
            "deviceId": DEVICE_ID,
            "presenceDetected": detected,
            "timestamp": int(time.time() * 1000)
        }
        
        self.send_message(presence_data)
        print(f"👁️ Presence {'detected' if detected else 'cleared'}")
        
    def send_heartbeat(self):
        while self.connected:
            if self.device_registered:
                heartbeat_data = {
                    "type": "heartbeat",
                    "deviceId": DEVICE_ID,
                    "timestamp": int(time.time() * 1000),
                    "mode": "test"
                }
                self.send_message(heartbeat_data)
            time.sleep(30)  # Send heartbeat every 30 seconds
            
    def connect(self):
        print("🚀 CLIRDEC Python Client Starting...")
        print(f"Device ID: {DEVICE_ID}")
        print(f"Server: {WEBSOCKET_URL}")
        
        self.ws = WebSocketApp(
            WEBSOCKET_URL,
            on_open=self.on_open,
            on_message=self.on_message,
            on_error=self.on_error,
            on_close=self.on_close
        )
        
        # Start heartbeat thread
        heartbeat_thread = threading.Thread(target=self.send_heartbeat, daemon=True)
        heartbeat_thread.start()
        
        # Start WebSocket connection
        self.ws.run_forever()
        
    def interactive_mode(self):
        print("\n" + "="*50)
        print("CLIRDEC Interactive Test Mode")
        print("="*50)
        print("Commands:")
        print("  scan <card_id>     - Simulate RFID scan")
        print("  motion on/off      - Simulate motion detection")
        print("  status             - Show connection status")
        print("  test               - Send test RFID cards")
        print("  quit               - Exit")
        print("="*50)
        
        while True:
            try:
                cmd = input("\nCLIRDEC> ").strip().lower()
                
                if cmd == "quit":
                    break
                elif cmd == "status":
                    print(f"Connected: {self.connected}")
                    print(f"Registered: {self.device_registered}")
                elif cmd == "test":
                    # Test with sample RFID cards
                    test_cards = ["AD0B8570", "12345678", "ABCDEF01"]
                    for card in test_cards:
                        print(f"Testing card: {card}")
                        self.simulate_rfid_scan(card)
                        time.sleep(1)
                elif cmd.startswith("scan "):
                    card_id = cmd.split(" ", 1)[1].upper()
                    self.simulate_rfid_scan(card_id)
                elif cmd == "motion on":
                    self.simulate_presence_detection(True)
                elif cmd == "motion off":
                    self.simulate_presence_detection(False)
                else:
                    print("Unknown command. Type 'quit' to exit.")
                    
            except KeyboardInterrupt:
                break
                
        if self.ws:
            self.ws.close()

def main():
    client = CLIRDECClient()
    
    # Start connection in background thread
    connection_thread = threading.Thread(target=client.connect, daemon=True)
    connection_thread.start()
    
    # Wait for connection
    print("Waiting for connection...")
    time.sleep(3)
    
    if client.connected:
        print("✅ Connected! Starting interactive mode...")
        client.interactive_mode()
    else:
        print("❌ Failed to connect to server")
        print("Check:")
        print("1. Internet connection")
        print("2. Server URL is correct")
        print("3. Server is running")

if __name__ == "__main__":
    main()