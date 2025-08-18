import { Router } from 'express';
import { iotDeviceManager } from '../services/iotService';
import { requireAdminOrFaculty, requireAdmin } from '../middleware/auth';

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

export default router;