import type { Express } from "express";
import { requireAdminOrFaculty } from "../auth";
import {
  generateAttendanceTrendData,
  generateStudentPerformanceData,
} from "../services/reportingService";
import { storage } from "../storage";

// Helper function to calculate duration between two times
function calculateDuration(checkIn: string, checkOut: string): string {
  try {
    const startTime = new Date(checkIn);
    const endTime = new Date(checkOut);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  } catch (error) {
    return "N/A";
  }
}

export function setupReportRoutes(app: Express) {
  // Reports routes
  app.get(
    "/api/reports/attendance/:sessionId",
    requireAdminOrFaculty,
    async (req, res) => {
      try {
        const sessionId = parseInt(req.params.sessionId);
        const attendanceRecords = await storage.getAttendanceBySession(
          sessionId
        );
        res.json(attendanceRecords);
      } catch (error) {
        console.error("Error fetching attendance report:", error);
        res.status(500).json({ message: "Failed to fetch attendance report" });
      }
    }
  );

  // Analytics API endpoints
  app.get(
    "/api/reports/attendance-trend",
    requireAdminOrFaculty,
    async (req, res) => {
      try {
        const trendData = await generateAttendanceTrendData();
        res.json(trendData);
      } catch (error) {
        console.error("Error fetching attendance trend data:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch attendance trend data" });
      }
    }
  );

  app.get(
    "/api/reports/student-performance",
    requireAdminOrFaculty,
    async (req, res) => {
      try {
        const performanceData = await generateStudentPerformanceData();
        res.json(performanceData);
      } catch (error) {
        console.error("Error fetching student performance data:", error);
        res
          .status(500)
          .json({ message: "Failed to fetch student performance data" });
      }
    }
  );

  // General reports generation
  app.get(
    "/api/reports/generate",
    requireAdminOrFaculty,
    async (req: any, res) => {
      try {
        const { range, subject, section } = req.query;
        const professorId = req.user.id;

        // Calculate date range
        const endDate = new Date();
        let startDate = new Date();

        switch (range) {
          case "today":
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          default:
            startDate.setDate(startDate.getDate() - 1);
        }

        // Get sessions in date range
        const allSessions = await storage.getAllClassSessions();
        const filteredSessions = allSessions.filter((session) => {
          const sessionDate = new Date(session.createdAt || new Date());
          const isInRange = sessionDate >= startDate && sessionDate <= endDate;

          // For faculty users, only show their sessions
          if (
            req.user.role === "faculty" &&
            session.professorId !== professorId
          ) {
            return false;
          }

          return isInRange;
        });

        // Aggregate attendance data
        const records = [];
        let totalPresent = 0,
          totalLate = 0,
          totalAbsent = 0,
          totalRecords = 0;

        for (const session of filteredSessions) {
          const attendanceRecords = await storage.getAttendanceBySession(
            session.id
          );

          for (const attendance of attendanceRecords) {
            const student = attendance.studentId
              ? await storage.getStudent(attendance.studentId)
              : null;
            if (!student) continue;

            records.push({
              id: attendance.id,
              studentName: `${student.firstName} ${student.lastName}`,
              studentId: student.studentId,
              checkIn: attendance.checkInTime?.toISOString() || "N/A",
              checkOut: attendance.checkOutTime?.toISOString() || "N/A",
              status: attendance.status,
              duration:
                attendance.checkInTime && attendance.checkOutTime
                  ? calculateDuration(
                      attendance.checkInTime.toISOString(),
                      attendance.checkOutTime.toISOString()
                    )
                  : "N/A",
            });

            // Update totals
            totalRecords++;
            if (attendance.status === "present") totalPresent++;
            else if (attendance.status === "late") totalLate++;
            else if (attendance.status === "absent") totalAbsent++;
          }
        }

        const summary = {
          total: totalRecords,
          present: totalPresent,
          late: totalLate,
          absent: totalAbsent,
        };

        res.json({ records, summary });
      } catch (error) {
        console.error("Error generating report:", error);
        res.status(500).json({ message: "Failed to generate report" });
      }
    }
  );

  // Report export endpoint
  app.get(
    "/api/reports/export",
    requireAdminOrFaculty,
    async (req: any, res) => {
      try {
        const { range, subject, section, format } = req.query;
        const professorId = req.user.id;

        // Reuse the generate logic to get the data
        const endDate = new Date();
        let startDate = new Date();

        switch (range) {
          case "today":
            startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            break;
          case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
          case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          default:
            startDate.setDate(startDate.getDate() - 1);
        }

        const allSessions = await storage.getAllClassSessions();
        const filteredSessions = allSessions.filter((session) => {
          const sessionDate = new Date(session.createdAt || new Date());
          const isInRange = sessionDate >= startDate && sessionDate <= endDate;

          if (
            req.user.role === "faculty" &&
            session.professorId !== professorId
          ) {
            return false;
          }

          return isInRange;
        });

        // Generate CSV data
        let csvData =
          "Student ID,Student Name,Check In,Check Out,Duration,Status\n";

        for (const session of filteredSessions) {
          const attendanceRecords = await storage.getAttendanceBySession(
            session.id
          );

          for (const attendance of attendanceRecords) {
            const student = attendance.studentId
              ? await storage.getStudent(attendance.studentId)
              : null;
            if (!student) continue;

            const checkIn = attendance.checkInTime?.toISOString() || "N/A";
            const checkOut = attendance.checkOutTime?.toISOString() || "N/A";
            const duration =
              attendance.checkInTime && attendance.checkOutTime
                ? calculateDuration(
                    attendance.checkInTime.toISOString(),
                    attendance.checkOutTime.toISOString()
                  )
                : "N/A";

            csvData += `"${student.studentId}","${student.firstName} ${student.lastName}","${checkIn}","${checkOut}","${duration}","${attendance.status}"\n`;
          }
        }

        // Set appropriate headers for CSV download
        const filename = `attendance-report-${range}-${
          new Date().toISOString().split("T")[0]
        }.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );

        res.send(csvData);
      } catch (error) {
        console.error("Error exporting report:", error);
        res.status(500).json({ message: "Failed to export report" });
      }
    }
  );

  app.get(
    "/api/reports/daily/:date",
    requireAdminOrFaculty,
    async (req: any, res) => {
      try {
        const date = new Date(req.params.date);
        const professorId = req.user.id;

        // Get sessions for the day
        const sessions = await storage.getClassSessionsByDate(date);
        const professorSessions = sessions.filter(
          (s) => s.professorId === professorId
        );

        const report = {
          date: date.toISOString().split("T")[0],
          totalSessions: professorSessions.length,
          attendanceData: [] as any[],
        };

        for (const session of professorSessions) {
          const attendance = await storage.getAttendanceBySession(session.id);
          const present = attendance.filter(
            (a) => a.status === "present" || a.status === "late"
          ).length;
          const absent = attendance.filter((a) => a.status === "absent").length;

          report.attendanceData.push({
            sessionId: session.id,
            subject: session.scheduleId,
            totalStudents: attendance.length,
            present,
            absent,
            attendanceRate:
              attendance.length > 0
                ? Math.round((present / attendance.length) * 100)
                : 0,
          });
        }

        res.json(report);
      } catch (error) {
        console.error("Error generating daily report:", error);
        res.status(500).json({ message: "Failed to generate daily report" });
      }
    }
  );

  app.get(
    "/api/reports/student/:studentId",
    requireAdminOrFaculty,
    async (req, res) => {
      try {
        const studentId = parseInt(req.params.studentId);
        const { startDate, endDate } = req.query;

        // Get student details
        const student = await storage.getStudent(studentId);
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }

        // Get attendance records for date range
        const attendanceQuery = `
        SELECT a.*, s.date, sub.name as subject_name, sub.code as subject_code
        FROM attendance a
        JOIN class_sessions s ON a.session_id = s.id
        JOIN schedules sch ON s.schedule_id = sch.id
        JOIN subjects sub ON sch.subject_id = sub.id
        WHERE a.student_id = $1
        ${startDate ? "AND s.date >= $2" : ""}
        ${endDate ? "AND s.date <= $3" : ""}
        ORDER BY s.date DESC
      `;

        // For now, return basic student info and a placeholder for attendance
        const report = {
          student,
          attendanceRecords: [],
          summary: {
            totalClasses: 0,
            presentCount: 0,
            lateCount: 0,
            absentCount: 0,
            attendanceRate: 0,
          },
        };

        res.json(report);
      } catch (error) {
        console.error("Error generating student report:", error);
        res.status(500).json({ message: "Failed to generate student report" });
      }
    }
  );

  // Export routes for downloading reports
  app.get(
    "/api/reports/export/csv/:type",
    requireAdminOrFaculty,
    async (req: any, res) => {
      try {
        const { type } = req.params;
        const { sessionId, date, studentId } = req.query;

        let csvData = "";
        let filename = "";

        if (type === "attendance" && sessionId) {
          const attendance = await storage.getAttendanceBySession(
            parseInt(sessionId)
          );
          csvData = "Student ID,Name,Status,Check In,Check Out\n";

          for (const record of attendance) {
            if (record.studentId) {
              const student = await storage.getStudent(record.studentId);
              csvData += `${student?.studentId || "N/A"},${
                student?.firstName
              } ${student?.lastName},${record.status},${
                record.checkInTime || "N/A"
              },${record.checkOutTime || "N/A"}\n`;
            }
          }

          filename = `attendance_session_${sessionId}.csv`;
        }

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${filename}"`
        );
        res.send(csvData);
      } catch (error) {
        console.error("Error exporting report:", error);
        res.status(500).json({ message: "Failed to export report" });
      }
    }
  );
}
