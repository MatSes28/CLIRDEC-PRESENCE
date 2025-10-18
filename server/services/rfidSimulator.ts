import { storage } from "../storage";

export interface RFIDTapResult {
  success: boolean;
  message: string;
  student?: any;
  attendanceRecord?: any;
  action?: "check-in" | "check-out";
}

export async function simulateRFIDTap(
  rfidCardId: string,
  sessionId: number
): Promise<RFIDTapResult> {
  try {
    // Find student by RFID card
    const student = await storage.getStudentByRFID(rfidCardId);
    if (!student) {
      return {
        success: false,
        message:
          "RFID card not recognized. Please register your card with the system.",
      };
    }

    // Check if student already has attendance record for this session
    const existingAttendance = await storage.checkStudentAttendance(
      student.id,
      sessionId
    );

    const now = new Date();

    if (!existingAttendance) {
      // First tap - check in
      // Get session details to check if student is late
      const sessions = await storage.getAllClassSessions();
      const session = sessions.find((s) => s.id === sessionId);
      let status = "present";

      if (session && session.startTime) {
        const sessionStart = new Date(session.startTime);
        const currentTime = new Date();

        // Calculate class duration from start and end time, or default to 3 hours (180 minutes)
        let classDuration = 180; // Default 3 hours
        if (session.endTime && session.startTime) {
          classDuration =
            (new Date(session.endTime).getTime() -
              new Date(session.startTime).getTime()) /
            (1000 * 60);
        }

        // Calculate time elapsed since session started (in minutes)
        const timeElapsed =
          (currentTime.getTime() - sessionStart.getTime()) / (1000 * 60);

        const lateThreshold = classDuration * 0.6; // 60% of class time

        // Debug log for testing (development only)
        if (process.env.NODE_ENV === "development") {
          console.log(`🕐 ATTENDANCE CHECK DEBUG:`);
          console.log(`- Student: ${student.firstName} ${student.lastName}`);
          console.log(`- Session Start: ${sessionStart.toLocaleTimeString()}`);
          console.log(`- Check-in Time: ${currentTime.toLocaleTimeString()}`);
          console.log(`- Time Elapsed: ${Math.round(timeElapsed)} minutes`);
          console.log(`- Class Duration: ${classDuration} minutes`);
          console.log(
            `- 60% Threshold: ${Math.round(
              classDuration * 0.6
            )} minutes (${Math.round((classDuration * 0.6) / 60)}h ${Math.round(
              (classDuration * 0.6) % 60
            )}m)`
          );
        }

        // If student arrives after 60% of class time, mark as absent
        // If student arrives between 15 minutes and 60% of class time, mark as late
        if (timeElapsed > lateThreshold) {
          status = "absent"; // After 60% = absent even if they check in
          if (process.env.NODE_ENV === "development") {
            console.log(`❌ STATUS: ABSENT (arrived after 60% threshold)`);
          }
        } else if (timeElapsed > 15) {
          status = "late"; // Between 15 min and 60% = late
          if (process.env.NODE_ENV === "development") {
            console.log(
              `⚠️ STATUS: LATE (arrived after 15 min but before 60%)`
            );
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            console.log(`✅ STATUS: PRESENT (arrived on time)`);
          }
        }
      }

      const attendanceRecord = await storage.createAttendance({
        sessionId,
        studentId: student.id,
        checkInTime: now,
        status: status as "present" | "late" | "absent",
        proximityValidated: true, // Simulate proximity sensor validation
      });

      // Create appropriate message based on status
      let message = `Welcome ${student.firstName}! You have successfully checked in.`;
      if (status === "late") {
        message = `${student.firstName}, you are marked as LATE. Please try to arrive on time next time.`;
      } else if (status === "absent") {
        message = `${student.firstName}, you are marked as ABSENT due to arriving after 60% of class time. Your check-in is recorded for attendance tracking.`;
      }

      return {
        success: true,
        message,
        student,
        attendanceRecord,
        action: "check-in",
      };
    } else if (
      existingAttendance.checkInTime &&
      !existingAttendance.checkOutTime
    ) {
      // Second tap - check out
      const updatedAttendance = await storage.updateAttendance(
        existingAttendance.id,
        {
          checkOutTime: now,
        }
      );

      return {
        success: true,
        message: `Goodbye ${student.firstName}! You have successfully checked out.`,
        student,
        attendanceRecord: updatedAttendance,
        action: "check-out",
      };
    } else {
      // Already checked out
      return {
        success: false,
        message: `${student.firstName}, you have already completed attendance for this session.`,
        student,
      };
    }
  } catch (error) {
    console.error("Error processing RFID tap:", error);
    return {
      success: false,
      message:
        "System error occurred while processing RFID tap. Please try again.",
    };
  }
}

export async function simulateProximitySensor(
  sessionId: number
): Promise<boolean> {
  // Simulate proximity sensor detection
  // In a real implementation, this would interface with actual hardware
  const detectionProbability = 0.95; // 95% accuracy rate
  return Math.random() < detectionProbability;
}

export async function validateDualAuthentication(
  rfidCardId: string,
  sessionId: number
): Promise<RFIDTapResult> {
  // Simulate dual validation (RFID + Proximity)
  const proximityDetected = await simulateProximitySensor(sessionId);

  if (!proximityDetected) {
    return {
      success: false,
      message:
        "Proximity sensor did not detect physical presence. Please ensure you are near the scanner.",
    };
  }

  return await simulateRFIDTap(rfidCardId, sessionId);
}

// Generate mock RFID card IDs for testing
export function generateMockRFIDCards(count: number = 50): string[] {
  const cards: string[] = [];
  for (let i = 1; i <= count; i++) {
    cards.push(`RF${String(i).padStart(6, "0")}`);
  }
  return cards;
}

// Simulate hardware status monitoring
export interface HardwareStatus {
  rfidScanner: {
    status: "online" | "offline" | "error";
    lastPing: Date;
    port: string;
  };
  proximitySensors: {
    sensor1: { status: "online" | "offline" | "error"; lastReading: Date };
    sensor2: { status: "online" | "offline" | "error"; lastReading: Date };
    sensor3: { status: "online" | "offline" | "error"; lastReading: Date };
  };
  networkConnection: {
    status: "connected" | "disconnected";
    latency: number;
  };
}

export function getHardwareStatus(): HardwareStatus {
  const now = new Date();

  return {
    rfidScanner: {
      status: "online",
      lastPing: new Date(now.getTime() - Math.random() * 10000),
      port: "COM3",
    },
    proximitySensors: {
      sensor1: {
        status: "online",
        lastReading: new Date(now.getTime() - Math.random() * 5023),
      },
      sensor2: {
        status: "online",
        lastReading: new Date(now.getTime() - Math.random() * 5023),
      },
      sensor3: {
        status: Math.random() > 0.8 ? "error" : "online",
        lastReading: new Date(now.getTime() - Math.random() * 15023),
      },
    },
    networkConnection: {
      status: "connected",
      latency: Math.floor(Math.random() * 50) + 10,
    },
  };
}
