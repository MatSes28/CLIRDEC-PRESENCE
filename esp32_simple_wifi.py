"""
Simple ESP32 WiFi RFID Reader - MicroPython
Reliable version with minimal dependencies

Hardware: ESP32 + RC522 RFID Module
Pin Connections:
- VCC -> 3.3V (NOT 5V!)
- RST -> GPIO 22
- GND -> GND
- MISO -> GPIO 19
- MOSI -> GPIO 23
- SCK -> GPIO 18
- SDA -> GPIO 5
"""

import network
import time
import json
import ubinascii
import machine
from machine import Pin, SPI
import socket

# Configuration
WIFI_SSID = "Kupal kaba boss?"
WIFI_PASSWORD = "MatMir@12030908"
SERVER_HOST = "80c100b5-06da-459f-a3df-355da67989d9-00-311s6g7ren528.sisko.replit.dev"
SERVER_PORT = 80


class SimpleRFID:
    """Simplified RFID reader"""

    def __init__(self):
        self.spi = SPI(1,
                       baudrate=1000000,
                       polarity=0,
                       phase=0,
                       sck=Pin(18),
                       mosi=Pin(23),
                       miso=Pin(19))
        self.cs = Pin(5, Pin.OUT)
        self.rst = Pin(22, Pin.OUT)
        self.led = Pin(2, Pin.OUT)
        self.init_rfid()

    def init_rfid(self):
        """Initialize RFID module"""
        self.rst.off()
        time.sleep_ms(50)
        self.rst.on()
        time.sleep_ms(50)

        # Basic MFRC522 initialization
        self._write_reg(0x2A, 0x8D)  # Timer mode
        self._write_reg(0x2B, 0x3E)  # Timer prescaler
        self._write_reg(0x2D, 30)  # Timer reload low
        self._write_reg(0x2C, 0)  # Timer reload high
        self._write_reg(0x15, 0x40)  # TX ASK
        self._write_reg(0x11, 0x3D)  # Mode

        # Turn on antenna
        val = self._read_reg(0x14)
        if not (val & 0x03):
            self._write_reg(0x14, val | 0x03)

    def _write_reg(self, reg, val):
        """Write to MFRC522 register"""
        self.cs.off()
        self.spi.write(bytes([(reg << 1) & 0x7E, val]))
        self.cs.on()

    def _read_reg(self, reg):
        """Read from MFRC522 register"""
        self.cs.off()
        self.spi.write(bytes([((reg << 1) & 0x7E) | 0x80]))
        val = self.spi.read(1)
        self.cs.on()
        return val[0]

    def read_card(self):
        """Simple card reading"""
        # Request card
        self._write_reg(0x0D, 0x07)  # Bit framing

        # Send REQA command
        self.cs.off()
        self.spi.write(bytes([0x26]))  # REQA
        response = self.spi.read(2)
        self.cs.on()

        # If card responds, try to read UID
        if len(response) == 2:
            # Anti-collision
            self._write_reg(0x0D, 0x00)
            self.cs.off()
            self.spi.write(bytes([0x93, 0x20]))
            uid_data = self.spi.read(5)
            self.cs.on()

            if len(uid_data) >= 4:
                return ubinascii.hexlify(uid_data[:4]).decode().upper()

        return None

    def blink(self, times=2):
        """Blink LED"""
        for _ in range(times):
            self.led.on()
            time.sleep_ms(100)
            self.led.off()
            time.sleep_ms(100)


def connect_wifi():
    """Connect to WiFi"""
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)

    if not wlan.isconnected():
        print(f"Connecting to {WIFI_SSID}...")
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)

        timeout = 20
        while not wlan.isconnected() and timeout > 0:
            print(".", end="")
            time.sleep(1)
            timeout -= 1

        if wlan.isconnected():
            print(f"\nConnected! IP: {wlan.ifconfig()[0]}")
            return True
        else:
            print("\nWiFi connection failed")
            return False

    print(f"Already connected: {wlan.ifconfig()[0]}")
    return True


def send_attendance(uid):
    """Send attendance data to server"""
    try:
        # Create HTTP request
        device_id = ubinascii.hexlify(machine.unique_id()).decode()

        data = {
            "type": "rfid_scan",
            "deviceId": f"ESP32_{device_id}",
            "rfidCardId": uid,
            "timestamp": time.ticks_ms()
        }

        json_data = json.dumps(data)

        # HTTP POST request
        request = f"""POST /api/iot/rfid-scan HTTP/1.1\r
Host: {SERVER_HOST}\r
Content-Type: application/json\r
Content-Length: {len(json_data)}\r
Connection: close\r
\r
{json_data}"""

        # Send to server
        addr = socket.getaddrinfo(SERVER_HOST, SERVER_PORT)[0][-1]
        s = socket.socket()
        s.settimeout(10)
        s.connect(addr)
        s.send(request.encode())

        response = s.recv(1024).decode()
        s.close()

        if "200 OK" in response:
            print(f"✅ Attendance sent: {uid}")
            return True
        else:
            print(f"❌ Server error: {response[:100]}")
            return False

    except Exception as e:
        print(f"❌ Send failed: {e}")
        return False


def main():
    """Main program"""
    print("=" * 40)
    print("CLIRDEC Simple WiFi RFID")
    print("=" * 40)

    # Initialize RFID
    rfid = SimpleRFID()
    print("RFID reader initialized")
    rfid.blink(3)

    # Connect WiFi
    if not connect_wifi():
        print("WiFi required - check credentials")
        return

    rfid.blink(2)
    print("System ready!")

    last_uid = ""
    last_time = 0

    while True:
        try:
            # Check for card
            uid = rfid.read_card()

            if uid and uid != last_uid:
                current_time = time.ticks_ms()

                # Prevent duplicate reads
                if time.ticks_diff(current_time, last_time) > 2000:
                    print(f"Card: {uid}")

                    # Send to server
                    if send_attendance(uid):
                        rfid.blink(2)
                    else:
                        rfid.blink(5)

                    last_uid = uid
                    last_time = current_time

            time.sleep_ms(500)

        except KeyboardInterrupt:
            print("\nStopping...")
            break
        except Exception as e:
            print(f"Error: {e}")
            time.sleep(1)


if __name__ == "__main__":
    main()
