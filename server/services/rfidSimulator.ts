import { storage } from "../storage";

export interface RFIDTapResult {
  success: boolean;
  message: string;
  student?: any;
  attendanceRecord?: any;
  action?: 'check-in' | 'check-out';
}

export async function simulateRFIDTap(rfidCardId: string, sessionId: number): Promise<RFIDTapResult> {
  try {
    // Find student by RFID card
    const student = await storage.getStudentByRFID(rfidCardId);
    if (!student) {
      return {
        success: false,
        message: "RFID card not recognized. Please register your card with the system."
      };
    }

    // Check if student already has attendance record for this session
    const existingAttendance = await storage.checkStudentAttendance(student.id, sessionId);
    
    const now = new Date();
    
    if (!existingAttendance) {
      // First tap - check in
      // Get session details to check if student is late
      const sessions = await storage.getAllClassSessions();
      const session = sessions.find(s => s.id === sessionId);
      let status = 'present';
      
      if (session && session.startTime) {
        const sessionStart = new Date(session.startTime);
        const currentTime = new Date();
        
        // Calculate time elapsed since session started (in minutes)
        const timeElapsed = (currentTime.getTime() - sessionStart.getTime()) / (1000 * 60);
        
        // Calculate class duration from start and end time, or default to 3 hours (180 minutes)
        let classDuration = 180; // Default 3 hours
        if (session.endTime && session.startTime) {
          classDuration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / (1000 * 60);
        }
        const lateThreshold = classDuration * 0.6; // 60% of class time
        
        // If student arrives after 60% of class time, mark as late
        if (timeElapsed > lateThreshold && timeElapsed > 15) { // Also check if more than 15 min late
          status = 'late';
        }
      }
      
      const attendanceRecord = await storage.createAttendance({
        sessionId,
        studentId: student.id,
        checkInTime: now,
        status: status as 'present' | 'late',
        proximityValidated: true // Simulate proximity sensor validation
      });

      return {
        success: true,
        message: `Welcome ${student.firstName}! You have successfully checked in.`,
        student,
        attendanceRecord,
        action: 'check-in'
      };
    } else if (existingAttendance.checkInTime && !existingAttendance.checkOutTime) {
      // Second tap - check out
      const updatedAttendance = await storage.updateAttendance(existingAttendance.id, {
        checkOutTime: now
      });

      return {
        success: true,
        message: `Goodbye ${student.firstName}! You have successfully checked out.`,
        student,
        attendanceRecord: updatedAttendance,
        action: 'check-out'
      };
    } else {
      // Already checked out
      return {
        success: false,
        message: `${student.firstName}, you have already completed attendance for this session.`,
        student
      };
    }
  } catch (error) {
    console.error('Error processing RFID tap:', error);
    return {
      success: false,
      message: "System error occurred while processing RFID tap. Please try again."
    };
  }
}

export async function simulateProximitySensor(sessionId: number): Promise<boolean> {
  // Simulate proximity sensor detection
  // In a real implementation, this would interface with actual hardware
  const detectionProbability = 0.95; // 95% accuracy rate
  return Math.random() < detectionProbability;
}

export async function validateDualAuthentication(rfidCardId: string, sessionId: number): Promise<RFIDTapResult> {
  // Simulate dual validation (RFID + Proximity)
  const proximityDetected = await simulateProximitySensor(sessionId);
  
  if (!proximityDetected) {
    return {
      success: false,
      message: "Proximity sensor did not detect physical presence. Please ensure you are near the scanner."
    };
  }

  return await simulateRFIDTap(rfidCardId, sessionId);
}

// Generate mock RFID card IDs for testing
export function generateMockRFIDCards(count: number = 50): string[] {
  const cards: string[] = [];
  for (let i = 1; i <= count; i++) {
    cards.push(`RF${String(i).padStart(6, '0')}`);
  }
  return cards;
}

// Simulate hardware status monitoring
export interface HardwareStatus {
  rfidScanner: {
    status: 'online' | 'offline' | 'error';
    lastPing: Date;
    port: string;
  };
  proximitySensors: {
    sensor1: { status: 'online' | 'offline' | 'error'; lastReading: Date };
    sensor2: { status: 'online' | 'offline' | 'error'; lastReading: Date };
    sensor3: { status: 'online' | 'offline' | 'error'; lastReading: Date };
  };
  networkConnection: {
    status: 'connected' | 'disconnected';
    latency: number;
  };
}

export function getHardwareStatus(): HardwareStatus {
  const now = new Date();
  
  return {
    rfidScanner: {
      status: 'online',
      lastPing: new Date(now.getTime() - Math.random() * 10000),
      port: 'COM3'
    },
    proximitySensors: {
      sensor1: { 
        status: 'online', 
        lastReading: new Date(now.getTime() - Math.random() * 5000) 
      },
      sensor2: { 
        status: 'online', 
        lastReading: new Date(now.getTime() - Math.random() * 5000) 
      },
      sensor3: { 
        status: Math.random() > 0.8 ? 'error' : 'online', 
        lastReading: new Date(now.getTime() - Math.random() * 15000) 
      }
    },
    networkConnection: {
      status: 'connected',
      latency: Math.floor(Math.random() * 50) + 10
    }
  };
}
