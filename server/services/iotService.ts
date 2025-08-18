import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';

// IoT Device Management Service for ESP32 Integration
export class IoTDeviceManager {
  private connectedDevices = new Map<string, WebSocket>();
  private deviceInfo = new Map<string, DeviceInfo>();
  private iotWss: WebSocketServer | null = null;

  // Initialize IoT WebSocket server for ESP32 devices
  init(httpServer: any): void {
    this.iotWss = new WebSocketServer({ 
      server: httpServer, 
      path: '/iot' 
    });

    this.iotWss.on('connection', (ws: WebSocket, req) => {
      console.log('📱 New IoT device attempting connection');
      
      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          await this.handleIoTMessage(ws, data);
        } catch (error) {
          console.error('❌ Invalid IoT message:', error);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });

      ws.on('close', () => {
        // Find and remove disconnected device
        for (const [deviceId, socket] of this.connectedDevices) {
          if (socket === ws) {
            console.log(`📱 IoT device ${deviceId} disconnected`);
            this.connectedDevices.delete(deviceId);
            this.deviceInfo.delete(deviceId);
            break;
          }
        }
      });

      ws.on('error', (error) => {
        console.error('📱 IoT device connection error:', error);
      });
    });

    console.log('🌐 IoT WebSocket server started on /iot path');
  }

  // Handle messages from ESP32 devices
  private async handleIoTMessage(ws: WebSocket, data: any): Promise<void> {
    try {
      switch (data.type) {
        case 'device_register':
          await this.handleDeviceRegistration(ws, data);
          break;
        
        case 'rfid_scan':
          await this.handleRFIDScan(data);
          break;
        
        case 'presence_detected':
          await this.handlePresenceDetection(data);
          break;
        
        case 'device_status':
          await this.handleDeviceStatus(data);
          break;
        
        case 'heartbeat':
          await this.handleHeartbeat(ws, data);
          break;
        
        default:
          console.log(`⚠️ Unknown IoT message type: ${data.type}`);
      }
    } catch (error) {
      console.error('❌ Error handling IoT message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to process message' 
      }));
    }
  }

  // Register new ESP32 device
  private async handleDeviceRegistration(ws: WebSocket, data: DeviceRegistration): Promise<void> {
    const deviceId = data.deviceId;
    const deviceInfo: DeviceInfo = {
      deviceId,
      classroomId: data.classroomId,
      type: data.deviceType || 'rfid_reader',
      lastSeen: new Date(),
      status: 'online',
      ipAddress: data.ipAddress,
      macAddress: data.macAddress,
      firmwareVersion: data.firmwareVersion,
      capabilities: data.capabilities || ['rfid_scan', 'presence_detection']
    };

    // Store device connection
    this.connectedDevices.set(deviceId, ws);
    this.deviceInfo.set(deviceId, deviceInfo);

    // Verify classroom exists
    const classroom = await storage.getClassroom(data.classroomId);
    if (!classroom) {
      ws.send(JSON.stringify({
        type: 'registration_error',
        message: `Classroom ${data.classroomId} not found`
      }));
      return;
    }

    // Send successful registration response
    ws.send(JSON.stringify({
      type: 'registration_success',
      deviceId,
      classroomId: data.classroomId,
      serverTime: new Date().toISOString(),
      settings: {
        scanTimeout: 5000,
        presenceTimeout: 30000,
        heartbeatInterval: 60000
      }
    }));

    console.log(`✅ IoT device registered: ${deviceId} in ${classroom.name}`);

    // Notify web clients about new device
    this.broadcastToWebClients({
      type: 'device_connected',
      device: deviceInfo
    });
  }

  // Handle RFID card scan from ESP32
  private async handleRFIDScan(data: RFIDScanData): Promise<void> {
    const { deviceId, rfidCardId, timestamp, signalStrength } = data;
    
    console.log(`📱 RFID scan from device ${deviceId}: ${rfidCardId}`);

    try {
      // Find student by RFID card
      const students = await storage.getStudents();
      const student = students.find(s => s.rfidCardId === rfidCardId);
      
      if (!student) {
        console.log(`⚠️ Unknown RFID card: ${rfidCardId}`);
        this.sendToDevice(deviceId, {
          type: 'scan_result',
          status: 'unknown_card',
          cardId: rfidCardId,
          message: 'Unknown RFID card'
        });
        return;
      }

      // Get device info
      const deviceInfo = this.deviceInfo.get(deviceId);
      if (!deviceInfo) {
        console.log(`⚠️ Unknown device: ${deviceId}`);
        return;
      }

      // Check for active class session
      const activeSessions = await storage.getActiveClassSessions();
      const classroomSession = activeSessions.find(session => 
        session.classroomId === deviceInfo.classroomId
      );

      if (!classroomSession) {
        console.log(`⚠️ No active session in classroom ${deviceInfo.classroomId}`);
        this.sendToDevice(deviceId, {
          type: 'scan_result',
          status: 'no_active_session',
          studentName: `${student.firstName} ${student.lastName}`,
          message: 'No active class session'
        });
        return;
      }

      // Check if student is already recorded for this session
      const existingAttendance = await storage.getAttendanceByStudentAndSession(
        student.id, 
        classroomSession.id
      );

      if (existingAttendance) {
        // Handle check-out
        if (!existingAttendance.checkOutTime) {
          await storage.updateAttendance(existingAttendance.id, {
            checkOutTime: new Date(),
            status: 'present'
          });

          this.sendToDevice(deviceId, {
            type: 'scan_result',
            status: 'checked_out',
            studentName: `${student.firstName} ${student.lastName}`,
            message: 'Successfully checked out'
          });

          console.log(`✅ Student ${student.firstName} ${student.lastName} checked out`);
        } else {
          this.sendToDevice(deviceId, {
            type: 'scan_result',
            status: 'already_complete',
            studentName: `${student.firstName} ${student.lastName}`,
            message: 'Attendance already recorded'
          });
        }
      } else {
        // Handle check-in
        const currentTime = new Date();
        const sessionStart = new Date(classroomSession.startTime || currentTime);
        const isLate = currentTime > new Date(sessionStart.getTime() + 15 * 60000); // 15 min grace

        await storage.createAttendance({
          studentId: student.id,
          sessionId: classroomSession.id,
          checkInTime: currentTime,
          status: isLate ? 'late' : 'present'
        });

        this.sendToDevice(deviceId, {
          type: 'scan_result',
          status: isLate ? 'checked_in_late' : 'checked_in',
          studentName: `${student.firstName} ${student.lastName}`,
          message: isLate ? 'Checked in (Late)' : 'Successfully checked in'
        });

        console.log(`✅ Student ${student.firstName} ${student.lastName} checked in ${isLate ? '(Late)' : ''}`);
      }

      // Broadcast to web clients
      this.broadcastToWebClients({
        type: 'rfid_scan',
        student: {
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
          studentId: student.studentId
        },
        classroom: deviceInfo.classroomId,
        timestamp: currentTime,
        device: deviceId
      });

    } catch (error) {
      console.error('❌ Error processing RFID scan:', error);
      this.sendToDevice(deviceId, {
        type: 'scan_result',
        status: 'error',
        message: 'System error, please try again'
      });
    }
  }

  // Handle presence detection from PIR sensor
  private async handlePresenceDetection(data: PresenceData): Promise<void> {
    const { deviceId, presenceDetected, timestamp } = data;
    
    console.log(`👁️ Presence ${presenceDetected ? 'detected' : 'cleared'} from device ${deviceId}`);

    // Update device status
    const deviceInfo = this.deviceInfo.get(deviceId);
    if (deviceInfo) {
      deviceInfo.lastPresenceDetection = presenceDetected ? new Date() : undefined;
    }

    // Broadcast presence update to web clients
    this.broadcastToWebClients({
      type: 'presence_update',
      deviceId,
      classroomId: deviceInfo?.classroomId,
      presenceDetected,
      timestamp: new Date(timestamp)
    });
  }

  // Handle device status updates
  private async handleDeviceStatus(data: DeviceStatusData): Promise<void> {
    const { deviceId, status, batteryLevel, temperature, humidity } = data;
    
    const deviceInfo = this.deviceInfo.get(deviceId);
    if (deviceInfo) {
      deviceInfo.status = status;
      deviceInfo.lastSeen = new Date();
      deviceInfo.batteryLevel = batteryLevel;
      deviceInfo.temperature = temperature;
      deviceInfo.humidity = humidity;
    }

    console.log(`📊 Device ${deviceId} status: ${status}`);
  }

  // Handle heartbeat from device
  private async handleHeartbeat(ws: WebSocket, data: HeartbeatData): Promise<void> {
    const { deviceId } = data;
    
    const deviceInfo = this.deviceInfo.get(deviceId);
    if (deviceInfo) {
      deviceInfo.lastSeen = new Date();
    }

    // Send heartbeat acknowledgment
    ws.send(JSON.stringify({
      type: 'heartbeat_ack',
      serverTime: new Date().toISOString()
    }));
  }

  // Send message to specific IoT device
  public sendToDevice(deviceId: string, message: any): boolean {
    const device = this.connectedDevices.get(deviceId);
    if (device && device.readyState === WebSocket.OPEN) {
      device.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // Broadcast to all connected IoT devices
  public broadcastToDevices(message: any): void {
    const messageStr = JSON.stringify(message);
    this.connectedDevices.forEach((device) => {
      if (device.readyState === WebSocket.OPEN) {
        device.send(messageStr);
      }
    });
  }

  // Broadcast to web clients (dashboard users)
  private broadcastToWebClients(message: any): void {
    // Use global broadcast function if available
    if (typeof (global as any).broadcastNotification === 'function') {
      (global as any).broadcastNotification(message);
    }
  }

  // Get all connected devices
  public getConnectedDevices(): DeviceInfo[] {
    return Array.from(this.deviceInfo.values());
  }

  // Get device by ID
  public getDevice(deviceId: string): DeviceInfo | undefined {
    return this.deviceInfo.get(deviceId);
  }

  // Send configuration update to device
  public updateDeviceConfig(deviceId: string, config: any): boolean {
    return this.sendToDevice(deviceId, {
      type: 'config_update',
      config
    });
  }

  // Request device diagnostics
  public requestDiagnostics(deviceId: string): boolean {
    return this.sendToDevice(deviceId, {
      type: 'diagnostics_request'
    });
  }
}

// Type definitions for IoT communication
interface DeviceInfo {
  deviceId: string;
  classroomId: number;
  type: 'rfid_reader' | 'presence_sensor' | 'combined';
  status: 'online' | 'offline' | 'error';
  lastSeen: Date;
  ipAddress?: string;
  macAddress?: string;
  firmwareVersion?: string;
  capabilities: string[];
  batteryLevel?: number;
  temperature?: number;
  humidity?: number;
  lastPresenceDetection?: Date;
}

interface DeviceRegistration {
  deviceId: string;
  classroomId: number;
  deviceType: string;
  ipAddress: string;
  macAddress: string;
  firmwareVersion: string;
  capabilities: string[];
}

interface RFIDScanData {
  deviceId: string;
  rfidCardId: string;
  timestamp: string;
  signalStrength?: number;
}

interface PresenceData {
  deviceId: string;
  presenceDetected: boolean;
  timestamp: string;
}

interface DeviceStatusData {
  deviceId: string;
  status: 'online' | 'offline' | 'error';
  batteryLevel?: number;
  temperature?: number;
  humidity?: number;
}

interface HeartbeatData {
  deviceId: string;
  timestamp: string;
}

// Create singleton instance
export const iotDeviceManager = new IoTDeviceManager();