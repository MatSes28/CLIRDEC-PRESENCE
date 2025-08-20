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
  private async handleDeviceRegistration(ws: WebSocket, data: any): Promise<void> {
    const deviceId = data.deviceId;
    
    // Default to first available classroom if not specified
    let classroomId = data.classroomId;
    if (!classroomId) {
      const classrooms = await storage.getClassrooms();
      if (classrooms.length > 0) {
        classroomId = classrooms[0].id;
      }
    }

    const deviceInfo: DeviceInfo = {
      deviceId,
      classroomId: classroomId || 1, // Default classroom
      type: data.deviceType || 'dual_mode',
      lastSeen: new Date(),
      status: 'online',
      ipAddress: data.ipAddress,
      macAddress: data.macAddress,
      firmwareVersion: data.firmwareVersion,
      capabilities: data.capabilities || ['rfid_scan', 'presence_detection', 'mode_switching']
    };

    // Store device connection
    this.connectedDevices.set(deviceId, ws);
    this.deviceInfo.set(deviceId, deviceInfo);

    // Get classroom info (optional, don't fail if not found)
    let classroomName = 'Unassigned';
    if (classroomId) {
      const classroom = await storage.getClassroom(classroomId);
      if (classroom) {
        classroomName = classroom.name;
      }
    }

    // Send successful registration response
    const registrationResponse = {
      type: 'registration_success',
      deviceId,
      classroomId: classroomId,
      classroomName: classroomName,
      serverTime: new Date().toISOString(),
      settings: {
        scanTimeout: 5000,
        presenceTimeout: 30000,
        heartbeatInterval: 30000
      }
    };

    ws.send(JSON.stringify(registrationResponse));
    console.log(`✅ IoT device registered: ${deviceId} (${data.currentMode || 'wifi'} mode) in ${classroomName}`);

    // Notify web clients about new device
    this.broadcastToWebClients({
      type: 'device_connected',
      device: deviceInfo
    });
  }

  // Handle RFID card scan from ESP32
  private async handleRFIDScan(data: any): Promise<void> {
    const { deviceId, rfidCardId, timestamp } = data;
    
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

      // Check for active class session in the device's classroom
      const activeSessions = await storage.getActiveClassSessions();
      const classroomSession = activeSessions.find(session => 
        session.classroomId === deviceInfo.classroomId
      );

      if (!classroomSession) {
        console.log(`⚠️ No active session in classroom ${deviceInfo.classroomId}`);
        this.sendToDevice(deviceId, {
          type: 'scan_result',
          status: 'no_session',
          cardId: rfidCardId,
          studentName: `${student.firstName} ${student.lastName}`,
          message: 'No active class session'
        });
        return;
      }

      // Check if student is already marked for this session
      const existingAttendance = await storage.getAttendanceByStudentAndSession(
        student.id, 
        classroomSession.id
      );

      let attendanceStatus = 'checked_in';
      if (existingAttendance) {
        attendanceStatus = 'already_present';
        console.log(`Student ${student.firstName} ${student.lastName} already marked present`);
      } else {
        // Create attendance record
        await storage.createAttendance({
          studentId: student.id,
          sessionId: classroomSession.id,
          status: 'present',
          checkInTime: new Date(),
          timestamp: new Date()
        });
        
        console.log(`✅ Attendance recorded: ${student.firstName} ${student.lastName}`);
        
        // Notify web clients
        this.broadcastToWebClients({
          type: 'attendance_update',
          student: student,
          session: classroomSession,
          status: 'present',
          timestamp: new Date()
        });
      }

      // Send response to device
      this.sendToDevice(deviceId, {
        type: 'scan_result',
        status: attendanceStatus,
        cardId: rfidCardId,
        studentName: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        message: attendanceStatus === 'checked_in' ? 'Attendance recorded' : 'Already present'
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

  // Send message to specific IoT device
  private sendToDevice(deviceId: string, message: any): void {
    const ws = this.connectedDevices.get(deviceId);
    if (ws && ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(message));
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