import {
  users,
  students,
  classrooms,
  subjects,
  schedules,
  sessions_class,
  attendance,
  computers,
  emailNotifications,
  systemSettings,
  type User,
  type UpsertUser,
  type Student,
  type InsertStudent,
  type Classroom,
  type InsertClassroom,
  type Subject,
  type InsertSubject,
  type Schedule,
  type InsertSchedule,
  type ClassSession,
  type InsertClassSession,
  type Attendance,
  type InsertAttendance,
  type Computer,
  type InsertComputer,
  type EmailNotification,
  type InsertEmailNotification,
  type SystemSetting,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";

export interface IStorage {
  // User operations - required for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Student operations
  getStudents(): Promise<Student[]>;
  getStudent(id: number): Promise<Student | undefined>;
  getStudentByRFID(rfidCardId: string): Promise<Student | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: number): Promise<void>;

  // Classroom operations
  getClassrooms(): Promise<Classroom[]>;
  getClassroom(id: number): Promise<Classroom | undefined>;
  createClassroom(classroom: InsertClassroom): Promise<Classroom>;
  updateClassroom(id: number, classroom: Partial<InsertClassroom>): Promise<Classroom>;

  // Subject operations
  getSubjects(): Promise<Subject[]>;
  getSubjectsByProfessor(professorId: string): Promise<Subject[]>;
  createSubject(subject: InsertSubject): Promise<Subject>;
  updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject>;
  deleteSubject(id: number): Promise<void>;

  // Schedule operations
  getSchedules(): Promise<Schedule[]>;
  getSchedulesByProfessor(professorId: string): Promise<Schedule[]>;
  createSchedule(schedule: InsertSchedule): Promise<Schedule>;
  updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule>;
  deleteSchedule(id: number): Promise<void>;

  // Class session operations
  getActiveSession(professorId: string): Promise<ClassSession | undefined>;
  createClassSession(session: InsertClassSession): Promise<ClassSession>;
  updateClassSession(id: number, session: Partial<InsertClassSession>): Promise<ClassSession>;
  getClassSessionsByDate(date: Date): Promise<ClassSession[]>;

  // Attendance operations
  getAttendanceBySession(sessionId: number): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance>;
  checkStudentAttendance(studentId: number, sessionId: number): Promise<Attendance | undefined>;

  // Computer operations
  getComputers(): Promise<Computer[]>;
  getComputersByClassroom(classroomId: number): Promise<Computer[]>;
  createComputer(computer: InsertComputer): Promise<Computer>;
  updateComputer(id: number, computer: Partial<InsertComputer>): Promise<Computer>;
  deleteComputer(id: number): Promise<void>;
  assignComputerToStudent(computerId: number, studentId: number): Promise<Computer>;
  releaseComputer(computerId: number): Promise<Computer>;

  // Email notification operations
  createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification>;
  getUnsentNotifications(): Promise<EmailNotification[]>;
  markNotificationAsSent(id: number): Promise<void>;

  // System settings operations
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  setSystemSetting(key: string, value: string, description?: string): Promise<SystemSetting>;
}

export class DatabaseStorage implements IStorage {
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Student operations
  async getStudents(): Promise<Student[]> {
    return await db.select().from(students).where(eq(students.isActive, true)).orderBy(asc(students.lastName));
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.id, id));
    return student;
  }

  async getStudentByRFID(rfidCardId: string): Promise<Student | undefined> {
    const [student] = await db.select().from(students).where(eq(students.rfidCardId, rfidCardId));
    return student;
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const [newStudent] = await db.insert(students).values(student).returning();
    return newStudent;
  }

  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student> {
    const [updatedStudent] = await db
      .update(students)
      .set({ ...student, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    return updatedStudent;
  }

  async deleteStudent(id: number): Promise<void> {
    await db.update(students).set({ isActive: false }).where(eq(students.id, id));
  }

  // Classroom operations
  async getClassrooms(): Promise<Classroom[]> {
    return await db.select().from(classrooms).where(eq(classrooms.isActive, true)).orderBy(asc(classrooms.name));
  }

  async getClassroom(id: number): Promise<Classroom | undefined> {
    const [classroom] = await db.select().from(classrooms).where(eq(classrooms.id, id));
    return classroom;
  }

  async createClassroom(classroom: InsertClassroom): Promise<Classroom> {
    const [newClassroom] = await db.insert(classrooms).values(classroom).returning();
    return newClassroom;
  }

  async updateClassroom(id: number, classroom: Partial<InsertClassroom>): Promise<Classroom> {
    const [updatedClassroom] = await db
      .update(classrooms)
      .set(classroom)
      .where(eq(classrooms.id, id))
      .returning();
    return updatedClassroom;
  }

  // Subject operations
  async getSubjects(): Promise<Subject[]> {
    return await db.select().from(subjects).orderBy(asc(subjects.name));
  }

  async getSubjectsByProfessor(professorId: string): Promise<Subject[]> {
    return await db.select().from(subjects).where(eq(subjects.professorId, professorId)).orderBy(asc(subjects.name));
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const [newSubject] = await db.insert(subjects).values(subject).returning();
    return newSubject;
  }

  async updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject> {
    const [updatedSubject] = await db
      .update(subjects)
      .set(subject)
      .where(eq(subjects.id, id))
      .returning();
    return updatedSubject;
  }

  async deleteSubject(id: number): Promise<void> {
    await db.delete(subjects).where(eq(subjects.id, id));
  }

  // Schedule operations
  async getSchedules(): Promise<Schedule[]> {
    return await db.select().from(schedules).where(eq(schedules.isActive, true)).orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime));
  }

  async getSchedulesByProfessor(professorId: string): Promise<Schedule[]> {
    return await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.professorId, professorId), eq(schedules.isActive, true)))
      .orderBy(asc(schedules.dayOfWeek), asc(schedules.startTime));
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const [newSchedule] = await db.insert(schedules).values(schedule).returning();
    return newSchedule;
  }

  async updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule> {
    const [updatedSchedule] = await db
      .update(schedules)
      .set(schedule)
      .where(eq(schedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteSchedule(id: number): Promise<void> {
    await db.delete(schedules).where(eq(schedules.id, id));
  }

  // Class session operations
  async getActiveSession(professorId: string): Promise<ClassSession | undefined> {
    const [session] = await db
      .select()
      .from(sessions_class)
      .where(and(eq(sessions_class.professorId, professorId), eq(sessions_class.status, "active")))
      .orderBy(desc(sessions_class.startTime));
    return session;
  }

  async createClassSession(session: InsertClassSession): Promise<ClassSession> {
    const [newSession] = await db.insert(sessions_class).values(session).returning();
    return newSession;
  }

  async updateClassSession(id: number, session: Partial<InsertClassSession>): Promise<ClassSession> {
    const [updatedSession] = await db
      .update(sessions_class)
      .set(session)
      .where(eq(sessions_class.id, id))
      .returning();
    return updatedSession;
  }

  async getClassSessionsByDate(date: Date): Promise<ClassSession[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(sessions_class)
      .where(and(gte(sessions_class.date, startOfDay), lte(sessions_class.date, endOfDay)))
      .orderBy(desc(sessions_class.startTime));
  }

  // Attendance operations
  async getAttendanceBySession(sessionId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.sessionId, sessionId)).orderBy(desc(attendance.checkInTime));
  }

  async createAttendance(attendanceRecord: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db.insert(attendance).values(attendanceRecord).returning();
    return newAttendance;
  }

  async updateAttendance(id: number, attendanceRecord: Partial<InsertAttendance>): Promise<Attendance> {
    const [updatedAttendance] = await db
      .update(attendance)
      .set({ ...attendanceRecord, updatedAt: new Date() })
      .where(eq(attendance.id, id))
      .returning();
    return updatedAttendance;
  }

  async checkStudentAttendance(studentId: number, sessionId: number): Promise<Attendance | undefined> {
    const [attendanceRecord] = await db
      .select()
      .from(attendance)
      .where(and(eq(attendance.studentId, studentId), eq(attendance.sessionId, sessionId)));
    return attendanceRecord;
  }

  // Computer operations
  async getComputers(): Promise<Computer[]> {
    return await db.select().from(computers).where(eq(computers.isActive, true)).orderBy(asc(computers.name));
  }

  async getComputersByClassroom(classroomId: number): Promise<Computer[]> {
    return await db
      .select()
      .from(computers)
      .where(and(eq(computers.classroomId, classroomId), eq(computers.isActive, true)))
      .orderBy(asc(computers.name));
  }

  async createComputer(computer: InsertComputer): Promise<Computer> {
    const [newComputer] = await db.insert(computers).values(computer).returning();
    return newComputer;
  }

  async updateComputer(id: number, computer: Partial<InsertComputer>): Promise<Computer> {
    const [updatedComputer] = await db
      .update(computers)
      .set(computer)
      .where(eq(computers.id, id))
      .returning();
    return updatedComputer;
  }

  async deleteComputer(id: number): Promise<void> {
    await db.delete(computers).where(eq(computers.id, id));
  }

  async assignComputerToStudent(computerId: number, studentId: number): Promise<Computer> {
    const [updatedComputer] = await db
      .update(computers)
      .set({ assignedStudentId: studentId, status: "occupied" })
      .where(eq(computers.id, computerId))
      .returning();
    return updatedComputer;
  }

  async releaseComputer(computerId: number): Promise<Computer> {
    const [updatedComputer] = await db
      .update(computers)
      .set({ assignedStudentId: null, status: "available" })
      .where(eq(computers.id, computerId))
      .returning();
    return updatedComputer;
  }

  // Email notification operations
  async createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification> {
    const [newNotification] = await db.insert(emailNotifications).values(notification).returning();
    return newNotification;
  }

  async getUnsentNotifications(): Promise<EmailNotification[]> {
    return await db.select().from(emailNotifications).where(eq(emailNotifications.status, "pending")).orderBy(asc(emailNotifications.createdAt));
  }

  async markNotificationAsSent(id: number): Promise<void> {
    await db
      .update(emailNotifications)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(emailNotifications.id, id));
  }

  // System settings operations
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting;
  }

  async setSystemSetting(key: string, value: string, description?: string): Promise<SystemSetting> {
    const [setting] = await db
      .insert(systemSettings)
      .values({ key, value, description, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, description, updatedAt: new Date() },
      })
      .returning();
    return setting;
  }
}

export const storage = new DatabaseStorage();
