# ESP32 Flash Recovery Guide

## Error Analysis
```
E (53) flash_parts: partition 0 invalid magic number 0xffff
E (53) boot: Failed to verify partition table
E (53) boot: load partition table error!
```

This indicates flash memory corruption or incomplete firmware upload.

## Solution Steps

### Method 1: Full Flash Erase and Reflash (Recommended)

1. **Erase Flash Memory Completely**
   - In Arduino IDE: Tools → Erase Flash → "All Flash Contents"
   - Or use esptool: `esptool.py --chip esp32 --port COM3 erase_flash`

2. **Check Board Settings**
   - Board: "ESP32 Dev Module"
   - Upload Speed: 921600 → Change to 115200 (slower but more reliable)
   - Flash Mode: "DIO"
   - Flash Frequency: "80MHz"
   - Flash Size: "4MB (32Mb)"
   - Partition Scheme: "Default 4MB with spiffs"

3. **Re-upload Firmware**
   - Use the updated `ESP32_CLIRDEC_COMPLETE.ino` file
   - Hold BOOT button during upload if needed

### Method 2: Hardware Reset

1. **Physical Reset Sequence**
   - Disconnect ESP32 from USB
   - Hold BOOT button
   - Connect USB while holding BOOT
   - Release BOOT button after 3 seconds
   - Try uploading again

### Method 3: Alternative Upload Method

1. **Manual Boot Mode**
   - Hold both BOOT and EN (reset) buttons
   - Release EN button first
   - Keep holding BOOT until upload starts
   - Release BOOT button

### Method 4: Using ESP32 Flash Tool

1. **Download ESP32 Flash Download Tool**
   - From Espressif official website
   - More reliable than Arduino IDE for recovery

2. **Flash Settings**
   - SPI Speed: 40MHz
   - SPI Mode: DIO
   - Flash Size: 32Mbit-C1

## Prevention Tips

1. **Stable Power Supply**
   - Use quality USB cable with data support
   - Avoid USB hubs, connect directly to PC

2. **Upload Settings**
   - Use slower upload speeds (115200 baud)
   - Don't disconnect during upload

3. **Code Quality**
   - Avoid infinite loops without delays
   - Include watchdog timer resets

## If Still Not Working

Try this simple test code first:

```cpp
void setup() {
  Serial.begin(115200);
  Serial.println("ESP32 Recovery Test");
}

void loop() {
  Serial.println("Hello World");
  delay(1000);
}
```

## Hardware Check

If software recovery fails:
1. Check if ESP32 gets warm (may indicate hardware damage)
2. Try different USB port/cable
3. Test with different computer
4. Check for physical damage to ESP32 board

## Success Indicators

After successful recovery, you should see:
```
WiFi connecting...
WiFi connected!
WebSocket connecting to server...
Device registered successfully!
```

This means your ESP32 is ready for the CLIRDEC attendance system.