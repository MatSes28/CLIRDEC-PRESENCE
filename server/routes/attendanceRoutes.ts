import { insertAttendanceSchema } from "@shared/schema";
import type { Express } from "express";
import { requireAdminOrFaculty } from "../auth";
import { attendanceValidationService } from "../services/attendanceValidationService";
import { simulateRFIDTap } from "../services/rfidSimulator";
import { checkAutoStartSessions } from "../services/scheduleService";
import { storage } from "../storage";

export function setupAttendanceRoutes(app: Express) {
  // Attendance management routes
  app.get(
    "/api/attendance/:sessionId",
    requireAdminOrFaculty,
    async (req, res) => {
      try {
        const sessionId = parseInt(req.params.sessionId);
        if (isNaN(sessionId)) {
          return res.status(400).json({ message: "Invalid session ID" });
        }
        const attendance = await storage.getAttendanceBySession(sessionId);
        res.json(attendance);
      } catch (error) {
        console.error("Error fetching attendance:", error);
        res.status(500).json({ message: "Failed to fetch attendance" });
      }
    }
  );

  app.post("/api/attendance", requireAdminOrFaculty, async (req, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      console.error("Error creating attendance:", error);
      res.status(400).json({ message: "Failed to create attendance record" });
    }
  });

  // RFID simulation routes
  app.post("/api/rfid/simulate", requireAdminOrFaculty, async (req, res) => {
    try {
      const { rfidCardId, sessionId } = req.body;
      const result = await simulateRFIDTap(rfidCardId, sessionId);
      res.json(result);
    } catch (error) {
      console.error("Error simulating RFID tap:", error);
      res.status(400).json({ message: "Failed to process RFID tap" });
    }
  });

  // Auto-start session check (called periodically)
  app.post(
    "/api/schedules/check-auto-start",
    requireAdminOrFaculty,
    async (req, res) => {
      try {
        const result = await checkAutoStartSessions();
        res.json(result);
      } catch (error) {
        console.error("Error checking auto-start sessions:", error);
        res
          .status(500)
          .json({ message: "Failed to check auto-start sessions" });
      }
    }
  );

  // Advanced Attendance Validation API - Final Logic Implementation
  app.post(
    "/api/attendance/validate-rfid",
    requireAdminOrFaculty,
    async (req, res) => {
      try {
        const { rfidCardId, sessionId, deviceId } = req.body;

        if (!rfidCardId || !sessionId) {
          return res
            .status(400)
            .json({ message: "RFID card ID and session ID are required" });
        }

        const result = await attendanceValidationService.validateRFIDTap({
          rfidCardId,
          sessionId: parseInt(sessionId),
          deviceId,
          timestamp: new Date(),
        });

        res.json(result);
      } catch (error) {
        console.error("Error validating RFID tap:", error);
        res.status(500).json({ message: "Failed to validate RFID tap" });
      }
    }
  );

  app.post(
    "/api/attendance/validate-sensor",
    requireAdminOrFaculty,
    async (req, res) => {
      try {
        const { sessionId, studentId, detectionType, deviceId } = req.body;

        if (!sessionId || !studentId || !detectionType) {
          return res
            .status(400)
            .json({
              message:
                "Session ID, student ID, and detection type are required",
            });
        }

        const result =
          await attendanceValidationService.validateSensorDetection(
            parseInt(sessionId),
            parseInt(studentId),
            detectionType,
            new Date()
          );

        res.json(result);
      } catch (error) {
        console.error("Error validating sensor detection:", error);
        res
          .status(500)
          .json({ message: "Failed to validate sensor detection" });
      }
    }
  );

  app.get(
    "/api/attendance/session-mode/:sessionId",
    requireAdminOrFaculty,
    async (req, res) => {
      try {
        const sessionId = parseInt(req.params.sessionId);
        const sessionMode =
          attendanceValidationService.getSessionMode(sessionId);

        if (!sessionMode) {
          return res
            .status(404)
            .json({ message: "Session not found or not active" });
        }

        res.json(sessionMode);
      } catch (error) {
        console.error("Error getting session mode:", error);
        res.status(500).json({ message: "Failed to get session mode" });
      }
    }
  );

  app.get(
    "/api/attendance/pending-validations",
    requireAdminOrFaculty,
    (req, res) => {
      try {
        const pendingValidations =
          attendanceValidationService.getPendingValidations();
        res.json({
          pendingValidations,
          count: pendingValidations.length,
        });
      } catch (error) {
        console.error("Error getting pending validations:", error);
        res.status(500).json({ message: "Failed to get pending validations" });
      }
    }
  );

  app.get(
    "/api/attendance/discrepancies",
    requireAdminOrFaculty,
    async (req, res) => {
      try {
        // Get attendance records with discrepancy flags
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sessions = await storage.getClassSessionsByDate(today);

        const discrepancies = [];
        for (const session of sessions) {
          const attendanceRecords = await storage.getAttendanceBySession(
            session.id
          );
          const flaggedRecords = attendanceRecords.filter(
            (record: any) =>
              record.discrepancyFlag && record.discrepancyFlag !== "normal"
          );

          for (const record of flaggedRecords) {
            const student = record.studentId
              ? await storage.getStudent(record.studentId)
              : null;
            discrepancies.push({
              ...record,
              student,
              session,
            });
          }
        }

        res.json({
          discrepancies,
          count: discrepancies.length,
          date: today,
        });
      } catch (error) {
        console.error("Error getting discrepancies:", error);
        res
          .status(500)
          .json({ message: "Failed to get attendance discrepancies" });
      }
    }
  );
}
