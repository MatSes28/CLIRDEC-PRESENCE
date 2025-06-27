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

// User/Professor storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  facultyId: varchar("faculty_id").unique(),
  department: varchar("department").default("Information Technology"),
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
  year: integer("year").notNull(),
  section: varchar("section").notNull(),
  rfidCardId: varchar("rfid_card_id").unique(),
  parentEmail: varchar("parent_email"),
  parentName: varchar("parent_name"),
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
  autoStart: boolean("auto_start").default(true),
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
  computerId: integer("computer_id"),
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
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email notifications log
export const emailNotifications = pgTable("email_notifications", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => students.id),
  recipientEmail: varchar("recipient_email").notNull(),
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  type: varchar("type").notNull(), // absence_alert, late_arrival, daily_summary
  status: varchar("status").default("pending"), // pending, sent, failed
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
}));

export const subjectsRelations = relations(subjects, ({ one, many }) => ({
  professor: one(users, {
    fields: [subjects.professorId],
    references: [users.id],
  }),
  schedules: many(schedules),
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
  attendance: many(attendance),
}));

export const emailNotificationsRelations = relations(emailNotifications, ({ one }) => ({
  student: one(students, {
    fields: [emailNotifications.studentId],
    references: [students.id],
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

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;
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
export type SystemSetting = typeof systemSettings.$inferSelect;
