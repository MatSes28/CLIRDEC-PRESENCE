import { 
  pgTable, 
  text, 
  serial, 
  varchar, 
  timestamp, 
  jsonb, 
  index,
  boolean,
  integer,
  time,
  decimal
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User/Professor storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  role: varchar("role").notNull().default("faculty"), // 'admin' or 'faculty'
  facultyId: varchar("faculty_id").unique(),
  department: varchar("department").default("Information Technology"),
  gender: varchar("gender").default("male"), // 'male' or 'female' for avatar styling
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Students table
export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  studentId: varchar("student_id").unique().notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  gender: varchar("gender").notNull().default("male"), // 'male' or 'female' for avatar styling
  year: integer("year").notNull(),
  section: varchar("section").notNull(),
  rfidCardId: varchar("rfid_card_id").unique(),
  parentEmail: varchar("parent_email").notNull(),
  parentName: varchar("parent_name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Classrooms table
export const classrooms = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  location: varchar("location"),
  type: varchar("type").notNull(), // 'lecture' or 'laboratory'
  capacity: integer("capacity").default(30),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subjects table
export const subjects = pgTable("subjects", {
  id: serial("id").primaryKey(),
  code: varchar("code").unique().notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  professorId: varchar("professor_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Class schedules table
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").references(() => subjects.id),
  classroomId: integer("classroom_id").references(() => classrooms.id),
  professorId: varchar("professor_id").references(() => users.id),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Monday, 7=Sunday
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  semester: varchar("semester"), // e.g., "1st", "2nd", "Summer"
  academicYear: varchar("academic_year"), // e.g., "2024-2025"
  autoStart: boolean("auto_start").default(true),
  autoPopulate: boolean("auto_populate").default(true), // Auto-create sessions for entire semester
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Class sessions table
export const sessions_class = pgTable("class_sessions", {
  id: serial("id").primaryKey(),
  scheduleId: integer("schedule_id").references(() => schedules.id),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  status: varchar("status").default("scheduled"), // scheduled, active, completed, cancelled
  attendanceMode: varchar("attendance_mode").default("tap_in"), // tap_in, tap_out
  lateThresholdMinutes: integer("late_threshold_minutes").default(15),
  absentThresholdPercent: integer("absent_threshold_percent").default(60),
  professorId: varchar("professor_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Attendance records table
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions_class.id),
  studentId: integer("student_id").references(() => students.id),
  checkInTime: timestamp("check_in_time"),
  checkOutTime: timestamp("check_out_time"),
  status: varchar("status").default("absent"), // present, late, absent
  proximityValidated: boolean("proximity_validated").default(false),
  entryValidated: boolean("entry_validated").default(false),
  exitValidated: boolean("exit_validated").default(false),
  rfidTapTime: timestamp("rfid_tap_time"),
  sensorDetectionTime: timestamp("sensor_detection_time"),
  validationTimeout: boolean("validation_timeout").default(false),
  discrepancyFlag: varchar("discrepancy_flag"), // ghost_tap, missed_tap, sensor_only, normal
  computerId: integer("computer_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Student enrollments table - tracks which students are enrolled in which subjects
export const enrollments = pgTable("enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id).notNull(),
  subjectId: integer("subject_id").references(() => subjects.id).notNull(),
  academicYear: varchar("academic_year").notNull(), // e.g., "2024-2025"
  semester: varchar("semester").notNull(), // e.g., "1st", "2nd", "Summer"
  status: varchar("status").default("active"), // active, dropped, completed
  enrolledAt: timestamp("enrolled_at").defaultNow(),
  droppedAt: timestamp("dropped_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Laboratory computers table
export const computers = pgTable("computers", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  classroomId: integer("classroom_id").references(() => classrooms.id),
  ipAddress: varchar("ip_address"),
  status: varchar("status").default("available"), // available, occupied, maintenance
  assignedStudentId: integer("assigned_student_id").references(() => students.id),
  professorId: varchar("professor_id").notNull(), // Track which faculty created this computer
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email notifications log
export const emailNotifications = pgTable("email_notifications", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  recipientEmail: varchar("recipient_email").notNull(),
  recipientName: varchar("recipient_name"),
  subject: varchar("subject").notNull(),
  message: text("message").notNull(),
  content: text("content"), // for backward compatibility
  type: varchar("type").notNull(), // absence_alert, late_arrival, daily_summary, attendance_alert
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  status: varchar("status").default("pending"), // pending, sent, failed
  sentBy: varchar("sent_by"), // professor ID or 'system' for automated alerts
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// System settings table
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key").unique().notNull(),
  value: text("value"),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit logs table - ISO 27001 compliance
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"), // Who performed the action
  action: varchar("action").notNull(), // CREATE, UPDATE, DELETE, LOGIN, LOGOUT, ACCESS
  entityType: varchar("entity_type").notNull(), // users, students, attendance, etc.
  entityId: varchar("entity_id"), // ID of the affected record
  changes: jsonb("changes"), // Before/after values for updates
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  status: varchar("status").default("success"), // success, failed
  errorMessage: text("error_message"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Login attempts table - Rate limiting & security
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  ipAddress: varchar("ip_address").notNull(),
  success: boolean("success").notNull(),
  userAgent: varchar("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Data deletion requests - GDPR/Privacy compliance
export const deletionRequests = pgTable("deletion_requests", {
  id: serial("id").primaryKey(),
  entityType: varchar("entity_type").notNull(), // user, student
  entityId: varchar("entity_id").notNull(),
  requestedBy: varchar("requested_by").notNull(), // Admin user ID
  reason: text("reason"),
  status: varchar("status").default("pending"), // pending, approved, completed
  scheduledDate: timestamp("scheduled_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  subjects: many(subjects),
  schedules: many(schedules),
  classSessions: many(sessions_class),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  attendance: many(attendance),
  assignedComputers: many(computers),
  emailNotifications: many(emailNotifications),
  enrollments: many(enrollments),
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  professor: one(users, {
    fields: [subjects.professorId],
    references: [users.id],
  }),
  schedules: many(schedules),
  enrollments: many(enrollments),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  subject: one(subjects, {
    fields: [schedules.subjectId],
    references: [subjects.id],
  }),
  classroom: one(classrooms, {
    fields: [schedules.classroomId],
    references: [classrooms.id],
  }),
  professor: one(users, {
    fields: [schedules.professorId],
    references: [users.id],
  }),
  classSessions: many(sessions_class),
}));

export const classSessionsRelations = relations(sessions_class, ({ one, many }) => ({
  schedule: one(schedules, {
    fields: [sessions_class.scheduleId],
    references: [schedules.id],
  }),
  professor: one(users, {
    fields: [sessions_class.professorId],
    references: [users.id],
  }),
  attendance: many(attendance),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  session: one(sessions_class, {
    fields: [attendance.sessionId],
    references: [sessions_class.id],
  }),
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
  computer: one(computers, {
    fields: [attendance.computerId],
    references: [computers.id],
  }),
}));

export const classroomsRelations = relations(classrooms, ({ many }) => ({
  schedules: many(schedules),
  computers: many(computers),
}));

export const computersRelations = relations(computers, ({ one, many }) => ({
  classroom: one(classrooms, {
    fields: [computers.classroomId],
    references: [classrooms.id],
  }),
  assignedStudent: one(students, {
    fields: [computers.assignedStudentId],
    references: [students.id],
  }),
  professor: one(users, {
    fields: [computers.professorId],
    references: [users.id],
  }),
  attendance: many(attendance),
}));

export const emailNotificationsRelations = relations(emailNotifications, ({ one }) => ({
  student: one(students, {
    fields: [emailNotifications.studentId],
    references: [students.id],
  }),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  subject: one(subjects, {
    fields: [enrollments.subjectId],
    references: [subjects.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClassroomSchema = createInsertSchema(classrooms).omit({
  id: true,
  createdAt: true,
});

export const insertSubjectSchema = createInsertSchema(subjects).omit({
  id: true,
  createdAt: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

export const insertClassSessionSchema = createInsertSchema(sessions_class).omit({
  id: true,
  createdAt: true,
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertComputerSchema = createInsertSchema(computers).omit({
  id: true,
  createdAt: true,
});

export const insertEmailNotificationSchema = createInsertSchema(emailNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertEnrollmentSchema = createInsertSchema(enrollments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({
  id: true,
  timestamp: true,
});

export const insertDeletionRequestSchema = createInsertSchema(deletionRequests).omit({
  id: true,
  createdAt: true,
});

// Password validation schema - ISO 27001 compliant
export const strongPasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Update schemas - all fields optional for partial updates
export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: strongPasswordSchema.optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(["admin", "faculty"]).optional(),
  facultyId: z.string().nullable().optional(),
  department: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  isActive: z.boolean().optional(),
});

export const updateStudentSchema = z.object({
  studentId: z.string().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  gender: z.enum(["male", "female"]).optional(),
  year: z.number().int().min(1).max(5).optional(),
  section: z.string().optional(),
  rfidCardId: z.string().nullable().optional(),
  parentEmail: z.string().email().optional(),
  parentName: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateClassroomSchema = z.object({
  name: z.string().optional(),
  location: z.string().nullable().optional(),
  type: z.enum(["lecture", "laboratory"]).optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const updateSubjectSchema = z.object({
  code: z.string().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  professorId: z.string().nullable().optional(),
});

export const updateScheduleSchema = z.object({
  subjectId: z.number().int().optional(),
  classroomId: z.number().int().optional(),
  professorId: z.string().optional(),
  dayOfWeek: z.number().int().min(1).max(7).optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  semester: z.string().nullable().optional(),
  academicYear: z.string().nullable().optional(),
  autoStart: z.boolean().optional(),
  autoPopulate: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const updateComputerSchema = z.object({
  name: z.string().optional(),
  classroomId: z.number().int().optional(),
  status: z.enum(["available", "occupied", "maintenance"]).optional(),
  assignedStudentId: z.number().int().nullable().optional(),
  isActive: z.boolean().optional(),
});

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type UpdateStudent = z.infer<typeof updateStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertClassroom = z.infer<typeof insertClassroomSchema>;
export type Classroom = typeof classrooms.$inferSelect;
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjects.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertClassSession = z.infer<typeof insertClassSessionSchema>;
export type ClassSession = typeof sessions_class.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertComputer = z.infer<typeof insertComputerSchema>;
export type Computer = typeof computers.$inferSelect;
export type InsertEmailNotification = z.infer<typeof insertEmailNotificationSchema>;
export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEnrollment = z.infer<typeof insertEnrollmentSchema>;
export type Enrollment = typeof enrollments.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertDeletionRequest = z.infer<typeof insertDeletionRequestSchema>;
export type DeletionRequest = typeof deletionRequests.$inferSelect;
