import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, requireAuth, requireAdmin, requireAdminOrFaculty } from "./auth";
import { eq } from "drizzle-orm";
import { 
  insertStudentSchema,
  updateStudentSchema,
  updateClassroomSchema,
  updateSubjectSchema,
  updateScheduleSchema,
  updateComputerSchema,
  insertClassroomSchema, 
  insertSubjectSchema, 
  insertScheduleSchema,
  insertClassSessionSchema,
  insertAttendanceSchema,
  insertComputerSchema,
  insertEnrollmentSchema,
  strongPasswordSchema,
  users,
  students
} from "@shared/schema";
import { sendEmailNotification } from "./services/emailService";
import { simulateRFIDTap } from "./services/rfidSimulator";
import { checkAutoStartSessions } from "./services/scheduleService";
import { performanceMonitor } from "./services/performanceMonitor";
import { generateAttendanceTrendData, generateStudentPerformanceData } from "./services/reportingService";
import { iotDeviceManager } from "./services/iotService";
import { attendanceValidationService } from "./services/attendanceValidationService";
import { auditService } from "./services/auditService";
import { consentService } from "./services/consentService";
import { dataRetentionService } from "./services/dataRetentionService";

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
    return 'N/A';
  }
}

// Import hash function for user password management
import { hashPassword } from "./auth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Performance monitoring middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const responseTime = Date.now() - start;
      performanceMonitor.recordMetric(responseTime);
    });
    next();
  });

  // User management routes - Admin only
  app.get('/api/users', requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response for security
      const safeUsers = users.map(user => ({
        ...user,
        password: undefined
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post('/api/users', requireAdmin, async (req: any, res) => {
    try {
      const { email, password, firstName, lastName, role, facultyId, department, gender } = req.body;
      
      // Input validation
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, password, first name, and last name are required" });
      }

      // Validate password strength (ISO 27001 compliance)
      const passwordValidation = strongPasswordSchema.safeParse(password);
      if (!passwordValidation.success) {
        return res.status(400).json({ 
          message: "Password does not meet security requirements", 
          errors: passwordValidation.error.errors.map(e => e.message)
        });
      }

      // Trim inputs
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const trimmedFacultyId = facultyId?.trim();
      
      const existingUser = await storage.getUserByEmail(trimmedEmail);
      
      // If user exists and is inactive, reactivate with new details
      if (existingUser && !existingUser.isActive) {
        const reactivatedUser = await storage.upsertUser({
          id: existingUser.id,
          email: trimmedEmail,
          password: await hashPassword(password),
          firstName: trimmedFirstName,
          lastName: trimmedLastName,
          role,
          facultyId: trimmedFacultyId || null,
          gender: gender || "male",
          department: department?.trim() || "Information Technology",
          isActive: true
        });
        
        const { password: _, ...safeUser } = reactivatedUser;
        return res.status(201).json(safeUser);
      }
      
      // If user exists and is active, return error
      if (existingUser && existingUser.isActive) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Check for duplicate facultyId if provided
      if (trimmedFacultyId) {
        const users = await storage.getAllUsers();
        const duplicateFacultyId = users.find(u => u.facultyId === trimmedFacultyId && u.isActive);
        if (duplicateFacultyId) {
          return res.status(400).json({ message: "Faculty ID already exists" });
        }
      }

      // Create new user
      const user = await storage.createUser({
        email: trimmedEmail,
        password: await hashPassword(password),
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        role,
        facultyId: trimmedFacultyId || null,
        gender: gender || "male",
        department: department?.trim() || "Information Technology"
      });

      // Remove password from response
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.delete('/api/users/:id', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      
      // Prevent admin from deleting themselves
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Soft delete (default)
      await storage.deleteUser(userId);
      
      // Audit log
      await auditService.logAction({
        userId: req.user.id,
        action: "DELETE",
        entityType: "users",
        entityId: userId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: "success",
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(400).json({ message: "Failed to delete user" });
    }
  });

  // Hard delete endpoint - GDPR/Privacy compliance (Right to be Forgotten)
  app.delete('/api/users/:id/permanent', requireAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const { confirmation } = req.body;

      if (confirmation !== 'PERMANENTLY_DELETE') {
        return res.status(400).json({ 
          message: "Confirmation required. Send {confirmation: 'PERMANENTLY_DELETE'}" 
        });
      }

      // Prevent admin from permanently deleting themselves
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Cannot permanently delete your own account" });
      }

      // Permanently delete from database
      if (!db) throw new Error("Database not available");
      
      await db.delete(users).where(eq(users.id, userId));
      
      // Audit log
      await auditService.logAction({
        userId: req.user.id,
        action: "HARD_DELETE",
        entityType: "users",
        entityId: userId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: "success",
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error permanently deleting user:", error);
      res.status(400).json({ message: "Failed to permanently delete user" });
    }
  });

  // Forgot password route - generates secure token and sends reset link to user (ISO 27001 compliant)
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      console.log(`[FORGOT_PASSWORD] Processing request for email: ${email}`);

      // Check if user exists (but don't reveal this in response for security)
      const user = await storage.getUserByEmail(email);
      console.log(`[FORGOT_PASSWORD] User found: ${user ? 'yes' : 'no'}`);
      
      if (user) {
        // Generate secure random token
        const crypto = await import('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        console.log(`[FORGOT_PASSWORD] Generated reset token`);
        
        // Token expires in 1 hour
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);
        
        // Store token in database
        if (!db) {
          console.error('[FORGOT_PASSWORD] Database not available');
          throw new Error("Database not available");
        }
        const { passwordResetTokens } = await import('@shared/schema');
        
        console.log(`[FORGOT_PASSWORD] Inserting token into database`);
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token: resetToken,
          expiresAt,
          used: false
        });
        console.log(`[FORGOT_PASSWORD] Token inserted successfully`);
        
        // Get reset link - works for both Replit and Railway
        let FRONTEND_URL = 'http://localhost:5000'; // default
        
        if (process.env.REPLIT_DOMAINS) {
          // Replit environment
          FRONTEND_URL = `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`;
        } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
          // Railway environment
          FRONTEND_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
        } else if (req.headers.host) {
          // Fallback: use the host from the request
          const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
          FRONTEND_URL = `${protocol}://${req.headers.host}`;
        }
        
        console.log(`[FORGOT_PASSWORD] Using FRONTEND_URL: ${FRONTEND_URL}`);
        const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
        
        const FROM_EMAIL = process.env.FROM_EMAIL || "matt.feria@clsu2.edu.ph";
        
        const resetEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2596be; color: white; padding: 20px; text-align: center;">
              <h1>CLIRDEC: PRESENCE</h1>
              <p>Password Reset Request</p>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #2596be;">Reset Your Password</h2>
              <p>Hello ${user.firstName},</p>
              <p>We received a request to reset your password for your CLIRDEC: PRESENCE account.</p>
              <div style="background-color: white; padding: 20px; text-align: center; margin: 20px 0;">
                <a href="${resetLink}" style="background-color: #2596be; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="background-color: #f0f0f0; padding: 10px; word-break: break-all; font-family: monospace; font-size: 12px;">${resetLink}</p>
              <p><strong>⏰ This link will expire in 1 hour for security reasons.</strong></p>
              <p>If you didn't request this password reset, please ignore this email or contact IT support if you're concerned about your account security.</p>
              <p>Best regards,<br>CLIRDEC: PRESENCE System<br>Department of Information Technology<br>Central Luzon State University</p>
            </div>
          </div>
        `;

        const resetEmailText = `
CLIRDEC: PRESENCE - Password Reset

Hello ${user.firstName},

We received a request to reset your password for your CLIRDEC: PRESENCE account.

To reset your password, click the link below or copy it into your browser:
${resetLink}

⏰ This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email or contact IT support if you're concerned about your account security.

Best regards,
CLIRDEC: PRESENCE System
Department of Information Technology
Central Luzon State University
        `;

        // Send email to user
        const { sendEmail } = await import('./services/emailService');
        try {
          await sendEmail({
            to: email,
            from: FROM_EMAIL,
            subject: 'Reset Your Password - CLIRDEC: PRESENCE',
            html: resetEmailHtml,
            text: resetEmailText
          });
          console.log(`Password reset email sent to ${email}`);
          
          // Audit log
          await auditService.logAction({
            userId: user.id,
            action: "PASSWORD_RESET_REQUESTED",
            entityType: "users",
            entityId: user.id,
            ipAddress: req.ip || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown',
            status: "success",
          });
        } catch (emailError) {
          console.error("Failed to send password reset email:", emailError);
          // Don't reveal the error to the user
        }
      }
      
      // Always return success for security (don't reveal if email exists)
      res.json({ 
        success: true, 
        message: "If an account exists with this email, you will receive password reset instructions shortly." 
      });
    } catch (error) {
      console.error("[FORGOT_PASSWORD] Error processing forgot password request:", error);
      console.error("[FORGOT_PASSWORD] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password route - validates token and updates password
  app.post('/api/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({ 
          message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
        });
      }

      if (!db) throw new Error("Database not available");
      const { passwordResetTokens, users } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      // Find token in database
      const tokenRecord = await db.select().from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.token, token),
          eq(passwordResetTokens.used, false)
        ))
        .limit(1);
      
      if (!tokenRecord || tokenRecord.length === 0) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      const resetToken = tokenRecord[0];
      
      // Check if token has expired
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: "Reset token has expired. Please request a new one." });
      }
      
      // Hash new password
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update user's password
      await db.update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, resetToken.userId));
      
      // Mark token as used
      await db.update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, resetToken.id));
      
      // Get user for audit log
      const user = await db.select().from(users)
        .where(eq(users.id, resetToken.userId))
        .limit(1);
      
      // Audit log
      await auditService.logAction({
        userId: resetToken.userId,
        action: "PASSWORD_RESET_COMPLETED",
        entityType: "users",
        entityId: resetToken.userId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: "success",
      });
      
      console.log(`Password successfully reset for user ${resetToken.userId}`);
      
      res.json({ 
        success: true, 
        message: "Password has been reset successfully. You can now log in with your new password." 
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password. Please try again." });
    }
  });

  // Role-based dashboard statistics
  app.get('/api/dashboard/stats', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const today = new Date();
      
      if (currentUser.role === 'admin') {
        // Admin gets system-wide statistics
        const allSessions = await storage.getAllClassSessions();
        const todaySessions = allSessions.filter(session => {
          if (!session.createdAt) return false;
          const sessionDate = new Date(session.createdAt).toDateString();
          return sessionDate === today.toDateString();
        });
        
        const students = await storage.getStudents();
        const classrooms = await storage.getClassrooms();
        const users = await storage.getAllUsers();
        const faculty = users.filter((u: any) => u.role === 'faculty');
        
        let totalPresent = 0, totalAbsent = 0, totalLate = 0;
        
        for (const session of todaySessions) {
          const attendance = await storage.getAttendanceBySession(session.id);
          totalPresent += attendance.filter(a => a.status === 'present').length;
          totalAbsent += attendance.filter(a => a.status === 'absent').length;
          totalLate += attendance.filter(a => a.status === 'late').length;
        }
        
        res.json({
          todayClasses: todaySessions.length,
          presentStudents: totalPresent,
          absentStudents: totalAbsent,
          lateStudents: totalLate,
          totalStudents: students.length,
          totalClassrooms: classrooms.length,
          totalFaculty: faculty.length,
          attendanceRate: `${totalPresent + totalAbsent + totalLate > 0 ? Math.round((totalPresent / (totalPresent + totalAbsent + totalLate)) * 100) : 0}%`,
          systemRole: 'admin'
        });
      } else {
        // Faculty gets only their own class statistics
        const professorId = currentUser.id;
        const todaySessions = await storage.getClassSessionsByDate(today);
        const profSessions = todaySessions.filter(s => s.professorId === professorId);
        
        const activeSession = await storage.getActiveSession(professorId);
        
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let totalStudents = 0;
        
        if (activeSession) {
          const attendanceRecords = await storage.getAttendanceBySession(activeSession.id);
          presentCount = attendanceRecords.filter(a => a.status === 'present').length;
          lateCount = attendanceRecords.filter(a => a.status === 'late').length;
          absentCount = attendanceRecords.filter(a => a.status === 'absent').length;
          totalStudents = attendanceRecords.length;
        }
        
        const attendanceRate = totalStudents > 0 ? Math.round(((presentCount + lateCount) / totalStudents) * 100) : 0;
        
        res.json({
          todayClasses: profSessions.length,
          presentStudents: presentCount,
          absentStudents: absentCount,
          lateStudents: lateCount,
          attendanceRate: `${attendanceRate}%`,
          activeSession,
          systemRole: 'faculty'
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Student management routes - Admin only for user management
  app.get('/api/students', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const currentUser = req.user;
      
      if (currentUser.role === 'admin') {
        // Admin sees all students
        const students = await storage.getStudents();
        res.json(students);
      } else {
        // Faculty only sees students enrolled in their subjects
        const professorId = currentUser.id;
        const subjects = await storage.getSubjectsByProfessor(professorId);
        const subjectIds = subjects.map(s => s.id);
        
        // Get all students enrolled in these subjects
        const studentSet = new Set<number>();
        for (const subjectId of subjectIds) {
          const enrollments = await storage.getEnrollmentsBySubject(subjectId);
          enrollments.forEach(e => studentSet.add(e.studentId));
        }
        
        // Fetch full student details
        const allStudents = await storage.getStudents();
        const filteredStudents = allStudents.filter(s => studentSet.has(s.id));
        res.json(filteredStudents);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post('/api/students', requireAdmin, async (req, res) => {
    try {
      // Validate with Zod schema
      const validationResult = insertStudentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }

      const studentData = validationResult.data;

      // Trim string inputs
      if (studentData.studentId) studentData.studentId = studentData.studentId.trim();
      if (studentData.firstName) studentData.firstName = studentData.firstName.trim();
      if (studentData.lastName) studentData.lastName = studentData.lastName.trim();
      if (studentData.email) studentData.email = studentData.email.trim().toLowerCase();
      if (studentData.section) studentData.section = studentData.section.trim();
      if (studentData.rfidCardId) studentData.rfidCardId = studentData.rfidCardId.trim();
      if (studentData.parentEmail) studentData.parentEmail = studentData.parentEmail.trim().toLowerCase();
      if (studentData.parentName) studentData.parentName = studentData.parentName.trim();

      // Check for duplicate student ID
      const allStudents = await storage.getStudents();
      const duplicateStudentId = allStudents.find(s => s.studentId === studentData.studentId && s.isActive);
      if (duplicateStudentId) {
        return res.status(400).json({ message: "Student ID already exists" });
      }

      // Check for duplicate RFID card if provided
      if (studentData.rfidCardId) {
        const duplicateRfid = allStudents.find(s => s.rfidCardId === studentData.rfidCardId && s.isActive);
        if (duplicateRfid) {
          return res.status(400).json({ message: "RFID card is already assigned to another student" });
        }
      }

      const student = await storage.createStudent(studentData);
      res.status(201).json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(400).json({ message: "Failed to create student" });
    }
  });

  app.put('/api/students/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Validate with Zod schema
      const validationResult = updateStudentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }

      const updateData = validationResult.data;

      // Get existing student
      const existingStudent = await storage.getStudent(id);
      if (!existingStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Trim string inputs
      if (updateData.studentId) updateData.studentId = updateData.studentId.trim();
      if (updateData.firstName) updateData.firstName = updateData.firstName.trim();
      if (updateData.lastName) updateData.lastName = updateData.lastName.trim();
      if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();
      if (updateData.section) updateData.section = updateData.section.trim();
      if (updateData.rfidCardId) updateData.rfidCardId = updateData.rfidCardId.trim();
      if (updateData.parentEmail) updateData.parentEmail = updateData.parentEmail.trim().toLowerCase();
      if (updateData.parentName) updateData.parentName = updateData.parentName.trim();

      const allStudents = await storage.getStudents();

      // Check for duplicate student ID if being changed
      if (updateData.studentId && updateData.studentId !== existingStudent.studentId) {
        const duplicateStudentId = allStudents.find(s => s.studentId === updateData.studentId && s.id !== id && s.isActive);
        if (duplicateStudentId) {
          return res.status(400).json({ message: "Student ID already exists" });
        }
      }

      // Check for duplicate RFID card if being changed
      if (updateData.rfidCardId && updateData.rfidCardId !== existingStudent.rfidCardId) {
        const duplicateRfid = allStudents.find(s => s.rfidCardId === updateData.rfidCardId && s.id !== id && s.isActive);
        if (duplicateRfid) {
          return res.status(400).json({ message: "RFID card is already assigned to another student" });
        }
      }

      // Build clean update object with only provided fields
      const cleanData: any = {};
      if (updateData.studentId !== undefined) cleanData.studentId = updateData.studentId;
      if (updateData.firstName !== undefined) cleanData.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) cleanData.lastName = updateData.lastName;
      if (updateData.email !== undefined) cleanData.email = updateData.email;
      if (updateData.gender !== undefined) cleanData.gender = updateData.gender;
      if (updateData.year !== undefined) cleanData.year = updateData.year;
      if (updateData.section !== undefined) cleanData.section = updateData.section;
      if (updateData.rfidCardId !== undefined) cleanData.rfidCardId = updateData.rfidCardId;
      if (updateData.parentEmail !== undefined) cleanData.parentEmail = updateData.parentEmail;
      if (updateData.parentName !== undefined) cleanData.parentName = updateData.parentName;
      if (updateData.isActive !== undefined) cleanData.isActive = updateData.isActive;
      
      const student = await storage.updateStudent(id, cleanData);
      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(400).json({ message: "Failed to update student" });
    }
  });

  app.delete('/api/students/:id', requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Soft delete (default)
      await storage.deleteStudent(id);
      
      // Audit log
      await auditService.logAction({
        userId: req.user.id,
        action: "DELETE",
        entityType: "students",
        entityId: id.toString(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: "success",
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(400).json({ message: "Failed to delete student" });
    }
  });

  // Hard delete student endpoint - GDPR/Privacy compliance
  app.delete('/api/students/:id/permanent', requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { confirmation } = req.body;

      if (confirmation !== 'PERMANENTLY_DELETE') {
        return res.status(400).json({ 
          message: "Confirmation required. Send {confirmation: 'PERMANENTLY_DELETE'}" 
        });
      }

      // Permanently delete from database
      if (!db) throw new Error("Database not available");
      
      await db.delete(students).where(eq(students.id, id));
      
      // Audit log
      await auditService.logAction({
        userId: req.user.id,
        action: "HARD_DELETE",
        entityType: "students",
        entityId: id.toString(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: "success",
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error permanently deleting student:", error);
      res.status(400).json({ message: "Failed to permanently delete student" });
    }
  });

  // Classroom management routes - Admin only for classroom management
  app.get('/api/classrooms', requireAdminOrFaculty, async (req, res) => {
    try {
      const classrooms = await storage.getClassrooms();
      res.json(classrooms);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      res.status(500).json({ message: "Failed to fetch classrooms" });
    }
  });

  app.post('/api/classrooms', requireAdmin, async (req, res) => {
    try {
      const validationResult = insertClassroomSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }

      const classroomData = validationResult.data;

      // Trim inputs
      if (classroomData.name) classroomData.name = classroomData.name.trim();
      if (classroomData.location) classroomData.location = classroomData.location.trim();

      // Check for duplicate classroom name
      const allClassrooms = await storage.getClassrooms();
      const duplicateName = allClassrooms.find(c => c.name.toLowerCase() === classroomData.name.toLowerCase() && c.isActive);
      if (duplicateName) {
        return res.status(400).json({ message: "Classroom name already exists" });
      }

      const classroom = await storage.createClassroom(classroomData);
      res.status(201).json(classroom);
    } catch (error) {
      console.error("Error creating classroom:", error);
      res.status(400).json({ message: "Failed to create classroom" });
    }
  });

  app.put('/api/classrooms/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const validationResult = updateClassroomSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }

      const updateData = validationResult.data;

      // Get existing classroom
      const existingClassroom = await storage.getClassroom(id);
      if (!existingClassroom) {
        return res.status(404).json({ message: "Classroom not found" });
      }

      // Trim inputs
      if (updateData.name) updateData.name = updateData.name.trim();
      if (updateData.location) updateData.location = updateData.location.trim();

      // Check for duplicate name if being changed
      if (updateData.name && updateData.name.toLowerCase() !== existingClassroom.name.toLowerCase()) {
        const allClassrooms = await storage.getClassrooms();
        const duplicateName = allClassrooms.find(c => c.name.toLowerCase() === updateData.name!.toLowerCase() && c.id !== id && c.isActive);
        if (duplicateName) {
          return res.status(400).json({ message: "Classroom name already exists" });
        }
      }

      const classroom = await storage.updateClassroom(id, updateData);
      res.json(classroom);
    } catch (error) {
      console.error("Error updating classroom:", error);
      res.status(400).json({ message: "Failed to update classroom" });
    }
  });

  // Subject management routes
  app.get('/api/subjects', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      const subjects = await storage.getSubjectsByProfessor(professorId);
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  app.post('/api/subjects', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      const subjectData = insertSubjectSchema.parse({ ...req.body, professorId });
      const subject = await storage.createSubject(subjectData);
      res.status(201).json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(400).json({ message: "Failed to create subject" });
    }
  });

  app.put('/api/subjects/:id', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const professorId = req.user.id;
      const subjectData = insertSubjectSchema.partial().parse({ ...req.body, professorId });
      const subject = await storage.updateSubject(id, subjectData);
      res.json(subject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(400).json({ message: "Failed to update subject" });
    }
  });

  app.delete('/api/subjects/:id', requireAdminOrFaculty, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSubject(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(400).json({ message: "Failed to delete subject" });
    }
  });

  // Enrollment management routes
  app.get('/api/enrollments', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const enrollments = await storage.getEnrollments();
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      res.status(500).json({ message: "Failed to fetch enrollments" });
    }
  });

  app.get('/api/subjects/:id/students', requireAdminOrFaculty, async (req, res) => {
    try {
      const subjectId = parseInt(req.params.id);
      const students = await storage.getStudentsInSubject(subjectId);
      res.json(students);
    } catch (error) {
      console.error("Error fetching students in subject:", error);
      res.status(500).json({ message: "Failed to fetch students in subject" });
    }
  });

  app.get('/api/students/:id/enrollments', requireAdminOrFaculty, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      const enrollments = await storage.getEnrollmentsByStudent(studentId);
      res.json(enrollments);
    } catch (error) {
      console.error("Error fetching student enrollments:", error);
      res.status(500).json({ message: "Failed to fetch student enrollments" });
    }
  });

  app.post('/api/enrollments', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const validationResult = insertEnrollmentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }

      const enrollmentData = validationResult.data;

      // Validate foreign keys
      const student = await storage.getStudent(enrollmentData.studentId);
      if (!student) {
        return res.status(400).json({ message: "Student not found" });
      }

      const allSubjects = await storage.getSubjects();
      const subject = allSubjects.find(s => s.id === enrollmentData.subjectId);
      if (!subject) {
        return res.status(400).json({ message: "Subject not found" });
      }

      // Check for duplicate enrollment
      const existingEnrollments = await storage.getEnrollmentsByStudent(enrollmentData.studentId);
      const duplicate = existingEnrollments.find(e => e.subjectId === enrollmentData.subjectId && e.isActive);
      if (duplicate) {
        return res.status(400).json({ message: "Student is already enrolled in this subject" });
      }

      const enrollment = await storage.createEnrollment(enrollmentData);
      res.status(201).json(enrollment);
    } catch (error) {
      console.error("Error creating enrollment:", error);
      res.status(400).json({ message: "Failed to create enrollment" });
    }
  });

  app.put('/api/enrollments/:id', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const enrollmentData = insertEnrollmentSchema.partial().parse(req.body);
      const enrollment = await storage.updateEnrollment(id, enrollmentData);
      res.json(enrollment);
    } catch (error) {
      console.error("Error updating enrollment:", error);
      res.status(400).json({ message: "Failed to update enrollment" });
    }
  });

  app.delete('/api/enrollments/:id', requireAdminOrFaculty, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteEnrollment(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting enrollment:", error);
      res.status(400).json({ message: "Failed to delete enrollment" });
    }
  });

  // Schedule management routes
  app.get('/api/schedules', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      const schedules = await storage.getSchedulesByProfessor(professorId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/schedules', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      let scheduleData = { ...req.body, professorId };

      // Handle subjectName to subjectId conversion
      if (scheduleData.subjectName && !scheduleData.subjectId) {
        // Create or find subject with the provided name
        const existingSubject = await storage.getSubjectByName(scheduleData.subjectName);
        let subjectId;
        
        if (existingSubject) {
          subjectId = existingSubject.id;
        } else {
          // Create new subject
          const newSubject = await storage.createSubject({
            name: scheduleData.subjectName,
            code: scheduleData.subjectName.toUpperCase().replace(/\s+/g, '_'),
            professorId: professorId,
            description: `Subject created from schedule: ${scheduleData.subjectName}`
          });
          subjectId = newSubject.id;
        }
        
        // Replace subjectName with subjectId
        scheduleData.subjectId = subjectId;
        delete scheduleData.subjectName;
      }

      const validatedData = insertScheduleSchema.parse(scheduleData);
      const schedule = await storage.createSchedule(validatedData);
      
      // Auto-populate sessions for the entire semester
      if (scheduleData.autoPopulate !== false) {
        const { populateScheduleSessions } = await import('./services/scheduleService');
        const populateResult = await populateScheduleSessions(schedule.id);
        console.log(`📅 Auto-populated ${populateResult.sessionsCreated} sessions for schedule ${schedule.id}`);
      }
      
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(400).json({ message: "Failed to create schedule" });
    }
  });

  app.put('/api/schedules/:id', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const professorId = req.user.id;
      const scheduleData = insertScheduleSchema.partial().parse({ ...req.body, professorId });
      const schedule = await storage.updateSchedule(id, scheduleData);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(400).json({ message: "Failed to update schedule" });
    }
  });

  app.delete('/api/schedules/:id', requireAdminOrFaculty, async (req, res) => {
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
  app.get('/api/sessions/active', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      const activeSession = await storage.getActiveSession(professorId);
      res.json(activeSession);
    } catch (error) {
      console.error("Error fetching active session:", error);
      res.status(500).json({ message: "Failed to fetch active session" });
    }
  });

  app.post('/api/sessions', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      const sessionData = insertClassSessionSchema.parse({ ...req.body, professorId });
      const session = await storage.createClassSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(400).json({ message: "Failed to create session" });
    }
  });

  app.put('/api/sessions/:id', requireAdminOrFaculty, async (req, res) => {
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

  app.post('/api/sessions/:id/end', requireAdminOrFaculty, async (req, res) => {
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
  app.get('/api/attendance/:sessionId', requireAdminOrFaculty, async (req, res) => {
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
  });

  app.post('/api/attendance', requireAdminOrFaculty, async (req, res) => {
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
  app.post('/api/rfid/simulate', requireAdminOrFaculty, async (req, res) => {
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
  app.get('/api/computers', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { classroomId } = req.query;
      const currentUser = req.user;
      
      let computers;
      if (classroomId) {
        computers = await storage.getComputersByClassroom(parseInt(classroomId as string));
      } else {
        computers = await storage.getComputers();
      }
      
      // Faculty only sees their own computers, admin sees all
      if (currentUser.role !== 'admin') {
        computers = computers.filter(c => c.professorId === currentUser.id);
      }
      
      res.json(computers);
    } catch (error) {
      console.error("Error fetching computers:", error);
      res.status(500).json({ message: "Failed to fetch computers" });
    }
  });

  app.post('/api/computers', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      const computerData = insertComputerSchema.parse({ ...req.body, professorId });
      
      // Check for duplicate computer name in the same classroom for this professor
      if (computerData.classroomId) {
        const existingComputers = await storage.getComputersByClassroom(computerData.classroomId);
        const duplicate = existingComputers.find(c => 
          c.name.toLowerCase() === computerData.name.toLowerCase() && 
          c.professorId === professorId
        );
        
        if (duplicate) {
          return res.status(400).json({ message: `Computer "${computerData.name}" already exists in this classroom` });
        }
      }
      
      const computer = await storage.createComputer(computerData);
      res.status(201).json(computer);
    } catch (error) {
      console.error("Error creating computer:", error);
      res.status(400).json({ message: "Failed to create computer" });
    }
  });

  app.put('/api/computers/:id', requireAdminOrFaculty, async (req, res) => {
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

  app.delete('/api/computers/:id', requireAdminOrFaculty, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteComputer(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting computer:", error);
      res.status(400).json({ message: "Failed to delete computer" });
    }
  });

  app.put('/api/computers/:id/assign', requireAdminOrFaculty, async (req, res) => {
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

  app.put('/api/computers/:id/release', requireAdminOrFaculty, async (req, res) => {
    try {
      const computerId = parseInt(req.params.id);
      const computer = await storage.releaseComputer(computerId);
      res.json(computer);
    } catch (error) {
      console.error("Error releasing computer:", error);
      res.status(400).json({ message: "Failed to release computer" });
    }
  });

  // Email notification routes - Admin has full access, Faculty can send to their students
  app.post('/api/notifications/send', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { studentId, type, customMessage } = req.body;
      const currentUser = req.user;
      
      // For faculty, add additional validation if needed (e.g., ensure they can only send to their students)
      if (currentUser.role === 'faculty') {
        // Could add logic here to verify student is in faculty's classes
      }
      
      await sendEmailNotification(studentId, type, customMessage);
      res.json({ message: "Notification queued for sending" });
    } catch (error) {
      console.error("Error sending notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Test Brevo configuration
  app.get('/api/notifications/test-brevo', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const BREVO_API_KEY = process.env.BREVO_API_KEY;
      if (!BREVO_API_KEY) {
        return res.status(400).json({ message: "Brevo API key not configured" });
      }

      const FROM_EMAIL = process.env.FROM_EMAIL || "matt.feria@clsu2.edu.ph";
      
      const { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } = await import('@getbrevo/brevo');
      
      const transactionalEmailsApi = new TransactionalEmailsApi();
      transactionalEmailsApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
      
      // Test with a simple email
      const message = {
        to: [{
          email: 'test@example.com',
          name: 'Test User'
        }],
        sender: {
          email: FROM_EMAIL,
          name: 'CLIRDEC: PRESENCE System'
        },
        subject: 'CLIRDEC Brevo Test',
        textContent: 'This is a test email from CLIRDEC Presence system using Brevo.',
        htmlContent: '<p>This is a test email from <strong>CLIRDEC Presence system</strong> using Brevo.</p>'
      };
      
      const result = await transactionalEmailsApi.sendTransacEmail(message);
      
      res.json({ 
        message: "Brevo test successful",
        messageId: result.body?.messageId || 'N/A',
        from_email: FROM_EMAIL,
        api_key_configured: true
      });
    } catch (error: any) {
      console.error('Brevo test error:', error);
      res.status(500).json({ 
        message: "Brevo test failed", 
        error: error.message,
        code: error.code || error.response?.status
      });
    }
  });

  // Custom email sending for contact student functionality
  app.post('/api/notifications/send-email', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { studentId, recipientType, subject, message, priority, type } = req.body;
      const currentUser = req.user;
      
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Determine recipient email
      let recipientEmail = '';
      if (recipientType === 'parent') {
        recipientEmail = student.parentEmail;
      } else if (recipientType === 'student') {
        recipientEmail = student.email || '';
      }

      if (!recipientEmail) {
        return res.status(400).json({ message: "No email found for recipient" });
      }

      // Create email content
      const emailContent = `<div style="font-family: Arial, sans-serif;">
        <div style="background-color: #2596be; color: white; padding: 20px; text-align: center;">
          <h1>CLIRDEC: PRESENCE</h1>
          <p>Central Luzon State University - Attendance Monitoring System</p>
        </div>
        <div style="padding: 20px;">
          <h2>${subject}</h2>
          <p style="white-space: pre-line;">${message}</p>
          <hr style="margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This message was sent regarding ${student.firstName} ${student.lastName} (${student.studentId})
            <br>Date: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>`;

      // Send email immediately via Brevo
      const BREVO_API_KEY = process.env.BREVO_API_KEY;
      const FROM_EMAIL = process.env.FROM_EMAIL || "matt.feria@clsu2.edu.ph";

      if (BREVO_API_KEY) {
        try {
          const { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } = await import('@getbrevo/brevo');
          
          const transactionalEmailsApi = new TransactionalEmailsApi();
          transactionalEmailsApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
          
          const brevoMessage = {
            to: [{
              email: recipientEmail,
              name: recipientType === 'parent' ? 'Parent/Guardian' : 'Student'
            }],
            sender: {
              email: FROM_EMAIL,
              name: 'CLIRDEC: PRESENCE System'
            },
            subject: subject,
            textContent: message,
            htmlContent: emailContent
          };
          
          const result = await transactionalEmailsApi.sendTransacEmail(brevoMessage);
          
          console.log(`✅ Email sent successfully to ${recipientEmail}`, `Message ID: ${result.body?.messageId || 'N/A'}`);
          
          // Also create notification record for tracking
          await storage.createEmailNotification({
            type: type || 'general_communication',
            message: message,
            subject: subject,
            recipientEmail: recipientEmail,
            studentId: studentId,
            content: emailContent,
            status: 'sent'
          });
          
          res.json({ message: "Email sent successfully" });
        } catch (error: any) {
          console.error('Brevo error:', error);
          
          let errorMessage = "Failed to send email via Brevo";
          if (error.response?.status === 401 || error.message.includes('Unauthorized')) {
            errorMessage = "Brevo authentication failed. Please verify your API key is valid and active.";
          } else if (error.response?.status === 400) {
            errorMessage = "Brevo request error. Please verify the 'from' email address is verified in your Brevo account.";
          } else if (error.response?.status === 429) {
            errorMessage = "Brevo daily sending limit exceeded. Please wait or upgrade your plan.";
          }
          
          res.status(500).json({ 
            message: errorMessage, 
            error: error.message,
            suggestion: "In Brevo dashboard: 1) Verify your sender email, 2) Check API key is active"
          });
        }
      } else {
        // No API key available
        console.log(`❌ No Brevo API key - email not sent to ${recipientEmail}`);
        res.status(500).json({ message: "Brevo API key not configured" });
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // System settings routes - Admin only for system configuration
  app.get('/api/settings/:key', requireAdminOrFaculty, async (req, res) => {
    try {
      const key = req.params.key;
      const setting = await storage.getSystemSetting(key);
      res.json(setting);
    } catch (error) {
      console.error("Error fetching setting:", error);
      res.status(500).json({ message: "Failed to fetch setting" });
    }
  });

  app.put('/api/settings/:key', requireAdmin, async (req, res) => {
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
  app.get('/api/reports/attendance/:sessionId', requireAdminOrFaculty, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const attendanceRecords = await storage.getAttendanceBySession(sessionId);
      res.json(attendanceRecords);
    } catch (error) {
      console.error("Error fetching attendance report:", error);
      res.status(500).json({ message: "Failed to fetch attendance report" });
    }
  });

  // Analytics API endpoints
  app.get('/api/reports/attendance-trend', requireAdminOrFaculty, async (req, res) => {
    try {
      const trendData = await generateAttendanceTrendData();
      res.json(trendData);
    } catch (error) {
      console.error("Error fetching attendance trend data:", error);
      res.status(500).json({ message: "Failed to fetch attendance trend data" });
    }
  });

  app.get('/api/reports/student-performance', requireAdminOrFaculty, async (req, res) => {
    try {
      const performanceData = await generateStudentPerformanceData();
      res.json(performanceData);
    } catch (error) {
      console.error("Error fetching student performance data:", error);
      res.status(500).json({ message: "Failed to fetch student performance data" });
    }
  });

  // General reports generation
  app.get('/api/reports/generate', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { range, subject, section } = req.query;
      const professorId = req.user.id;
      
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      
      switch (range) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 1);
      }

      // Get sessions in date range
      const allSessions = await storage.getAllClassSessions();
      const filteredSessions = allSessions.filter(session => {
        const sessionDate = new Date(session.createdAt || new Date());
        const isInRange = sessionDate >= startDate && sessionDate <= endDate;
        
        // For faculty users, only show their sessions
        if (req.user.role === 'faculty' && session.professorId !== professorId) {
          return false;
        }
        
        return isInRange;
      });

      // Aggregate attendance data
      const records = [];
      let totalPresent = 0, totalLate = 0, totalAbsent = 0, totalRecords = 0;

      for (const session of filteredSessions) {
        const attendanceRecords = await storage.getAttendanceBySession(session.id);
        
        for (const attendance of attendanceRecords) {
          const student = attendance.studentId ? await storage.getStudent(attendance.studentId) : null;
          if (!student) continue;
          
          records.push({
            id: attendance.id,
            studentName: `${student.firstName} ${student.lastName}`,
            studentId: student.studentId,
            checkIn: attendance.checkInTime || 'N/A',
            checkOut: attendance.checkOutTime || 'N/A',
            status: attendance.status,
            duration: attendance.checkInTime && attendance.checkOutTime 
              ? calculateDuration(attendance.checkInTime, attendance.checkOutTime)
              : 'N/A'
          });

          // Update totals
          totalRecords++;
          if (attendance.status === 'present') totalPresent++;
          else if (attendance.status === 'late') totalLate++;
          else if (attendance.status === 'absent') totalAbsent++;
        }
      }

      const summary = {
        total: totalRecords,
        present: totalPresent,
        late: totalLate,
        absent: totalAbsent
      };

      res.json({ records, summary });
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Report export endpoint
  app.get('/api/reports/export', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { range, subject, section, format } = req.query;
      const professorId = req.user.id;
      
      // Reuse the generate logic to get the data
      const endDate = new Date();
      let startDate = new Date();
      
      switch (range) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        default:
          startDate.setDate(startDate.getDate() - 1);
      }

      const allSessions = await storage.getAllClassSessions();
      const filteredSessions = allSessions.filter(session => {
        const sessionDate = new Date(session.createdAt || new Date());
        const isInRange = sessionDate >= startDate && sessionDate <= endDate;
        
        if (req.user.role === 'faculty' && session.professorId !== professorId) {
          return false;
        }
        
        return isInRange;
      });

      // Generate CSV data
      let csvData = 'Student ID,Student Name,Check In,Check Out,Duration,Status\n';
      
      for (const session of filteredSessions) {
        const attendanceRecords = await storage.getAttendanceBySession(session.id);
        
        for (const attendance of attendanceRecords) {
          const student = attendance.studentId ? await storage.getStudent(attendance.studentId) : null;
          if (!student) continue;
          
          const checkIn = attendance.checkInTime || 'N/A';
          const checkOut = attendance.checkOutTime || 'N/A';
          const duration = attendance.checkInTime && attendance.checkOutTime 
            ? calculateDuration(attendance.checkInTime, attendance.checkOutTime)
            : 'N/A';
          
          csvData += `"${student.studentId}","${student.firstName} ${student.lastName}","${checkIn}","${checkOut}","${duration}","${attendance.status}"\n`;
        }
      }

      // Set appropriate headers for CSV download
      const filename = `attendance-report-${range}-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.send(csvData);
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });

  app.get('/api/reports/daily/:date', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const date = new Date(req.params.date);
      const professorId = req.user.id;
      
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

  app.get('/api/reports/student/:studentId', requireAdminOrFaculty, async (req, res) => {
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
  app.get('/api/reports/export/csv/:type', requireAdminOrFaculty, async (req: any, res) => {
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
  app.post('/api/schedules/check-auto-start', requireAdminOrFaculty, async (req, res) => {
    try {
      const result = await checkAutoStartSessions();
      res.json(result);
    } catch (error) {
      console.error("Error checking auto-start sessions:", error);
      res.status(500).json({ message: "Failed to check auto-start sessions" });
    }
  });

  // Schedule file upload route
  app.post('/api/schedules/upload', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      
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
  app.get('/api/reports/export', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { range, subject, section, format } = req.query;
      const professorId = req.user.id;
      
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

  app.get('/api/reports/generate', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { range, subject, section } = req.query;
      const professorId = req.user.id;
      
      // Get real attendance data from database
      const today = new Date();
      const sessions = await storage.getClassSessionsByDate(today);
      
      let allAttendanceRecords: any[] = [];
      
      // Get attendance records for each session today
      for (const session of sessions) {
        if (!session.id) continue; // Skip sessions without ID
        const attendance = await storage.getAttendanceBySession(session.id as number);
        
        // Map attendance to report format with student details
        for (const record of attendance) {
          if (!record.studentId) continue; // Skip records without studentId
          const student = await storage.getStudent(record.studentId);
          if (student) {
            allAttendanceRecords.push({
              id: record.id,
              studentName: `${student.firstName} ${student.lastName}`,
              studentId: student.studentId,
              checkIn: record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString() : '--',
              checkOut: record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString() : '--',
              duration: record.checkInTime && record.checkOutTime 
                ? calculateDuration(record.checkInTime, record.checkOutTime) 
                : '--',
              status: record.status,
              sessionName: 'Class Session',
              date: new Date(session.date).toLocaleDateString()
            });
          }
        }
      }
      
      // Calculate summary statistics
      const summary = {
        present: allAttendanceRecords.filter(r => r.status === 'present').length,
        late: allAttendanceRecords.filter(r => r.status === 'late').length,
        absent: allAttendanceRecords.filter(r => r.status === 'absent').length,
        total: allAttendanceRecords.length
      };
      
      const attendanceRate = summary.total > 0 
        ? Math.round(((summary.present + summary.late) / summary.total) * 100)
        : 0;
      
      const reportData = {
        range,
        subject: subject || 'all',
        section: section || 'all',
        records: allAttendanceRecords,
        summary: {
          ...summary,
          attendanceRate: `${attendanceRate}%`
        }
      };
      
      res.json(reportData);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Helper function to calculate duration
  function calculateDuration(checkIn: Date, checkOut: Date): string {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  // Notifications route
  app.post('/api/notifications/send', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      
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
                parseInt(student.id.toString()),
                'absence_alert',
                `${student.firstName} ${student.lastName} was absent from ${session.startTime || 'class session'} on ${today.toDateString()}`
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
  app.put('/api/students/:id', requireAdminOrFaculty, async (req: any, res) => {
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

  // Send email to student/parent with enhanced validation and error handling
  app.post('/api/notifications/send-email', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { studentId, recipientType, subject, message, priority, type } = req.body;
      const professorId = req.user.id;
      
      // Validate required fields
      if (!studentId || !recipientType || !subject || !message) {
        return res.status(400).json({ 
          message: "Missing required fields: studentId, recipientType, subject, and message are required" 
        });
      }
      
      // Get student information
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Determine recipient email(s) with validation
      let recipients = [];
      if (recipientType === 'parent' || recipientType === 'both') {
        if (student.parentEmail && student.parentEmail.includes('@')) {
          recipients.push({
            email: student.parentEmail,
            name: student.parentName || 'Parent/Guardian',
            type: 'parent'
          });
        }
      }
      if (recipientType === 'student' || recipientType === 'both') {
        if (student.email && student.email.includes('@')) {
          recipients.push({
            email: student.email,
            name: `${student.firstName} ${student.lastName}`,
            type: 'student'
          });
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({ 
          message: `No valid email addresses found for ${recipientType}. Please check that the student has valid email addresses configured.`
        });
      }

      console.log(`📧 Creating email notifications for ${recipients.length} recipients`);

      // Create email notifications for each recipient
      let notificationsCreated = 0;
      let notificationIds = [];
      
      for (const recipient of recipients) {
        try {
          const notification = await storage.createEmailNotification({
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
          notificationIds.push(notification.id);
          console.log(`✅ Notification created for ${recipient.email}`);
        } catch (error) {
          console.error(`❌ Failed to create notification for ${recipient.email}:`, error);
        }
      }

      if (notificationsCreated > 0) {
        // Immediately try to send the emails
        setImmediate(async () => {
          try {
            console.log(`🔄 Processing email queue for ${notificationsCreated} notifications...`);
            const { processEmailQueue } = await import('./services/emailService');
            await processEmailQueue();
          } catch (error) {
            console.error("❌ Error processing email queue:", error);
          }
        });
        
        res.json({ 
          success: true, 
          notificationsCreated,
          recipients: recipients.length,
          notificationIds,
          message: `Email notification queued and sending to ${recipients.length} recipient(s)`,
          recipientEmails: recipients.map(r => r.email)
        });
      } else {
        res.status(500).json({ 
          message: "Failed to create any email notifications. Please check server logs for details." 
        });
      }
    } catch (error) {
      console.error("❌ Error in send-email endpoint:", error);
      res.status(500).json({ 
        message: "Failed to send email", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get attendance behavior analysis for all students
  app.get('/api/attendance/behavior-analysis', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { analyzeStudentAttendanceBehavior } = await import('./services/attendanceMonitor');
      const students = await storage.getStudents();
      
      const behaviorAnalysis = [];
      for (const student of students) {
        const behavior = await analyzeStudentAttendanceBehavior(student.id).catch(error => {
          console.error(`Error analyzing behavior for student ${student.id}:`, error);
          return { behaviorLevel: 'unknown', message: 'Analysis failed' };
        });
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
        const priorities: Record<string, number> = { critical: 0, concerning: 1, average: 2, good: 3, excellent: 4 };
        return (priorities[a.behaviorLevel] ?? 5) - (priorities[b.behaviorLevel] ?? 5);
      });
      
      res.json(behaviorAnalysis);
    } catch (error) {
      console.error("Error analyzing attendance behavior:", error);
      res.status(500).json({ message: "Failed to analyze attendance behavior" });
    }
  });

  // Send parent notification email (Admin/Faculty only)
  app.post('/api/notifications/send-parent-email', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { studentId, parentEmail, type, behaviorLevel } = req.body;
      
      if (!studentId || !parentEmail || !type || !behaviorLevel) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const students = await storage.getStudents();
      const student = students.find(s => s.id === studentId);
      
      if (!student) {
        return res.status(404).json({ message: 'Student not found' });
      }

      const { sendEmailNotification } = await import('./services/emailService');

      const emailData = {
        studentName: `${student.firstName} ${student.lastName}`,
        studentId: student.studentId,
        parentEmail,
        message: type === 'urgent' ? 
          'URGENT: Immediate attention required for critical attendance issues' :
          'Warning: Concerning attendance pattern detected',
        type: type as 'urgent' | 'warning'
      };

      await sendEmailNotification(
        studentId,
        "absence_alert",
        emailData.message
      );
      
      res.json({ message: 'Notification sent successfully' });
    } catch (error) {
      console.error('Error sending parent notification:', error);
      res.status(500).json({ message: 'Failed to send notification' });
    }
  });

  // Mark intervention for student (Admin/Faculty only)
  app.post('/api/attendance/mark-intervention', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { studentId } = req.body;
      
      if (!studentId) {
        return res.status(400).json({ message: 'Student ID is required' });
      }

      // Log the intervention (in a real system, this would be stored in database)
      console.log(`Intervention marked for student: ${studentId} by user: ${req.user?.email}`);
      
      res.json({ message: 'Intervention recorded successfully' });
    } catch (error) {
      console.error('Error marking intervention:', error);
      res.status(500).json({ message: 'Failed to record intervention' });
    }
  });

  // Manually trigger attendance monitoring for all students
  app.post('/api/attendance/trigger-monitoring', requireAdmin, async (req: any, res) => {
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
  app.get('/api/attendance/alerts', requireAdminOrFaculty, async (req: any, res) => {
    try {
      const alerts = await storage.getUnsentNotifications();
      const sentAlerts: any[] = []; // Would get from database
      
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
  app.get('/api/settings/attendance-monitoring', requireAdminOrFaculty, async (req: any, res) => {
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
  app.put('/api/settings/attendance-monitoring', requireAdmin, async (req: any, res) => {
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

  // Advanced Attendance Validation API - Final Logic Implementation
  app.post('/api/attendance/validate-rfid', requireAdminOrFaculty, async (req, res) => {
    try {
      const { rfidCardId, sessionId, deviceId } = req.body;
      
      if (!rfidCardId || !sessionId) {
        return res.status(400).json({ message: "RFID card ID and session ID are required" });
      }

      const result = await attendanceValidationService.validateRFIDTap({
        rfidCardId,
        sessionId: parseInt(sessionId),
        deviceId,
        timestamp: new Date()
      });

      res.json(result);
    } catch (error) {
      console.error("Error validating RFID tap:", error);
      res.status(500).json({ message: "Failed to validate RFID tap" });
    }
  });

  app.post('/api/attendance/validate-sensor', requireAdminOrFaculty, async (req, res) => {
    try {
      const { sessionId, studentId, detectionType, deviceId } = req.body;
      
      if (!sessionId || !studentId || !detectionType) {
        return res.status(400).json({ message: "Session ID, student ID, and detection type are required" });
      }

      const result = await attendanceValidationService.validateSensorDetection(
        parseInt(sessionId),
        parseInt(studentId),
        detectionType,
        new Date()
      );

      res.json(result);
    } catch (error) {
      console.error("Error validating sensor detection:", error);
      res.status(500).json({ message: "Failed to validate sensor detection" });
    }
  });

  app.get('/api/attendance/session-mode/:sessionId', requireAdminOrFaculty, async (req, res) => {
    try {
      const sessionId = parseInt(req.params.sessionId);
      const sessionMode = attendanceValidationService.getSessionMode(sessionId);
      
      if (!sessionMode) {
        return res.status(404).json({ message: "Session not found or not active" });
      }

      res.json(sessionMode);
    } catch (error) {
      console.error("Error getting session mode:", error);
      res.status(500).json({ message: "Failed to get session mode" });
    }
  });

  app.get('/api/attendance/pending-validations', requireAdminOrFaculty, (req, res) => {
    try {
      const pendingValidations = attendanceValidationService.getPendingValidations();
      res.json({ 
        pendingValidations,
        count: pendingValidations.length 
      });
    } catch (error) {
      console.error("Error getting pending validations:", error);
      res.status(500).json({ message: "Failed to get pending validations" });
    }
  });

  app.get('/api/attendance/discrepancies', requireAdminOrFaculty, async (req, res) => {
    try {
      // Get attendance records with discrepancy flags
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sessions = await storage.getClassSessionsByDate(today);
      
      const discrepancies = [];
      for (const session of sessions) {
        const attendanceRecords = await storage.getAttendanceBySession(session.id);
        const flaggedRecords = attendanceRecords.filter((record: any) => 
          record.discrepancyFlag && record.discrepancyFlag !== 'normal'
        );
        
        for (const record of flaggedRecords) {
          const student = record.studentId ? await storage.getStudent(record.studentId) : null;
          discrepancies.push({
            ...record,
            student,
            session
          });
        }
      }

      res.json({ 
        discrepancies,
        count: discrepancies.length,
        date: today
      });
    } catch (error) {
      console.error("Error getting discrepancies:", error);
      res.status(500).json({ message: "Failed to get attendance discrepancies" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize IoT Device Manager AFTER creating WebSocket servers
  // This ensures proper order of WebSocket path registration
  
  // WebSocket server for real-time notifications with enhanced configuration
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    verifyClient: (info: { origin: string; req: any; secure: boolean }) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 WebSocket connection attempt from:', info.origin, 'to:', info.req.url);
        console.log('   🔐 Secure:', info.secure);
        
        // Log headers but redact sensitive data
        const safeHeaders = { ...info.req.headers };
        if (safeHeaders.cookie) safeHeaders.cookie = '[REDACTED]';
        if (safeHeaders.authorization) safeHeaders.authorization = '[REDACTED]';
        console.log('   📋 Headers:', JSON.stringify(safeHeaders, null, 2));
      }
      
      // Strict CORS validation for WebSocket connections
      const origin = info.origin;
      const host = info.req.headers.host;
      
      // Build allowed origins list with exact matches
      const allowedOrigins: string[] = [
        `http://${host}`,
        `https://${host}`,
      ];
      
      // In development, allow localhost
      if (process.env.NODE_ENV === 'development') {
        allowedOrigins.push('http://localhost:5000');
        allowedOrigins.push('https://localhost:5000');
        
        // Only allow specific Replit domain patterns (not any arbitrary origin)
        if (origin && (origin.endsWith('.replit.dev') || origin.endsWith('.replit.app'))) {
          allowedOrigins.push(origin);
        }
      }
      
      // In production, add Railway domain
      if (process.env.RAILWAY_STATIC_URL) {
        allowedOrigins.push(`https://${process.env.RAILWAY_STATIC_URL}`);
      }
      
      // Use strict equality check, not startsWith
      const allowed = allowedOrigins.includes(origin || '');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('   ✅ Connection allowed:', allowed);
      }
      
      return allowed;
    }
  });
  
  // Initialize IoT Device Manager AFTER main WebSocket server
  iotDeviceManager.init(httpServer);
  
  wss.on('connection', (ws: WebSocket, req) => {
    if (process.env.NODE_ENV === 'development') {
      const clientIP = req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];
      console.log('✅ New WebSocket connection established');
      console.log('   📍 Client IP:', clientIP);
      console.log('   🌐 User-Agent:', userAgent?.slice(0, 50) + '...');
      console.log('   📊 Total connections:', wss.clients.size);
      console.log('   🔌 WebSocket ready state:', ws.readyState);
    }
    
    let pingInterval: NodeJS.Timeout | null = null;
    
    // Don't send welcome message immediately - let client initiate
    // This prevents race conditions and code 1006 errors
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (process.env.NODE_ENV === 'development') {
          console.log('📨 WebSocket message received:', data);
        }
        
        // Respond to hello/ping messages to keep connection alive
        if (data.type === 'hello') {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Responding to hello with connected confirmation');
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'connected',
              message: 'WebSocket connection established',
              timestamp: new Date().toISOString()
            }));
          }
        } else if (data.type === 'ping') {
          if (process.env.NODE_ENV === 'development') {
            console.log('🔄 Responding to ping with pong');
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ Invalid WebSocket message:', error);
        }
      }
    });
    
    ws.on('close', (code, reason) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔌 WebSocket connection closed');
        console.log('   📊 Close code:', code);
        console.log('   📝 Reason:', reason.toString());
        console.log('   📊 Remaining connections:', wss.clients.size);
      }
      if (pingInterval) clearInterval(pingInterval);
    });
    
    ws.on('error', (error) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ WebSocket connection error:', error);
      }
      if (pingInterval) clearInterval(pingInterval);
    });
    
    // Set up ping/pong keepalive with longer interval for Replit infrastructure
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping();
        } catch (error) {
          console.error('❌ Error sending ping:', error);
          if (pingInterval) clearInterval(pingInterval);
        }
      } else {
        if (pingInterval) clearInterval(pingInterval);
      }
    }, 45000); // Ping every 45 seconds (longer interval for stability)

    // Handle pong responses
    ws.on('pong', () => {
      console.log('📶 Received pong from client');
    });
    
    // Send welcome message after connection is fully established
    // Don't send welcome message as it causes code 1006 issues on Replit
    // The client will send a hello message and we'll respond to that instead
  });
  
  wss.on('error', (error) => {
    console.error('❌ WebSocket server error:', error);
  });
  
  wss.on('headers', (headers, req) => {
    console.log('📋 WebSocket response headers being sent:', headers);
  });

  // Broadcast notification to all connected clients
  const broadcastNotification = (notification: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(notification));
      }
    });
  };

  // Add notification broadcaster to global scope for use in other services
  (global as any).broadcastNotification = broadcastNotification;

  // Additional API routes for enhanced features
  
  // Performance metrics API
  app.get('/api/performance/metrics', requireAdminOrFaculty, (req, res) => {
    res.json({
      metrics: performanceMonitor.getMetrics(),
      averageResponseTime: performanceMonitor.getAverageResponseTime(),
      uptime: performanceMonitor.getUptime()
    });
  });

  // Reporting APIs for analytics
  app.get('/api/reports/attendance-trend', requireAdminOrFaculty, async (req, res) => {
    try {
      const trendData = await generateAttendanceTrendData();
      res.json(trendData);
    } catch (error) {
      console.error("Error fetching attendance trend:", error);
      res.status(500).json({ message: "Failed to fetch attendance trend data" });
    }
  });

  app.get('/api/reports/student-performance', requireAdminOrFaculty, async (req, res) => {
    try {
      const performanceData = await generateStudentPerformanceData();
      res.json(performanceData);
    } catch (error) {
      console.error("Error fetching student performance:", error);
      res.status(500).json({ message: "Failed to fetch student performance data" });
    }
  });

  // Memory monitoring and optimization endpoints
  app.get('/api/system/memory-status', requireAdminOrFaculty, async (req, res) => {
    try {
      const { EmergencyMemoryOptimizer } = await import('./utils/emergencyMemoryOptimizer');
      const { MemoryOptimizer } = await import('./utils/memoryOptimizer');
      
      const memoryReport = EmergencyMemoryOptimizer.getMemoryReport();
      const basicStats = MemoryOptimizer.getMemoryStats();
      
      const recommendations: string[] = [];
      if (memoryReport.status === 'CRITICAL') {
        recommendations.push('IMMEDIATE: Memory usage is critical - emergency cleanup recommended');
      } else if (memoryReport.status === 'HIGH') {
        recommendations.push('WARNING: High memory usage detected - monitoring closely');
      } else {
        recommendations.push('NORMAL: Memory usage is within acceptable limits');
      }

      const fullReport = {
        ...memoryReport,
        basicStats,
        recommendations,
        lastOptimization: new Date().toISOString()
      };

      res.json(fullReport);
    } catch (error) {
      console.error("Error fetching memory status:", error);
      res.status(500).json({ message: "Failed to fetch memory status" });
    }
  });

  app.post('/api/system/force-memory-cleanup', requireAdmin, async (req, res) => {
    try {
      const { EmergencyMemoryOptimizer } = await import('./utils/emergencyMemoryOptimizer');
      const { MemoryOptimizer } = await import('./utils/memoryOptimizer');
      
      const before = process.memoryUsage();
      
      // Force emergency cleanup
      await EmergencyMemoryOptimizer.forceEmergencyCleanup();
      
      // Additional manual cleanup
      const gcResult = MemoryOptimizer.forceGarbageCollection();
      
      const after = process.memoryUsage();
      const totalFreed = Math.round((before.rss - after.rss) / 1024 / 1024);
      
      res.json({
        success: true,
        message: `Memory cleanup completed: freed ${totalFreed}MB`,
        before: Math.round(before.rss / 1024 / 1024),
        after: Math.round(after.rss / 1024 / 1024),
        freed: totalFreed,
        gcResult
      });
    } catch (error) {
      console.error("Error forcing memory cleanup:", error);
      res.status(500).json({ message: "Failed to force memory cleanup" });
    }
  });

  app.get('/api/system/optimize-settings', requireAdminOrFaculty, async (req, res) => {
    try {
      const settings = {
        memoryThresholds: {
          normal: '150MB',
          high: '200MB', 
          critical: '300MB'
        },
        optimizationIntervals: {
          monitoring: '60 seconds',
          cleanup: '2 minutes',
          emergencyCheck: '1 minute'
        },
        activeOptimizations: [
          'Emergency memory monitoring',
          'Automatic garbage collection',
          'Batch processing for notifications',
          'Query result caching limits',
          'WebSocket connection pooling'
        ],
        performanceFeatures: [
          'Real-time memory monitoring',
          'Automatic cleanup triggers',
          'Memory usage alerts',
          'Performance metrics tracking'
        ]
      };
      
      res.json(settings);
    } catch (error) {
      console.error("Error fetching optimization settings:", error);
      res.status(500).json({ message: "Failed to fetch optimization settings" });
    }
  });

  // IoT Device Management Routes
  app.get('/api/iot/devices', requireAdminOrFaculty, async (req, res) => {
    try {
      const devices = iotDeviceManager.getConnectedDevices();
      res.json({
        devices,
        total: devices.length,
        online: devices.filter(d => d.status === 'online').length,
        offline: devices.filter(d => d.status === 'offline').length
      });
    } catch (error) {
      console.error("Error fetching IoT devices:", error);
      res.status(500).json({ message: "Failed to fetch IoT devices" });
    }
  });

  app.get('/api/iot/devices/:deviceId', requireAdminOrFaculty, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const device = iotDeviceManager.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      console.error("Error fetching device details:", error);
      res.status(500).json({ message: "Failed to fetch device details" });
    }
  });

  app.post('/api/iot/devices/:deviceId/config', requireAdmin, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      const config = req.body;
      
      const success = iotDeviceManager.updateDeviceConfig(deviceId, config);
      
      if (success) {
        res.json({ success: true, message: "Configuration sent to device" });
      } else {
        res.status(404).json({ message: "Device not found or offline" });
      }
    } catch (error) {
      console.error("Error updating device config:", error);
      res.status(500).json({ message: "Failed to update device configuration" });
    }
  });

  app.post('/api/iot/devices/:deviceId/diagnostics', requireAdminOrFaculty, async (req, res) => {
    try {
      const deviceId = req.params.deviceId;
      
      const success = iotDeviceManager.requestDiagnostics(deviceId);
      
      if (success) {
        res.json({ success: true, message: "Diagnostics request sent to device" });
      } else {
        res.status(404).json({ message: "Device not found or offline" });
      }
    } catch (error) {
      console.error("Error requesting diagnostics:", error);
      res.status(500).json({ message: "Failed to request diagnostics" });
    }
  });

  app.post('/api/iot/broadcast', requireAdmin, async (req, res) => {
    try {
      const message = req.body;
      iotDeviceManager.broadcastToDevices(message);
      res.json({ success: true, message: "Message broadcasted to all devices" });
    } catch (error) {
      console.error("Error broadcasting message:", error);
      res.status(500).json({ message: "Failed to broadcast message" });
    }
  });

  app.get('/api/iot/setup-guide', requireAdminOrFaculty, async (req, res) => {
    try {
      const setupGuide = {
        hardwareRequirements: [
          "ESP32-S3 Development Board",
          "RC522 RFID Module (13.56 MHz)",
          "HC-SR501 PIR Motion Sensor", 
          "MIFARE RFID Cards/Tags",
          "5V Power Supply",
          "Jumper wires and breadboard"
        ],
        wiring: {
          "RFID RC522": {
            "VCC": "3.3V",
            "RST": "GPIO 22",
            "GND": "GND", 
            "MISO": "GPIO 19",
            "MOSI": "GPIO 23",
            "SCK": "GPIO 18",
            "SDA": "GPIO 5"
          },
          "PIR HC-SR501": {
            "VCC": "5V",
            "GND": "GND",
            "OUT": "GPIO 4"
          },
          "LED": {
            "Anode": "GPIO 2",
            "Cathode": "GND"
          }
        },
        configuration: {
          wifiSSID: "Update in Arduino code",
          wifiPassword: "Update in Arduino code", 
          serverHost: req.get('host'),
          serverPort: "443 (HTTPS)",
          serverPath: "/iot"
        },
        steps: [
          "Install Arduino IDE and ESP32 board support",
          "Install required libraries: WebSocketsClient, ArduinoJson, MFRC522",
          "Wire components according to diagram",
          "Update WiFi credentials in code",
          "Update server URL with your Replit domain",
          "Upload code to ESP32",
          "Monitor serial output for connection status",
          "Register device in CLIRDEC admin panel"
        ]
      };
      
      res.json(setupGuide);
    } catch (error) {
      console.error("Error generating setup guide:", error);
      res.status(500).json({ message: "Failed to generate setup guide" });
    }
  });

  // Privacy Consent Management - ISO 27701 Compliance
  app.post('/api/consent', async (req: any, res) => {
    try {
      const { userEmail, consentType, consentGiven, studentId, userType = "parent" } = req.body;
      
      if (!userEmail || !consentType || consentGiven === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const consent = await consentService.logConsent({
        userType,
        userEmail: userEmail.toLowerCase().trim(),
        studentId,
        consentType,
        consentGiven,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      res.status(201).json(consent);
    } catch (error) {
      console.error("Error logging consent:", error);
      res.status(500).json({ message: "Failed to log consent" });
    }
  });

  app.get('/api/consent/:email', async (req, res) => {
    try {
      const userEmail = req.params.email.toLowerCase().trim();
      const consents = await consentService.getUserConsents(userEmail);
      res.json(consents);
    } catch (error) {
      console.error("Error fetching consents:", error);
      res.status(500).json({ message: "Failed to fetch consents" });
    }
  });

  app.get('/api/consent/:email/:type', async (req, res) => {
    try {
      const userEmail = req.params.email.toLowerCase().trim();
      const consentType = req.params.type;
      const consent = await consentService.getLatestConsent(userEmail, consentType);
      res.json(consent || { consentGiven: false });
    } catch (error) {
      console.error("Error checking consent:", error);
      res.status(500).json({ message: "Failed to check consent" });
    }
  });

  // Data Retention Policies - ISO 27701 Compliance
  app.get('/api/retention-policies', requireAdmin, async (req, res) => {
    try {
      const policies = await dataRetentionService.getPolicies();
      res.json(policies);
    } catch (error) {
      console.error("Error fetching retention policies:", error);
      res.status(500).json({ message: "Failed to fetch retention policies" });
    }
  });

  app.post('/api/retention-policies', requireAdmin, async (req, res) => {
    try {
      const policy = await dataRetentionService.createPolicy(req.body);
      res.status(201).json(policy);
    } catch (error) {
      console.error("Error creating retention policy:", error);
      res.status(400).json({ message: "Failed to create retention policy" });
    }
  });

  app.put('/api/retention-policies/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const policy = await dataRetentionService.updatePolicy(id, req.body);
      res.json(policy);
    } catch (error) {
      console.error("Error updating retention policy:", error);
      res.status(400).json({ message: "Failed to update retention policy" });
    }
  });

  app.delete('/api/retention-policies/:id', requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await dataRetentionService.deletePolicy(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting retention policy:", error);
      res.status(400).json({ message: "Failed to delete retention policy" });
    }
  });

  app.post('/api/retention-policies/cleanup', requireAdmin, async (req: any, res) => {
    try {
      const results = await dataRetentionService.cleanupOldData();
      
      // Audit log
      await auditService.logAction({
        userId: req.user.id,
        action: "CLEANUP",
        entityType: "data_retention",
        entityId: "bulk",
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: "success",
      });

      res.json({ 
        success: true, 
        message: "Data cleanup completed",
        results 
      });
    } catch (error) {
      console.error("Error cleaning up old data:", error);
      res.status(500).json({ message: "Failed to cleanup old data" });
    }
  });

  // Audit logs API - for compliance dashboard
  app.get('/api/audit-logs', requireAdmin, async (req, res) => {
    try {
      const logs = await auditService.getRecentLogs(100); // Get last 100 logs
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Data Export API - GDPR-style data portability
  app.get('/api/export/student/:id', requireAdminOrFaculty, async (req, res) => {
    try {
      const studentId = parseInt(req.params.id);
      
      // Get student data
      const student = await storage.getStudent(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Get attendance records
      const attendanceRecords = await storage.getAttendanceByStudent(studentId);

      // Get enrollments
      const enrollments = await storage.getEnrollmentsByStudent(studentId);

      // Get consent logs
      const consents = await consentService.getUserConsents(student.email || student.parentEmail);

      const exportData = {
        exportDate: new Date().toISOString(),
        student: {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          gender: student.gender,
          year: student.year,
          section: student.section,
          parentEmail: student.parentEmail,
          parentName: student.parentName,
        },
        attendance: attendanceRecords,
        enrollments,
        consents,
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=student_${student.studentId}_data_export.json`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting student data:", error);
      res.status(500).json({ message: "Failed to export student data" });
    }
  });

  app.get('/api/export/parent/:email', async (req, res) => {
    try {
      const parentEmail = req.params.email.toLowerCase().trim();
      
      // Get all students for this parent
      const allStudents = await storage.getStudents();
      const parentStudents = allStudents.filter(s => 
        s.parentEmail?.toLowerCase() === parentEmail && s.isActive
      );

      if (parentStudents.length === 0) {
        return res.status(404).json({ message: "No students found for this parent email" });
      }

      const exportData: any = {
        exportDate: new Date().toISOString(),
        parentEmail,
        students: [],
        consents: []
      };

      for (const student of parentStudents) {
        const attendanceRecords = await storage.getAttendanceByStudent(student.id);
        const enrollments = await storage.getEnrollmentsByStudent(student.id);
        
        exportData.students.push({
          student: {
            id: student.id,
            studentId: student.studentId,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            year: student.year,
            section: student.section,
          },
          attendance: attendanceRecords,
          enrollments,
        });
      }

      // Get consent logs
      const consents = await consentService.getUserConsents(parentEmail);
      exportData.consents = consents;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=parent_${parentEmail}_data_export.json`);
      res.json(exportData);
    } catch (error) {
      console.error("Error exporting parent data:", error);
      res.status(500).json({ message: "Failed to export parent data" });
    }
  });
  
  return httpServer;
}
