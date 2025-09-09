import { storage } from '../storage';

export interface AttendanceValidationRequest {
  rfidCardId: string;
  sessionId: number;
  deviceId?: string;
  timestamp?: Date;
}

export interface ValidationResult {
  success: boolean;
  status: 'present' | 'late' | 'absent' | 'pending_validation' | 'ghost_tap' | 'invalid_session';
  message: string;
  student?: any;
  attendanceRecord?: any;
  validationTimeRemaining?: number;
  discrepancyFlag?: string;
}

export interface SessionMode {
  sessionId: number;
  mode: 'tap_in' | 'tap_out' | 'disabled';
  classStartTime: Date;
  classEndTime: Date;
  lateThresholdMinutes: number;
  absentThresholdPercent: number;
}

class AttendanceValidationService {
  private validationTimeouts = new Map<string, NodeJS.Timeout>();
  private pendingValidations = new Map<string, any>();
  private sessionModes = new Map<number, SessionMode>();

  constructor() {
    // Initialize session mode monitoring
    this.initializeSessionModeMonitoring();
  }

  private async initializeSessionModeMonitoring(): Promise<void> {
    // Check for active sessions every minute
    setInterval(async () => {
      await this.updateSessionModes();
    }, 60000);
    
    // Initial check
    await this.updateSessionModes();
  }

  private async updateSessionModes(): Promise<void> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Get today's class sessions
      const sessions = await storage.getClassSessionsByDate(today);
      
      for (const session of sessions) {
        if (!session.startTime || !session.endTime) continue;
        
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        const classDurationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        const lateThresholdMinutes = session.lateThresholdMinutes || 15;
        const absentThresholdPercent = session.absentThresholdPercent || 60;
        
        let mode: 'tap_in' | 'tap_out' | 'disabled' = 'disabled';
        
        // Determine current mode based on time
        if (now >= startTime && now <= endTime) {
          // During class time
          const minutesIntoClass = (now.getTime() - startTime.getTime()) / (1000 * 60);
          const absentThresholdMinutes = (classDurationMinutes * absentThresholdPercent) / 100;
          
          if (minutesIntoClass <= absentThresholdMinutes) {
            mode = 'tap_in'; // Students can still check in
          } else {
            mode = 'tap_out'; // Only check-out allowed
          }
        } else if (now > endTime && now <= new Date(endTime.getTime() + 30 * 60 * 1000)) {
          // 30 minutes after class ends - tap-out mode for stragglers
          mode = 'tap_out';
        }
        
        this.sessionModes.set(session.id, {
          sessionId: session.id,
          mode,
          classStartTime: startTime,
          classEndTime: endTime,
          lateThresholdMinutes,
          absentThresholdPercent
        });
        
        console.log(`📊 Session ${session.id} mode: ${mode} (${startTime.toLocaleTimeString()} - ${endTime.toLocaleTimeString()})`);
      }
    } catch (error) {
      console.error('❌ Error updating session modes:', error);
    }
  }

  async validateRFIDTap(request: AttendanceValidationRequest): Promise<ValidationResult> {
    const { rfidCardId, sessionId, deviceId, timestamp = new Date() } = request;
    
    try {
      // 1. Check if session exists and get its mode
      const sessionMode = this.sessionModes.get(sessionId);
      if (!sessionMode) {
        return {
          success: false,
          status: 'invalid_session',
          message: 'Session not found or not active',
          discrepancyFlag: 'invalid_session'
        };
      }

      if (sessionMode.mode === 'disabled') {
        return {
          success: false,
          status: 'invalid_session',
          message: 'Attendance is currently disabled for this session',
          discrepancyFlag: 'session_disabled'
        };
      }

      // 2. Find student by RFID
      const student = await storage.getStudentByRFID(rfidCardId);
      if (!student) {
        return {
          success: false,
          status: 'invalid_session',
          message: 'RFID card not recognized. Please register your card.',
          discrepancyFlag: 'unknown_card'
        };
      }

      // 3. Check existing attendance record
      const existingRecord = await this.getAttendanceRecord(sessionId, student.id);
      
      if (sessionMode.mode === 'tap_in') {
        return await this.handleTapIn(student, sessionId, sessionMode, timestamp, existingRecord);
      } else {
        return await this.handleTapOut(student, sessionId, sessionMode, timestamp, existingRecord);
      }

    } catch (error) {
      console.error('❌ Error validating RFID tap:', error);
      return {
        success: false,
        status: 'invalid_session',
        message: 'System error during validation',
        discrepancyFlag: 'system_error'
      };
    }
  }

  private async handleTapIn(student: any, sessionId: number, sessionMode: SessionMode, timestamp: Date, existingRecord: any): Promise<ValidationResult> {
    // Check if already checked in
    if (existingRecord && existingRecord.checkInTime) {
      return {
        success: false,
        status: 'present',
        message: `${student.firstName} ${student.lastName} is already checked in`,
        student,
        attendanceRecord: existingRecord,
        discrepancyFlag: 'already_checked_in'
      };
    }

    // Calculate attendance status based on time
    const minutesLate = (timestamp.getTime() - sessionMode.classStartTime.getTime()) / (1000 * 60);
    const classDurationMinutes = (sessionMode.classEndTime.getTime() - sessionMode.classStartTime.getTime()) / (1000 * 60);
    const absentThresholdMinutes = (classDurationMinutes * sessionMode.absentThresholdPercent) / 100;

    let status: 'present' | 'late' | 'absent';
    if (minutesLate <= sessionMode.lateThresholdMinutes) {
      status = 'present';
    } else if (minutesLate <= absentThresholdMinutes) {
      status = 'late';
    } else {
      status = 'absent';
    }

    // Create validation key for timeout tracking
    const validationKey = `${sessionId}-${student.id}-${timestamp.getTime()}`;
    
    // Store pending validation
    const pendingData = {
      student,
      sessionId,
      status,
      rfidTapTime: timestamp,
      validationKey
    };
    
    this.pendingValidations.set(validationKey, pendingData);

    // Set 7-second timeout for sensor validation
    const timeout = setTimeout(async () => {
      await this.handleValidationTimeout(validationKey);
    }, 7000);
    
    this.validationTimeouts.set(validationKey, timeout);

    // Broadcast to WebSocket clients and IoT devices that validation is needed
    this.broadcastValidationRequest(sessionId, student, validationKey);

    return {
      success: true,
      status: 'pending_validation',
      message: `RFID tap detected for ${student.firstName} ${student.lastName}. Waiting for presence validation...`,
      student,
      validationTimeRemaining: 7,
      discrepancyFlag: 'pending_sensor_validation'
    };
  }

  private async handleTapOut(student: any, sessionId: number, sessionMode: SessionMode, timestamp: Date, existingRecord: any): Promise<ValidationResult> {
    if (!existingRecord || !existingRecord.checkInTime) {
      return {
        success: false,
        status: 'invalid_session',
        message: `${student.firstName} ${student.lastName} has not checked in yet`,
        student,
        discrepancyFlag: 'checkout_without_checkin'
      };
    }

    if (existingRecord.checkOutTime) {
      return {
        success: false,
        status: 'present',
        message: `${student.firstName} ${student.lastName} is already checked out`,
        student,
        attendanceRecord: existingRecord,
        discrepancyFlag: 'already_checked_out'
      };
    }

    // Update attendance record with check-out time
    const updatedRecord = await storage.updateAttendanceRecord(existingRecord.id, {
      checkOutTime: timestamp,
      exitValidated: true,
      updatedAt: timestamp
    });

    return {
      success: true,
      status: existingRecord.status as any,
      message: `${student.firstName} ${student.lastName} checked out successfully`,
      student,
      attendanceRecord: updatedRecord,
      discrepancyFlag: 'normal'
    };
  }

  async validateSensorDetection(sessionId: number, studentId: number, detectionType: 'entry' | 'exit', timestamp: Date = new Date()): Promise<ValidationResult> {
    try {
      // Find matching pending validation
      const pendingEntry = Array.from(this.pendingValidations.values()).find(
        validation => validation.sessionId === sessionId && validation.student.id === studentId
      );

      if (!pendingEntry) {
        // Sensor detection without RFID tap - flag as discrepancy
        const student = await storage.getStudentById(studentId);
        return {
          success: false,
          status: 'ghost_tap',
          message: `Sensor detected ${detectionType} for ${student?.firstName || 'unknown'} ${student?.lastName || 'student'} but no RFID tap found`,
          student,
          discrepancyFlag: 'sensor_without_rfid'
        };
      }

      // Clear timeout
      const timeout = this.validationTimeouts.get(pendingEntry.validationKey);
      if (timeout) {
        clearTimeout(timeout);
        this.validationTimeouts.delete(pendingEntry.validationKey);
      }

      // Remove from pending
      this.pendingValidations.delete(pendingEntry.validationKey);

      // Create or update attendance record
      const attendanceRecord = await this.createValidatedAttendanceRecord(
        pendingEntry,
        timestamp,
        detectionType
      );

      return {
        success: true,
        status: pendingEntry.status,
        message: `${pendingEntry.student.firstName} ${pendingEntry.student.lastName} attendance validated - ${pendingEntry.status}`,
        student: pendingEntry.student,
        attendanceRecord,
        discrepancyFlag: 'normal'
      };

    } catch (error) {
      console.error('❌ Error validating sensor detection:', error);
      return {
        success: false,
        status: 'invalid_session',
        message: 'Error validating sensor detection',
        discrepancyFlag: 'system_error'
      };
    }
  }

  private async handleValidationTimeout(validationKey: string): Promise<void> {
    const pendingData = this.pendingValidations.get(validationKey);
    if (!pendingData) return;

    console.log(`⏰ Validation timeout for ${pendingData.student.firstName} ${pendingData.student.lastName}`);

    // Remove from pending
    this.pendingValidations.delete(validationKey);
    this.validationTimeouts.delete(validationKey);

    // Create attendance record with timeout flag
    const attendanceRecord = await storage.createAttendanceRecord({
      sessionId: pendingData.sessionId,
      studentId: pendingData.student.id,
      checkInTime: pendingData.rfidTapTime,
      status: 'absent', // Mark as absent due to validation failure
      proximityValidated: false,
      entryValidated: false,
      rfidTapTime: pendingData.rfidTapTime,
      validationTimeout: true,
      discrepancyFlag: 'ghost_tap',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Broadcast ghost tap notification
    this.broadcastGhostTapAlert(pendingData.sessionId, pendingData.student, attendanceRecord);
  }

  private async createValidatedAttendanceRecord(pendingData: any, sensorTimestamp: Date, detectionType: 'entry' | 'exit'): Promise<any> {
    const existingRecord = await this.getAttendanceRecord(pendingData.sessionId, pendingData.student.id);

    if (existingRecord) {
      // Update existing record
      return await storage.updateAttendanceRecord(existingRecord.id, {
        checkInTime: pendingData.rfidTapTime,
        status: pendingData.status,
        proximityValidated: true,
        entryValidated: detectionType === 'entry',
        exitValidated: detectionType === 'exit',
        rfidTapTime: pendingData.rfidTapTime,
        sensorDetectionTime: sensorTimestamp,
        validationTimeout: false,
        discrepancyFlag: 'normal',
        updatedAt: new Date()
      });
    } else {
      // Create new record
      return await storage.createAttendanceRecord({
        sessionId: pendingData.sessionId,
        studentId: pendingData.student.id,
        checkInTime: pendingData.rfidTapTime,
        status: pendingData.status,
        proximityValidated: true,
        entryValidated: detectionType === 'entry',
        exitValidated: detectionType === 'exit',
        rfidTapTime: pendingData.rfidTapTime,
        sensorDetectionTime: sensorTimestamp,
        validationTimeout: false,
        discrepancyFlag: 'normal',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  private async getAttendanceRecord(sessionId: number, studentId: number): Promise<any> {
    try {
      const records = await storage.getAttendanceBySession(sessionId);
      return records.find((record: any) => record.studentId === studentId);
    } catch (error) {
      console.error('❌ Error getting attendance record:', error);
      return null;
    }
  }

  private broadcastValidationRequest(sessionId: number, student: any, validationKey: string): void {
    // Broadcast to WebSocket clients
    if ((global as any).broadcastNotification) {
      (global as any).broadcastNotification({
        type: 'attendance',
        title: 'Validation Required',
        message: `Waiting for presence validation: ${student.firstName} ${student.lastName}`,
        timestamp: new Date(),
        data: { sessionId, studentId: student.id, validationKey }
      });
    }

    // Send to IoT devices to activate sensors
    console.log(`📡 Broadcasting validation request for session ${sessionId}, student ${student.id}`);
  }

  private broadcastGhostTapAlert(sessionId: number, student: any, attendanceRecord: any): void {
    if ((global as any).broadcastNotification) {
      (global as any).broadcastNotification({
        type: 'alert',
        title: 'Ghost Tap Detected',
        message: `RFID tap without presence validation: ${student.firstName} ${student.lastName}`,
        timestamp: new Date(),
        data: { sessionId, studentId: student.id, attendanceRecord }
      });
    }

    console.log(`🚨 Ghost tap detected: ${student.firstName} ${student.lastName} (Session ${sessionId})`);
  }

  getSessionMode(sessionId: number): SessionMode | undefined {
    return this.sessionModes.get(sessionId);
  }

  getPendingValidations(): any[] {
    return Array.from(this.pendingValidations.values());
  }

  getValidationTimeouts(): string[] {
    return Array.from(this.validationTimeouts.keys());
  }
}

export const attendanceValidationService = new AttendanceValidationService();