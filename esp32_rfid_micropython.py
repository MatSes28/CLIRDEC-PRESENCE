"""
ESP32 USB RFID Typer - MicroPython Version
Simple RFID reader that outputs card UIDs via USB serial
Works with Python typer script for automatic form filling

Hardware: ESP32 + RC522 RFID Module
Pin Connections:
- VCC -> 3.3V (NOT 5V!)
- RST -> GPIO 22
- GND -> GND
- MISO -> GPIO 19
- MOSI -> GPIO 23
- SCK -> GPIO 18
- SDA -> GPIO 5

Usage:
1. Flash this code to ESP32 using Thonny or similar
2. Connect ESP32 to computer via USB
3. Run the Python typer script on computer
4. Tap RFID cards to auto-fill student forms
"""

from machine import Pin, SPI
import time
import ubinascii

class MFRC522:
    """Simple MFRC522 RFID reader driver for MicroPython"""
    
    def __init__(self, spi, cs_pin, rst_pin):
        self.spi = spi
        self.cs = Pin(cs_pin, Pin.OUT)
        self.rst = Pin(rst_pin, Pin.OUT)
        
        # MFRC522 registers
        self.CommandReg = 0x01
        self.ComIEnReg = 0x02
        self.DivIEnReg = 0x03
        self.ComIrqReg = 0x04
        self.DivIrqReg = 0x05
        self.ErrorReg = 0x06
        self.Status1Reg = 0x07
        self.Status2Reg = 0x08
        self.FIFODataReg = 0x09
        self.FIFOLevelReg = 0x0A
        self.WaterLevelReg = 0x0B
        self.ControlReg = 0x0C
        self.BitFramingReg = 0x0D
        self.CollReg = 0x0E
        self.ModeReg = 0x11
        self.TxControlReg = 0x14
        self.TxASKReg = 0x15
        self.TxSelReg = 0x16
        self.RxSelReg = 0x17
        self.RxThresholdReg = 0x18
        self.DemodReg = 0x19
        self.MfTxReg = 0x1C
        self.MfRxReg = 0x1D
        self.SerialSpeedReg = 0x1F
        self.CRCResultRegM = 0x21
        self.CRCResultRegL = 0x22
        self.ModWidthReg = 0x24
        self.RFCfgReg = 0x26
        self.GsNReg = 0x27
        self.CWGsPReg = 0x28
        self.ModGsPReg = 0x29
        self.TModeReg = 0x2A
        self.TPrescalerReg = 0x2B
        self.TReloadRegH = 0x2C
        self.TReloadRegL = 0x2D
        self.TCounterValueRegH = 0x2E
        self.TCounterValueRegL = 0x2F
        self.TestSel1Reg = 0x31
        self.TestSel2Reg = 0x32
        self.TestPinEnReg = 0x33
        self.TestPinValueReg = 0x34
        self.TestBusReg = 0x35
        self.AutoTestReg = 0x36
        self.VersionReg = 0x37
        self.AnalogTestReg = 0x38
        self.TestDAC1Reg = 0x39
        self.TestDAC2Reg = 0x3A
        self.TestADCReg = 0x3B
        
        self.init()
    
    def _wreg(self, reg, val):
        """Write to register"""
        self.cs.off()
        self.spi.write(bytes([(reg << 1) & 0x7E, val]))
        self.cs.on()
    
    def _rreg(self, reg):
        """Read from register"""
        self.cs.off()
        self.spi.write(bytes([((reg << 1) & 0x7E) | 0x80]))
        val = self.spi.read(1)
        self.cs.on()
        return val[0]
    
    def init(self):
        """Initialize MFRC522"""
        self.rst.off()
        time.sleep_ms(50)
        self.rst.on()
        time.sleep_ms(50)
        
        self._wreg(self.TModeReg, 0x8D)
        self._wreg(self.TPrescalerReg, 0x3E)
        self._wreg(self.TReloadRegL, 30)
        self._wreg(self.TReloadRegH, 0)
        self._wreg(self.TxASKReg, 0x40)
        self._wreg(self.ModeReg, 0x3D)
        
        # Turn on antenna
        current = self._rreg(self.TxControlReg)
        if not (current & 0x03):
            self._wreg(self.TxControlReg, current | 0x03)
    
    def request(self, mode):
        """Request card"""
        self._wreg(self.BitFramingReg, 0x07)
        
        (status, recv, bits) = self.card_write(mode, [])
        
        if ((status != 0) | (bits != 0x10)):
            status = 2
            
        return (status, bits)
    
    def card_write(self, command, send_data):
        """Write data to card"""
        recv = []
        bits = irq_en = wait_irq = n = 0
        
        if command == 0x0E:
            irq_en = 0x12
            wait_irq = 0x10
        elif command == 0x0C:
            irq_en = 0x77
            wait_irq = 0x30
        
        self._wreg(self.ComIEnReg, irq_en | 0x80)
        self._wreg(self.ComIrqReg, 0x7F)
        self._wreg(self.FIFOLevelReg, 0x80)
        
        for i in send_data:
            self._wreg(self.FIFODataReg, i)
        self._wreg(self.CommandReg, command)
        
        if command == 0x0C:
            self._wreg(self.BitFramingReg, 0x80)
        
        i = 2000
        while True:
            n = self._rreg(self.ComIrqReg)
            i -= 1
            if ~((i != 0) & ~(n & 0x01) & ~(n & wait_irq)):
                break
        
        self._wreg(self.BitFramingReg, 0x00)
        
        if i != 0:
            if (self._rreg(self.ErrorReg) & 0x1B) == 0x00:
                status = 0
                
                if n & irq_en & 0x01:
                    status = 2
                
                if command == 0x0C:
                    n = self._rreg(self.FIFOLevelReg)
                    lbits = self._rreg(self.ControlReg) & 0x07
                    if lbits != 0:
                        bits = (n - 1) * 8 + lbits
                    else:
                        bits = n * 8
                    
                    if n == 0:
                        n = 1
                    if n > 16:
                        n = 16
                    
                    for _ in range(n):
                        recv.append(self._rreg(self.FIFODataReg))
            else:
                status = 1
        
        return (status, recv, bits)
    
    def is_card(self):
        """Check if card is present"""
        (status, bits) = self.request(0x26)
        if status == 0:
            return True
        else:
            return False
    
    def read_card(self):
        """Read card UID"""
        (status, recv, bits) = self.card_write(0x93, [0x20])
        
        if status == 0:
            return recv[:4]  # Return first 4 bytes as UID
        else:
            return None

# Main program
def main():
    print()
    print("=" * 50)
    print("CLIRDEC USB RFID Typer - MicroPython")
    print("=" * 50)
    print("Instructions:")
    print("1. Open student form in browser")
    print("2. Click in RFID Card ID field")
    print("3. Tap RFID card on reader")
    print("4. UID will be typed automatically")
    print("=" * 50)
    
    # Initialize LED
    led = Pin(2, Pin.OUT)
    led.off()
    
    # Initialize SPI for RFID
    spi = SPI(1, baudrate=1000000, polarity=0, phase=0, 
              sck=Pin(18), mosi=Pin(23), miso=Pin(19))
    
    # Initialize RFID reader
    try:
        rfid = MFRC522(spi, cs_pin=5, rst_pin=22)
        print(" RFID Reader initialized successfully")
        
        # Success indication (3 slow blinks)
        for _ in range(3):
            led.on()
            time.sleep_ms(300)
            led.off()
            time.sleep_ms(300)
            
    except Exception as e:
        print(" RFID Reader initialization failed:", e)
        print("Check wiring connections:")
        print("VCC -> 3.3V, RST -> GPIO 22, GND -> GND")
        print("MISO -> GPIO 19, MOSI -> GPIO 23")
        print("SCK -> GPIO 18, SDA -> GPIO 5")
        
        # Error indication (5 fast blinks)
        for _ in range(5):
            led.on()
            time.sleep_ms(100)
            led.off()
            time.sleep_ms(100)
        return
    
    print(" Ready to read RFID cards...")
    
    last_uid = ""
    last_read_time = 0
    
    while True:
        try:
            # Check for card presence
            if rfid.is_card():
                current_time = time.ticks_ms()
                
                # Prevent duplicate reads (2 second cooldown)
                if time.ticks_diff(current_time, last_read_time) < 2000:
                    time.sleep_ms(100)
                    continue
                
                # Read card UID
                uid_bytes = rfid.read_card()
                
                if uid_bytes:
                    # Convert to hex string
                    uid = ubinascii.hexlify(bytearray(uid_bytes)).decode().upper()
                    
                    # Skip if same card read recently
                    if uid == last_uid and time.ticks_diff(current_time, last_read_time) < 5000:
                        time.sleep_ms(100)
                        continue
                    
                    # Update state
                    last_uid = uid
                    last_read_time = current_time
                    
                    # Output results
                    print(f" RFID Card Detected: {uid}")
                    print(" Typing UID into form...")
                    
                    # Output UID for Python script to capture
                    print(uid)
                    
                    print(f" UID typed: {uid}")
                    print(" Ready for next card...")
                    print()
                    
                    # Success indication (2 quick blinks)
                    for _ in range(2):
                        led.on()
                        time.sleep_ms(100)
                        led.off()
                        time.sleep_ms(100)
            
            time.sleep_ms(100)
            
        except Exception as e:
            print(f" Error reading card: {e}")
            time.sleep_ms(500)

if __name__ == "__main__":
    main()