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
      res.status(400).json({ message: "Failed to update setting" });
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

  const httpServer = createServer(app);
  return httpServer;
}
