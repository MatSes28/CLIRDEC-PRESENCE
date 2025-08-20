#!/usr/bin/env python3
"""
Simple test script to debug IoT device connection to CLIRDEC server
"""

import socket
import ssl
import json
import base64
import hashlib
import uuid
import time

# Configuration
HOST = "80c100b5-06da-459f-a3df-355da67989d9-00-311s6g7ren528.sisko.replit.dev"
PORT = 443
PATH = "/iot"
DEVICE_ID = f"TEST_CLIENT_{uuid.uuid4().hex[:8].upper()}"

def create_websocket_key():
    """Generate a WebSocket key"""
    return base64.b64encode(uuid.uuid4().bytes).decode().strip()

def send_websocket_frame(sock, data):
    """Send a WebSocket frame"""
    payload = json.dumps(data).encode('utf-8')
    frame = bytearray()
    frame.append(0x81)  # Text frame, final
    
    if len(payload) < 126:
        frame.append(len(payload))
    else:
        frame.append(126)
        frame.extend(len(payload).to_bytes(2, 'big'))
    
    frame.extend(payload)
    sock.send(frame)

def test_connection():
    print(f"🔍 Testing IoT connection to CLIRDEC server...")
    print(f"Host: {HOST}")
    print(f"Device ID: {DEVICE_ID}")
    
    try:
        # Create socket and SSL context
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        context = ssl.create_default_context()
        
        # Connect
        print("🔌 Connecting to server...")
        ssl_sock = context.wrap_socket(sock, server_hostname=HOST)
        ssl_sock.connect((HOST, PORT))
        
        # Send WebSocket handshake
        key = create_websocket_key()
        handshake = f"""GET {PATH} HTTP/1.1\r
Host: {HOST}\r
Upgrade: websocket\r
Connection: Upgrade\r
Sec-WebSocket-Key: {key}\r
Sec-WebSocket-Version: 13\r
\r
"""
        print("🤝 Sending WebSocket handshake...")
        ssl_sock.send(handshake.encode())
        
        # Read handshake response
        response = ssl_sock.recv(1024).decode()
        print("📨 Handshake response received:")
        print(response)
        
        if "101 Switching Protocols" in response:
            print("✅ WebSocket handshake successful!")
            
            # Send device registration
            registration_data = {
                "type": "device_register",
                "deviceId": DEVICE_ID,
                "deviceType": "test_client",
                "ipAddress": "127.0.0.1",
                "macAddress": "00:00:00:00:00:00",
                "capabilities": ["rfid_scan", "test_mode"],
                "currentMode": "test"
            }
            
            print(f"📱 Sending device registration...")
            send_websocket_frame(ssl_sock, registration_data)
            
            # Wait for response
            print("⏳ Waiting for server response...")
            time.sleep(3)
            
            # Try to read multiple response frames
            response_count = 0
            while response_count < 3:
                try:
                    data = ssl_sock.recv(1024)
                    if data:
                        response_count += 1
                        print(f"📨 Response {response_count}: {len(data)} bytes")
                        # Simple frame parsing (just for text frames)
                        if len(data) > 2:
                            payload_len = data[1] & 0x7F
                            if payload_len < 126:
                                payload = data[2:2+payload_len]
                                try:
                                    message = json.loads(payload.decode('utf-8'))
                                    print(f"✅ Server message: {message}")
                                    if message.get('type') == 'registration_success':
                                        print(f"🎉 Device registered successfully!")
                                        print(f"Assigned to classroom: {message.get('classroomName', 'Unknown')}")
                                except:
                                    print(f"📨 Raw payload: {payload}")
                    else:
                        break
                    time.sleep(0.5)
                except Exception as e:
                    print(f"❌ Error reading response {response_count + 1}: {e}")
                    break
        else:
            print("❌ WebSocket handshake failed!")
        
        ssl_sock.close()
        
    except Exception as e:
        print(f"❌ Connection error: {e}")

if __name__ == "__main__":
    test_connection()