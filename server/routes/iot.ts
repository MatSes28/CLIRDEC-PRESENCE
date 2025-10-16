import { Router } from 'express';
import { iotDeviceManager } from '../services/iotService';
import { requireAdminOrFaculty, requireAdmin } from '../auth';

const router = Router();

// IoT Device Management Routes
router.get('/devices', requireAdminOrFaculty, async (req, res) => {
  try {
    const devices = iotDeviceManager.getConnectedDevices();
    res.json({
      devices,
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      offline: devices.filter(d => d.status === 'offline').length
    });
  } catch (error) {
    console.error("Error fetching IoT devices:", error);
    res.status(500).json({ message: "Failed to fetch IoT devices" });
  }
});

router.get('/devices/:deviceId', requireAdminOrFaculty, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const device = iotDeviceManager.getDevice(deviceId);
    
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    
    res.json(device);
  } catch (error) {
    console.error("Error fetching device details:", error);
    res.status(500).json({ message: "Failed to fetch device details" });
  }
});

router.post('/devices/:deviceId/config', requireAdmin, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const config = req.body;
    
    const success = iotDeviceManager.updateDeviceConfig(deviceId, config);
    
    if (success) {
      res.json({ success: true, message: "Configuration sent to device" });
    } else {
      res.status(404).json({ message: "Device not found or offline" });
    }
  } catch (error) {
    console.error("Error updating device config:", error);
    res.status(500).json({ message: "Failed to update device configuration" });
  }
});

router.post('/devices/:deviceId/diagnostics', requireAdminOrFaculty, async (req, res) => {
  try {
    const deviceId = req.params.deviceId;
    const success = iotDeviceManager.requestDiagnostics(deviceId);
    
    if (success) {
      res.json({ success: true, message: "Diagnostics request sent to device" });
    } else {
      res.status(404).json({ message: "Device not found or offline" });
    }
  } catch (error) {
    console.error("Error requesting diagnostics:", error);
    res.status(500).json({ message: "Failed to request diagnostics" });
  }
});

router.post('/broadcast', requireAdmin, async (req, res) => {
  try {
    const message = req.body;
    iotDeviceManager.broadcastToDevices(message);
    res.json({ success: true, message: "Message broadcasted to all devices" });
  } catch (error) {
    console.error("Error broadcasting message:", error);
    res.status(500).json({ message: "Failed to broadcast message" });
  }
});

router.get('/connection-events', requireAdminOrFaculty, async (req, res) => {
  try {
    const events = iotDeviceManager.getConnectionEvents();
    res.json(events);
  } catch (error) {
    console.error("Error fetching connection events:", error);
    res.status(500).json({ message: "Failed to fetch connection events" });
  }
});

router.get('/setup-guide', requireAdminOrFaculty, async (req, res) => {
  try {
    const serverHost = req.get('host') || 'your-server-url.com';
    const setupGuide = {
      hardwareRequirements: [
        'ESP32 S3 Development Board',
        'RC522 RFID Reader Module',
        'PIR Motion Sensor (HC-SR501)',
        'RFID cards/tags',
        'Jumper wires',
        'USB cable for programming'
      ],
      wiring: {
        'RFID RC522': {
          'SDA': 'GPIO 5',
          'SCK': 'GPIO 18',
          'MOSI': 'GPIO 23',
          'MISO': 'GPIO 19',
          'RST': 'GPIO 22',
          'VCC': '3.3V',
          'GND': 'GND'
        },
        'PIR HC-SR501': {
          'VCC': '5V',
          'OUT': 'GPIO 4',
          'GND': 'GND'
        }
      },
      steps: [
        'Connect RC522 RFID module to ESP32 S3 using SPI pins',
        'Connect PIR motion sensor to GPIO 4',
        'Download and install Arduino IDE with ESP32 board support',
        'Install required libraries: MFRC522, WebSocket',
        'Update WiFi credentials and server URL in the code',
        'Upload the firmware to your ESP32 S3',
        'Power on the device and monitor serial output',
        'Device should auto-register with the server'
      ],
      configuration: {
        serverHost: serverHost,
        wsPath: '/iot',
        wifiMode: 'STA',
        heartbeatInterval: 30000
      }
    };
    
    res.json(setupGuide);
  } catch (error) {
    console.error("Error fetching setup guide:", error);
    res.status(500).json({ message: "Failed to fetch setup guide" });
  }
});

export default router;