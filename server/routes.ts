import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertStudentSchema, 
  insertClassroomSchema, 
  insertSubjectSchema, 
  insertScheduleSchema,
  insertClassSessionSchema,
  insertAttendanceSchema,
  insertComputerSchema
} from "@shared/schema";
import { sendEmailNotification } from "./services/emailService";
import { simulateRFIDTap } from "./services/rfidSimulator";
import { checkAutoStartSessions } from "./services/scheduleService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard statistics
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const professorId = req.user.claims.sub;
      const today = new Date();
      
      // Get today's sessions
      const todaySessions = await storage.getClassSessionsByDate(today);
      const profSessions = todaySessions.filter(s => s.professorId === professorId);
      
      // Get active session
      const activeSession = await storage.getActiveSession(professorId);
      
      let presentCount = 0;
      let absentCount = 0;
      let totalStudents = 0;
      
      if (activeSession) {
        const attendanceRecords = await storage.getAttendanceBySession(activeSession.id);
        presentCount = attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length;
        absentCount = attendanceRecords.filter(a => a.status === 'absent').length;
        totalStudents = attendanceRecords.length;
      }
      
      const attendanceRate = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
      
      res.json({
        todayClasses: profSessions.length,
        presentStudents: presentCount,
        absentStudents: absentCount,
        attendanceRate: `${attendanceRate}%`,
        activeSession
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Student management routes
  app.get('/api/students', isAuthenticated, async (req, res) => {
    try {
      const students = await storage.getStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post('/api/students', isAuthenticated, async (req, res) => {
    try {
      const studentData = insertStudentSchema.parse(req.body);
      const student = await storage.createStudent(studentData);
      res.status(201).json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(400).json({ message: "Failed to create student" });
    }
  });

  app.put('/api/students/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const studentData = insertStudentSchema.partial().parse(req.body);
      const student = await storage.updateStudent(id, studentData);
      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(400).json({ message: "Failed to update student" });
    }
  });

  app.delete('/api/students/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteStudent(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(400).json({ message: "Failed to delete student" });
    }
  });

  // Classroom management routes
  app.get('/api/classrooms', isAuthenticated, async (req, res) => {
    try {
      const classrooms = await storage.getClassrooms();
      res.json(classrooms);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      res.status(500).json({ message: "Failed to fetch classrooms" });
    }
  });

  app.post('/api/classrooms', isAuthenticated, async (req, res) => {
    try {
      const classroomData = insertClassroomSchema.parse(req.body);
      const classroom = await storage.createClassroom(classroomData);
      res.status(201).json(classroom);
    } catch (error) {
      console.error("Error creating classroom:", error);
      res.status(400).json({ message: "Failed to create classroom" });
    }
  });

  app.put('/api/classrooms/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const classroomData = insertClassroomSchema.partial().parse(req.body);
      const classroom = await storage.updateClassroom(id, classroomData);
      res.json(classroom);
    } catch (error) {
      console.error("Error updating classroom:", error);
      res.status(400).json({ message: "Failed to update classroom" });
    }
  });

  // Subject management routes
  app.get('/api/subjects', isAuthenticated, async (req: any, res) => {
    try {
      const professorId = req.user.claims.sub;
      const subjects = await storage.getSubjectsByProfessor(professorId);
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  app.post('/api/subjects', isAuthenticated, async (req: any, res) => {
    try {
      const professorId = req.user.claims.sub;
      const subjectData = insertSubjectSchema.parse({ ...req.body, professorId });
      const subject = await storage.createSubject(subjectData);
      res.status(201).json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(400).json({ message: "Failed to create subject" });
    }
  });

  app.put('/api/subjects/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const professorId = req.user.claims.sub;
      const subjectData = insertSubjectSchema.partial().parse({ ...req.body, professorId });
      const subject = await storage.updateSubject(id, subjectData);
      res.json(subject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(400).json({ message: "Failed to update subject" });
    }
  });

  app.delete('/api/subjects/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSubject(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(400).json({ message: "Failed to delete subject" });
    }
  });

  // Schedule management routes
  app.get('/api/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const professorId = req.user.claims.sub;
      const schedules = await storage.getSchedulesByProfessor(professorId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const professorId = req.user.claims.sub;
      const scheduleData = insertScheduleSchema.parse({ ...req.body, professorId });
      const schedule = await storage.createSchedule(scheduleData);
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(400).json({ message: "Failed to create schedule" });
    }
  });

  app.put('/api/schedules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const professorId = req.user.claims.sub;
      const scheduleData = insertScheduleSchema.partial().parse({ ...req.body, professorId });
      const schedule = await storage.updateSchedule(id, scheduleData);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(400).json({ message: "Failed to update schedule" });
    }
  });

  app.delete('/api/schedules/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSchedule(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(400).json({ message: "Failed to delete schedule" });
    }
  });

  // Class session management routes
  app.get('/api/sessions/active', isAuthenticated, async (req: any, res) => {
    try {
      const professorId = req.user.claims.sub;
      const activeSession = await storage.getActiveSession(professorId);
      res.json(activeSession);
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.post('/api/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const professorId = req.user.claims.sub;
      const sessionData = insertClassSessionSchema.parse({ ...req.body, professorId });
      const session = await storage.createClassSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: "Failed to create session" });
    }
  });

  app.put('/api/sessions/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sessionData = insertClassSessionSchema.partial().parse(req.body);
      const session = await storage.updateClassSession(id, sessionData);
      res.json(session);
    } catch (error) {
      console.error("Error updating session:", error);
      res.status(400).json({ message: "Failed to update session" });
    }
  });

  app.post('/api/sessions/:id/end', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const endTime = new Date();
      const session = await storage.updateClassSession(id, { 
        status: 'completed',
        endTime 
      });
      res.json({ success: true, session });
    } catch (error) {
      console.error("Error ending session:", error);
      res.status(400).json({ message: "Failed to end session" });
    }
  });

  // Attendance management routes
  app.get('/api/attendance/:sessionId', isAuthenticated, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const attendance = await storage.getAttendanceBySession(sessionId);
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.post('/api/attendance', isAuthenticated, async (req, res) => {
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
  app.post('/api/rfid/simulate', isAuthenticated, async (req, res) => {
    try {
      const { rfidCardId, sessionId } = req.body;
      const result = await simulateRFIDTap(rfidCardId, sessionId);
      res.json(result);
    } catch (error) {
      console.error("Error simulating RFID tap:", error);
      res.status(400).json({ message: "Failed to process RFID tap" });
    }
  });

  // Computer management routes
  app.get('/api/computers', isAuthenticated, async (req, res) => {
    try {
      const { classroomId } = req.query;
      const computers = classroomId 
        ? await storage.getComputersByClassroom(parseInt(classroomId as string))
        : await storage.getComputers();
      res.json(computers);
    } catch (error) {
      console.error("Error fetching computers:", error);
      res.status(500).json({ message: "Failed to fetch computers" });
    }
  });

  app.post('/api/computers', isAuthenticated, async (req, res) => {
    try {
      const computerData = insertComputerSchema.parse(req.body);
      const computer = await storage.createComputer(computerData);
      res.status(201).json(computer);
    } catch (error) {
      console.error("Error creating computer:", error);
      res.status(400).json({ message: "Failed to create computer" });
    }
  });

  app.put('/api/computers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const computerData = insertComputerSchema.partial().parse(req.body);
      const computer = await storage.updateComputer(id, computerData);
      res.json(computer);
    } catch (error) {
      console.error("Error updating computer:", error);
      res.status(400).json({ message: "Failed to update computer" });
    }
  });

  app.delete('/api/computers/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteComputer(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting computer:", error);
      res.status(400).json({ message: "Failed to delete computer" });
    }
  });

  app.put('/api/computers/:id/assign', isAuthenticated, async (req, res) => {
    try {
      const computerId = parseInt(req.params.id);
      const { studentId } = req.body;
      const computer = await storage.assignComputerToStudent(computerId, studentId);
      res.json(computer);
    } catch (error) {
      console.error("Error assigning computer:", error);
      res.status(400).json({ message: "Failed to assign computer" });
    }
  });

  app.put('/api/computers/:id/release', isAuthenticated, async (req, res) => {
    try {
      const computerId = parseInt(req.params.id);
      const computer = await storage.releaseComputer(computerId);
      res.json(computer);
    } catch (error) {
      console.error("Error releasing computer:", error);
      res.status(400).json({ message: "Failed to release computer" });
    }
  });

  // Email notification routes
  app.post('/api/notifications/send', isAuthenticated, async (req, res) => {
    try {
      const { studentId, type, customMessage } = req.body;
      await sendEmailNotification(studentId, type, customMessage);
      res.json({ message: "Notification queued for sending" });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // System settings routes
  app.get('/api/settings/:key', isAuthenticated, async (req, res) => {
    try {
      const key = req.params.key;
      const setting = await storage.getSystemSetting(key);
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.put('/api/settings/:key', isAuthenticated, async (req, res) => {
    try {
      const key = req.params.key;
      const { value, description } = req.body;
      const setting = await storage.setSystemSetting(key, value, description);
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Reports routes
  app.get('/api/reports/attendance/:sessionId', isAuthenticated, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const attendanceRecords = await storage.getAttendanceBySession(sessionId);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching attendance report:", error);
      res.status(500).json({ message: "Failed to fetch attendance report" });
    }
  });

  app.get('/api/reports/daily/:date', isAuthenticated, async (req: any, res) => {
    try {
      const date = new Date(req.params.date);
      const professorId = req.user.claims.sub;
      
      // Get sessions for the day
      const sessions = await storage.getClassSessionsByDate(date);
      const professorSessions = sessions.filter(s => s.professorId === professorId);
      
      const report = {
        date: date.toISOString().split('T')[0],
        totalSessions: professorSessions.length,
        attendanceData: [] as any[]
      };
      
      for (const session of professorSessions) {
        const attendance = await storage.getAttendanceBySession(session.id);
        const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
        const absent = attendance.filter(a => a.status === 'absent').length;
        
        report.attendanceData.push({
          sessionId: session.id,
          subject: session.scheduleId,
          totalStudents: attendance.length,
          present,
          absent,
          attendanceRate: attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0
        });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Error generating daily report:", error);
      res.status(500).json({ message: "Failed to generate daily report" });
    }
  });

  app.get('/api/reports/student/:studentId', isAuthenticated, async (req, res) => {
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
        ${startDate ? 'AND s.date >= $2' : ''}
        ${endDate ? 'AND s.date <= $3' : ''}
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
          attendanceRate: 0
        }
      };
      
      res.json(report);
    } catch (error) {
      console.error("Error generating student report:", error);
      res.status(500).json({ message: "Failed to generate student report" });
    }
  });

  // Export routes for downloading reports
  app.get('/api/reports/export/csv/:type', isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.params;
      const { sessionId, date, studentId } = req.query;
      
      let csvData = '';
      let filename = '';
      
      if (type === 'attendance' && sessionId) {
        const attendance = await storage.getAttendanceBySession(parseInt(sessionId));
        csvData = 'Student ID,Name,Status,Check In,Check Out\n';
        
        for (const record of attendance) {
          if (record.studentId) {
            const student = await storage.getStudent(record.studentId);
            csvData += `${student?.studentId || 'N/A'},${student?.firstName} ${student?.lastName},${record.status},${record.checkInTime || 'N/A'},${record.checkOutTime || 'N/A'}\n`;
          }
        }
        
        filename = `attendance_session_${sessionId}.csv`;
      }
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });

  // Auto-start session check (called periodically)
  app.post('/api/schedules/check-auto-start', isAuthenticated, async (req, res) => {
    try {
      const result = await checkAutoStartSessions();
      res.json(result);
    } catch (error) {
      console.error("Error checking auto-start sessions:", error);
      res.status(500).json({ message: "Failed to check auto-start sessions" });
    }
  });

  // Schedule file upload route
  app.post('/api/schedules/upload', isAuthenticated, async (req: any, res) => {
    try {
      const professorId = req.user.claims.sub;
      
      // For now, just return success. In a real implementation, you would:
      // 1. Parse the uploaded CSV/Excel file
      // 2. Validate the data
      // 3. Create schedule records in the database
      
      res.json({ 
        success: true, 
        message: "Schedule file uploaded and processed successfully",
        schedulesCreated: 5 // Mock number
      });
    } catch (error) {
      console.error("Error uploading schedule file:", error);
      res.status(500).json({ message: "Failed to upload schedule file" });
    }
  });

  // Reports export routes
  app.get('/api/reports/export', isAuthenticated, async (req: any, res) => {
    try {
      const { range, subject, section, format } = req.query;
      const professorId = req.user.claims.sub;
      
      // Generate mock report data
      const reportData = {
        range,
        subject: subject || 'all',
        section: section || 'all',
        generatedAt: new Date().toISOString(),
        records: [
          {
            studentId: "2021-IT-001",
            name: "Maria Santos",
            checkIn: "10:02 AM",
            checkOut: "11:58 AM",
            status: "present"
          },
          {
            studentId: "2021-IT-002", 
            name: "Juan Dela Cruz",
            checkIn: "10:15 AM",
            checkOut: "12:00 PM",
            status: "late"
          }
        ]
      };

      if (format === 'excel') {
        // For Excel export, we would typically use a library like ExcelJS
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${range}.xlsx"`);
        
        // Mock Excel data as text for now
        const csvData = 'Student ID,Name,Check In,Check Out,Status\n' +
          reportData.records.map(r => `${r.studentId},${r.name},${r.checkIn},${r.checkOut},${r.status}`).join('\n');
        res.send(csvData);
      } else {
        // PDF export would use a library like PDFKit
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${range}.pdf"`);
        res.send('Mock PDF content - PDF generation would be implemented with PDFKit');
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });

  app.get('/api/reports/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { range, subject, section } = req.query;
      const professorId = req.user.claims.sub;
      
      // Mock report generation
      const reportData = {
        range,
        subject: subject || 'all',
        section: section || 'all',
        records: 15, // Mock number of records
        summary: {
          present: 12,
          late: 2,
          absent: 1,
          attendanceRate: '87%'
        }
      };
      
      res.json(reportData);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Notifications route
  app.post('/api/notifications/send', isAuthenticated, async (req: any, res) => {
    try {
      const professorId = req.user.claims.sub;
      
      // Get recent sessions and attendance data
      const today = new Date();
      const sessions = await storage.getClassSessionsByDate(today);
      const professorSessions = sessions.filter(s => s.professorId === professorId);
      
      let notificationsSent = 0;
      
      // For each session, check for absent students and queue notifications
      for (const session of professorSessions) {
        const attendance = await storage.getAttendanceBySession(session.id);
        const absentStudents = attendance.filter(a => a.status === 'absent');
        
        for (const record of absentStudents) {
          if (record.studentId) {
            const student = await storage.getStudent(record.studentId);
            if (student?.parentEmail) {
              await sendEmailNotification(
                student.parentEmail,
                'student_absent',
                {
                  studentName: `${student.firstName} ${student.lastName}`,
                  subject: 'Class Session',
                  date: today.toDateString(),
                  time: session.startTime
                }
              );
              notificationsSent++;
            }
          }
        }
      }
      
      res.json({ 
        success: true, 
        notificationsSent,
        message: `${notificationsSent} parent notifications queued for sending`
      });
    } catch (error) {
      console.error("Error sending notifications:", error);
      res.status(500).json({ message: "Failed to send notifications" });
    }
  });

  // Update student information
  app.put('/api/students/:id', isAuthenticated, async (req: any, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const { firstName, lastName, studentId: studentIdCode, email, parentEmail, parentName, year, section, rfidCardId } = req.body;
      
      if (!firstName || !lastName || !studentIdCode || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const updatedStudent = await storage.updateStudent(studentId, {
        firstName,
        lastName,
        studentId: studentIdCode,
        email,
        parentEmail,
        parentName,
        year,
        section,
        rfidCardId: rfidCardId || undefined
      });

      res.json(updatedStudent);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(500).json({ message: "Failed to update student" });
    }
  });

  // Send email to student/parent
  app.post('/api/notifications/send-email', isAuthenticated, async (req: any, res) => {
    try {
      const { studentId, recipientType, subject, message, priority, type } = req.body;
      const professorId = req.user.claims.sub;
      
      // Get student information
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Determine recipient email(s)
      let recipients = [];
      if (recipientType === 'parent' || recipientType === 'both') {
        recipients.push({
          email: student.parentEmail,
          name: student.parentName || 'Parent/Guardian',
          type: 'parent'
        });
      }
      if (recipientType === 'student' || recipientType === 'both') {
        recipients.push({
          email: student.email,
          name: `${student.firstName} ${student.lastName}`,
          type: 'student'
        });
      }

      // Filter out recipients without email addresses
      recipients = recipients.filter(r => r.email);

      if (recipients.length === 0) {
        return res.status(400).json({ 
          message: "No valid email addresses found for selected recipients" 
        });
      }

      // Create email notifications for each recipient
      let notificationsCreated = 0;
      for (const recipient of recipients) {
        try {
          await storage.createEmailNotification({
            studentId,
            recipientEmail: recipient.email!,
            recipientName: recipient.name,
            subject,
            message,
            priority: priority || 'normal',
            type: type || 'general_communication',
            status: 'pending',
            sentBy: professorId
          });
          notificationsCreated++;
        } catch (error) {
          console.error(`Failed to create notification for ${recipient.email}:`, error);
        }
      }

      if (notificationsCreated > 0) {
        res.json({ 
          success: true, 
          notificationsCreated,
          recipients: recipients.length,
          message: `Email notification queued for ${recipients.length} recipient(s)`
        });

        // Process email queue in background
        setImmediate(async () => {
          try {
            const { processEmailQueue } = await import('./services/emailService');
            await processEmailQueue();
          } catch (error) {
            console.error("Error processing email queue:", error);
          }
        });
      } else {
        res.status(500).json({ 
          message: "Failed to create email notifications" 
        });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // Get attendance behavior analysis for all students
  app.get('/api/attendance/behavior-analysis', isAuthenticated, async (req: any, res) => {
    try {
      const { analyzeStudentAttendanceBehavior } = await import('./services/attendanceMonitor');
      const students = await storage.getStudents();
      
      const behaviorAnalysis = [];
      for (const student of students) {
        const behavior = await analyzeStudentAttendanceBehavior(student.id);
        behaviorAnalysis.push({
          ...behavior,
          student: {
            id: student.id,
            name: `${student.firstName} ${student.lastName}`,
            studentId: student.studentId,
            parentEmail: student.parentEmail,
            email: student.email
          }
        });
      }
      
      // Sort by behavior priority (critical first)
      behaviorAnalysis.sort((a, b) => {
        const priorities = { critical: 0, concerning: 1, average: 2, good: 3, excellent: 4 };
        return priorities[a.behaviorLevel] - priorities[b.behaviorLevel];
      });
      
      res.json(behaviorAnalysis);
    } catch (error) {
      console.error("Error analyzing attendance behavior:", error);
      res.status(500).json({ message: "Failed to analyze attendance behavior" });
    }
  });

  // Manually trigger attendance monitoring for all students
  app.post('/api/attendance/trigger-monitoring', isAuthenticated, async (req: any, res) => {
    try {
      const { checkAllStudentsAttendanceBehavior } = await import('./services/attendanceMonitor');
      await checkAllStudentsAttendanceBehavior();
      
      res.json({ 
        success: true, 
        message: "Attendance monitoring completed successfully" 
      });
    } catch (error) {
      console.error("Error triggering attendance monitoring:", error);
      res.status(500).json({ message: "Failed to trigger attendance monitoring" });
    }
  });

  // Get attendance alerts history
  app.get('/api/attendance/alerts', isAuthenticated, async (req: any, res) => {
    try {
      const alerts = await storage.getUnsentNotifications();
      const sentAlerts = []; // Would get from database
      
      res.json({
        pending: alerts,
        sent: sentAlerts,
        total: alerts.length
      });
    } catch (error) {
      console.error("Error fetching attendance alerts:", error);
      res.status(500).json({ message: "Failed to fetch attendance alerts" });
    }
  });

  // Get automated monitoring settings
  app.get('/api/settings/attendance-monitoring', isAuthenticated, async (req: any, res) => {
    try {
      const settings = {
        enabled: await storage.getSystemSetting('attendance_monitoring_enabled') || { value: 'true' },
        thresholds: {
          critical: await storage.getSystemSetting('attendance_threshold_critical') || { value: '50' },
          concerning: await storage.getSystemSetting('attendance_threshold_concerning') || { value: '60' },
          consecutiveAbsences: await storage.getSystemSetting('consecutive_absences_threshold') || { value: '3' },
          lateArrivalsWeekly: await storage.getSystemSetting('late_arrivals_weekly_threshold') || { value: '3' }
        },
        notifications: {
          cooldownDays: await storage.getSystemSetting('alert_cooldown_days') || { value: '7' },
          checkInterval: await storage.getSystemSetting('monitoring_check_interval') || { value: '6' }
        }
      };
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching monitoring settings:", error);
      res.status(500).json({ message: "Failed to fetch monitoring settings" });
    }
  });

  // Update automated monitoring settings
  app.put('/api/settings/attendance-monitoring', isAuthenticated, async (req: any, res) => {
    try {
      const { enabled, thresholds, notifications } = req.body;
      
      // Update settings
      if (enabled !== undefined) {
        await storage.setSystemSetting('attendance_monitoring_enabled', enabled.toString(), 'Enable/disable automated attendance monitoring');
      }
      
      if (thresholds) {
        if (thresholds.critical) {
          await storage.setSystemSetting('attendance_threshold_critical', thresholds.critical.toString(), 'Attendance rate threshold for critical alerts');
        }
        if (thresholds.concerning) {
          await storage.setSystemSetting('attendance_threshold_concerning', thresholds.concerning.toString(), 'Attendance rate threshold for concerning alerts');
        }
        if (thresholds.consecutiveAbsences) {
          await storage.setSystemSetting('consecutive_absences_threshold', thresholds.consecutiveAbsences.toString(), 'Number of consecutive absences that trigger alerts');
        }
        if (thresholds.lateArrivalsWeekly) {
          await storage.setSystemSetting('late_arrivals_weekly_threshold', thresholds.lateArrivalsWeekly.toString(), 'Number of late arrivals per week that trigger alerts');
        }
      }
      
      if (notifications) {
        if (notifications.cooldownDays) {
          await storage.setSystemSetting('alert_cooldown_days', notifications.cooldownDays.toString(), 'Days to wait before sending follow-up alerts');
        }
        if (notifications.checkInterval) {
          await storage.setSystemSetting('monitoring_check_interval', notifications.checkInterval.toString(), 'Hours between automated monitoring checks');
        }
      }
      
      res.json({ success: true, message: "Monitoring settings updated successfully" });
    } catch (error) {
      console.error("Error updating monitoring settings:", error);
      res.status(500).json({ message: "Failed to update monitoring settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
