import { WebSocketServer, WebSocket } from 'ws';
import { storage } from '../storage';

interface DeviceInfo {
  deviceId: string;
  deviceType: string;
  ipAddress: string;
  macAddress: string;
  lastSeen: Date;
  status: 'online' | 'offline';
  capabilities: string[];
  classroomId?: string;
}

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
      
      // Send immediate welcome message to test connection
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to CLIRDEC server',
        timestamp: new Date().toISOString()
      }));
      
      ws.on('message', async (message) => {
        console.log('📨 Raw message received:', message.toString());
        try {
          const data = JSON.parse(message.toString());
          console.log('📨 IoT message received:', data.type, 'from device:', data.deviceId);
          await this.handleIoTMessage(ws, data);
        } catch (error) {
          console.error('❌ Invalid IoT message:', error, message.toString());
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });

      ws.on('close', () => {
        // Find and remove disconnected device
        this.connectedDevices.forEach((socket, deviceId) => {
          if (socket === ws) {
            console.log(`📱 IoT device ${deviceId} disconnected`);
            this.connectedDevices.delete(deviceId);
            this.deviceInfo.delete(deviceId);
          }
        });
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
      console.log(`📨 Handling IoT message type: ${data.type}`);
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
          console.log(`⚠️ Unknown message type: ${data.type}`);
          ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${data.type}`
          }));
      }
    } catch (error) {
      console.error('❌ Error handling IoT message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Server error processing message'
      }));
    }
  }

  // Register new ESP32 device
  private async handleDeviceRegistration(ws: WebSocket, data: any): Promise<void> {
    try {
      console.log('📱 Processing device registration:', data);
      const deviceId = data.deviceId;
      
      if (!deviceId) {
        console.error('❌ No device ID provided in registration');
        ws.send(JSON.stringify({
          type: 'registration_error',
          message: 'Device ID is required'
        }));
        return;
      }
      
      // Default to first available classroom if not specified
      let classroomId = data.classroomId;
      if (!classroomId) {
        const classrooms = await storage.getClassrooms();
        if (classrooms.length > 0) {
          classroomId = classrooms[0].id;
        }
      }

      // Store device information
      const deviceInfo: DeviceInfo = {
        deviceId,
        deviceType: data.deviceType || 'esp32',
        ipAddress: data.ipAddress || 'unknown',
        macAddress: data.macAddress || 'unknown',
        lastSeen: new Date(),
        status: 'online',
        capabilities: data.capabilities || [],
        classroomId: classroomId
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

    } catch (error) {
      console.error('❌ Error during device registration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ws.send(JSON.stringify({
        type: 'registration_error',
        message: 'Registration failed: ' + errorMessage
      }));
    }
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
      const activeSession = await storage.getActiveSession();
      const classroomSession = activeSession && activeSession.scheduleId ? activeSession : null;

      if (!classroomSession) {
        console.log(`⚠️ No active session`);
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
      const sessionAttendance = await storage.getAttendanceBySession(classroomSession.id!);
      const existingAttendance = sessionAttendance.find(a => a.studentId === student.id);

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
          checkInTime: new Date()
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

  // Handle presence detection from ESP32
  private async handlePresenceDetection(data: any): Promise<void> {
    console.log(`👁️ Presence ${data.presenceDetected ? 'detected' : 'cleared'} from device ${data.deviceId}`);
    
    // Store presence data and notify web clients
    this.broadcastToWebClients({
      type: 'presence_update',
      deviceId: data.deviceId,
      presenceDetected: data.presenceDetected,
      timestamp: new Date()
    });
  }

  // Handle device status updates
  private async handleDeviceStatus(data: any): Promise<void> {
    const deviceInfo = this.deviceInfo.get(data.deviceId);
    if (deviceInfo) {
      deviceInfo.lastSeen = new Date();
      deviceInfo.status = 'online';
    }
  }

  // Handle heartbeat messages
  private async handleHeartbeat(ws: WebSocket, data: any): Promise<void> {
    const deviceInfo = this.deviceInfo.get(data.deviceId);
    if (deviceInfo) {
      deviceInfo.lastSeen = new Date();
      deviceInfo.status = 'online';
    }
    
    // Optional: send heartbeat response
    ws.send(JSON.stringify({
      type: 'heartbeat_ack',
      timestamp: new Date().toISOString()
    }));
  }

  // Broadcast message to all web clients
  private broadcastToWebClients(message: any): void {
    // Use global broadcast function if available
    if ((global as any).broadcastNotification) {
      (global as any).broadcastNotification(message);
    }
  }

  // Get connected devices list for API
  public getConnectedDevices(): Array<DeviceInfo> {
    return Array.from(this.deviceInfo.values());
  }

  // Get device count
  public getDeviceStats(): { total: number; online: number; offline: number } {
    const devices = this.getConnectedDevices();
    const online = devices.filter(d => d.status === 'online').length;
    return {
      total: devices.length,
      online,
      offline: devices.length - online
    };
  }
}

// Export singleton instance
export const iotDeviceManager = new IoTDeviceManager();