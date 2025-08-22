"""
ESP32 RFID Simple Test - Alternative Wiring
Test different pin configurations to find what works with your setup

Try these wiring options in order:
"""

from machine import Pin, SPI
import time
import ubinascii

# OPTION 1: Original Wiring
WIRING_OPTION_1 = {
    'sck': 18, 'mosi': 23, 'miso': 19, 'cs': 5, 'rst': 22
}

# OPTION 2: Alternative Wiring (VSPI)
WIRING_OPTION_2 = {
    'sck': 18, 'mosi': 23, 'miso': 19, 'cs': 15, 'rst': 4
}

# OPTION 3: HSPI Wiring
WIRING_OPTION_3 = {
    'sck': 14, 'mosi': 13, 'miso': 12, 'cs': 15, 'rst': 2
}

# OPTION 4: Common Alternative
WIRING_OPTION_4 = {
    'sck': 18, 'mosi': 23, 'miso': 19, 'cs': 21, 'rst': 22
}

class SimpleRFID:
    def __init__(self, wiring):
        print(f"Testing wiring: SCK={wiring['sck']}, MOSI={wiring['mosi']}, MISO={wiring['miso']}, CS={wiring['cs']}, RST={wiring['rst']}")
        
        self.spi = SPI(1, baudrate=1000000, polarity=0, phase=0,
                       sck=Pin(wiring['sck']), 
                       mosi=Pin(wiring['mosi']), 
                       miso=Pin(wiring['miso']))
        
        self.cs = Pin(wiring['cs'], Pin.OUT)
        self.rst = Pin(wiring['rst'], Pin.OUT)
        self.led = Pin(2, Pin.OUT)
        
        self.cs.on()
        time.sleep_ms(10)
        
        # Reset
        self.rst.off()
        time.sleep_ms(50)
        self.rst.on()
        time.sleep_ms(50)
        
    def write_reg(self, reg, val):
        self.cs.off()
        self.spi.write(bytes([(reg << 1) & 0x7E, val]))
        self.cs.on()
    
    def read_reg(self, reg):
        self.cs.off()
        self.spi.write(bytes([((reg << 1) & 0x7E) | 0x80]))
        val = self.spi.read(1)
        self.cs.on()
        return val[0]
    
    def test_communication(self):
        """Test if we can communicate with RC522"""
        try:
            # Read version register
            version = self.read_reg(0x37)
            print(f"Version register: 0x{version:02X}")
            
            if version in [0x91, 0x92, 0x88, 0x90]:
                print("✅ RC522 detected!")
                self.led.on()
                time.sleep_ms(500)
                self.led.off()
                return True
            else:
                print("❌ Unknown version or no response")
                return False
        except Exception as e:
            print(f"❌ Communication error: {e}")
            return False
    
    def initialize(self):
        """Initialize RC522 for card detection"""
        try:
            # Basic initialization
            self.write_reg(0x2A, 0x8D)  # Timer mode
            self.write_reg(0x2B, 0x3E)  # Timer prescaler
            self.write_reg(0x2D, 30)    # Timer reload low
            self.write_reg(0x2C, 0)     # Timer reload high
            self.write_reg(0x15, 0x40)  # Tx ASK
            self.write_reg(0x11, 0x3D)  # Mode
            
            # Turn on antenna
            current = self.read_reg(0x14)
            if not (current & 0x03):
                self.write_reg(0x14, current | 0x03)
            
            print("✅ RC522 initialized")
            return True
        except Exception as e:
            print(f"❌ Initialization failed: {e}")
            return False
    
    def detect_card(self):
        """Simple card detection"""
        try:
            # Request command
            self.write_reg(0x0D, 0x07)  # Bit framing
            self.write_reg(0x02, 0x92)  # Com interrupt enable
            self.write_reg(0x04, 0x7F)  # Clear interrupts
            self.write_reg(0x0A, 0x80)  # FIFO level
            
            # Send REQA command
            self.write_reg(0x09, 0x26)  # REQA to FIFO
            self.write_reg(0x01, 0x0C)  # Transmit command
            
            # Wait for response
            timeout = 1000
            while timeout > 0:
                irq = self.read_reg(0x04)
                if irq & 0x30:  # Rx or idle interrupt
                    break
                timeout -= 1
                time.sleep_ms(1)
            
            if timeout > 0:
                fifo_level = self.read_reg(0x0A)
                if fifo_level > 0:
                    print("📱 Card detected!")
                    self.led.on()
                    time.sleep_ms(200)
                    self.led.off()
                    return True
            
            return False
            
        except Exception as e:
            print(f"❌ Detection error: {e}")
            return False

def test_wiring_option(option_num, wiring):
    print(f"\n{'='*50}")
    print(f"TESTING OPTION {option_num}")
    print(f"{'='*50}")
    print("Wiring:")
    print(f"RC522 VCC  → ESP32 3.3V")
    print(f"RC522 GND  → ESP32 GND")
    print(f"RC522 RST  → ESP32 GPIO {wiring['rst']}")
    print(f"RC522 SCK  → ESP32 GPIO {wiring['sck']}")
    print(f"RC522 MOSI → ESP32 GPIO {wiring['mosi']}")
    print(f"RC522 MISO → ESP32 GPIO {wiring['miso']}")
    print(f"RC522 SDA  → ESP32 GPIO {wiring['cs']}")
    print("-" * 50)
    
    try:
        rfid = SimpleRFID(wiring)
        
        if not rfid.test_communication():
            print("❌ Communication test failed")
            return False
        
        if not rfid.initialize():
            print("❌ Initialization failed")
            return False
        
        print("🚀 Ready! Try tapping a card...")
        
        # Test card detection for 30 seconds
        start_time = time.ticks_ms()
        while time.ticks_diff(time.ticks_ms(), start_time) < 30000:
            if rfid.detect_card():
                print("✅ This wiring works!")
                return True
            time.sleep_ms(100)
        
        print("⏰ No card detected in 30 seconds")
        return False
        
    except Exception as e:
        print(f"❌ Option {option_num} failed: {e}")
        return False

def main():
    print("ESP32 RFID Wiring Test")
    print("This will test 4 different wiring configurations")
    print("Watch for LED blinks and messages")
    print("\nMake sure RC522 VCC is connected to 3.3V (NOT 5V!)")
    print("Press Ctrl+C to stop\n")
    
    wiring_options = [
        (1, WIRING_OPTION_1),
        (2, WIRING_OPTION_2),
        (3, WIRING_OPTION_3),
        (4, WIRING_OPTION_4)
    ]
    
    for option_num, wiring in wiring_options:
        try:
            if test_wiring_option(option_num, wiring):
                print(f"\n🎉 SUCCESS! Use Option {option_num} wiring")
                print("Now you can use the main attendance code with these pins")
                break
            else:
                print(f"❌ Option {option_num} didn't work")
                
        except KeyboardInterrupt:
            print("\nTest stopped by user")
            break
        except Exception as e:
            print(f"❌ Option {option_num} error: {e}")
        
        print("Waiting 3 seconds before next test...")
        time.sleep(3)
    
    print("\nTest complete!")

if __name__ == "__main__":
    main()