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
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: Partial<User>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  deleteUser(id: string): Promise<void>;

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
  getActiveClassSessions(): Promise<ClassSession[]>;
  getAllClassSessions(): Promise<ClassSession[]>;
  createClassSession(session: InsertClassSession): Promise<ClassSession>;
  updateClassSession(id: number, session: Partial<InsertClassSession>): Promise<ClassSession>;
  getClassSessionsByDate(date: Date): Promise<ClassSession[]>;

  // Attendance operations
  getAttendanceBySession(sessionId: number): Promise<Attendance[]>;
  getAttendanceByStudentAndSession(studentId: number, sessionId: number): Promise<Attendance | undefined>;
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

// In-memory storage implementation for when database is unavailable
export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private students: Map<number, Student> = new Map();
  private classrooms: Map<number, Classroom> = new Map();
  private subjects: Map<number, Subject> = new Map();
  private schedules: Map<number, Schedule> = new Map();
  private classSessions: Map<number, ClassSession> = new Map();
  private attendance: Map<number, Attendance> = new Map();
  private computers: Map<number, Computer> = new Map();
  private emailNotifications: Map<number, EmailNotification> = new Map();
  private systemSettings: Map<string, SystemSetting> = new Map();
  private nextId = 1;

  constructor() {
    // Initialize with some sample data
    this.initializeSampleData();
  }

  private initializeSampleData() {
    // Sample data initialization - all data will be created through seedData.ts 
    // to avoid duplicate/conflicting records
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isActive);
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async getAllClassSessions(): Promise<ClassSession[]> {
    return Array.from(this.classSessions.values());
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const id = userData.id || Math.random().toString(36).substr(2, 9);
    const user: User = {
      id,
      email: userData.email!,
      password: userData.password!,
      firstName: userData.firstName!,
      lastName: userData.lastName!,
      role: userData.role || "faculty",
      facultyId: userData.facultyId || null,
      department: userData.department || "Information Technology",
      gender: userData.gender || "male",
      isActive: userData.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id!);
    const user: User = {
      id: userData.id!,
      email: userData.email || existingUser?.email || '',
      password: userData.password || existingUser?.password || '',
      firstName: userData.firstName || existingUser?.firstName || '',
      lastName: userData.lastName || existingUser?.lastName || '',
      role: userData.role || existingUser?.role || 'faculty',
      facultyId: userData.facultyId ?? existingUser?.facultyId ?? null,
      department: userData.department ?? existingUser?.department ?? "Information Technology",
      gender: userData.gender ?? existingUser?.gender ?? "male",
      isActive: userData.isActive ?? existingUser?.isActive ?? true,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(userData.id!, user);
    return user;
  }

  // Add missing storage methods for IoT service
  async getActiveClassSessions(): Promise<ClassSession[]> {
    return Array.from(this.classSessions.values()).filter(s => s.status === "active");
  }

  async getAttendanceByStudentAndSession(studentId: number, sessionId: number): Promise<Attendance | undefined> {
    return Array.from(this.attendance.values()).find(a => a.studentId === studentId && a.sessionId === sessionId);
  }

  // Student operations
  async getStudents(): Promise<Student[]> {
    return Array.from(this.students.values()).filter(s => s.isActive);
  }

  async getStudent(id: number): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByRFID(rfidCardId: string): Promise<Student | undefined> {
    return Array.from(this.students.values()).find(s => s.rfidCardId === rfidCardId);
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const newStudent: Student = { 
      ...student, 
      id: this.nextId++, 
      email: student.email || null,
      gender: student.gender || "male",
      rfidCardId: student.rfidCardId || null,
      isActive: student.isActive ?? true,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.students.set(newStudent.id, newStudent);
    return newStudent;
  }

  async updateStudent(id: number, student: Partial<InsertStudent>): Promise<Student> {
    const existing = this.students.get(id);
    if (!existing) throw new Error("Student not found");
    const updated = { ...existing, ...student, updatedAt: new Date() };
    this.students.set(id, updated);
    return updated;
  }

  async deleteStudent(id: number): Promise<void> {
    this.students.delete(id);
  }

  // Classroom operations
  async getClassrooms(): Promise<Classroom[]> {
    return Array.from(this.classrooms.values());
  }

  async getClassroom(id: number): Promise<Classroom | undefined> {
    return this.classrooms.get(id);
  }

  async createClassroom(classroom: InsertClassroom): Promise<Classroom> {
    const newClassroom: Classroom = { 
      ...classroom, 
      id: this.nextId++,
      location: classroom.location || null,
      capacity: classroom.capacity || null,
      isActive: classroom.isActive ?? true,
      createdAt: new Date() 
    };
    this.classrooms.set(newClassroom.id, newClassroom);
    return newClassroom;
  }

  async updateClassroom(id: number, classroom: Partial<InsertClassroom>): Promise<Classroom> {
    const existing = this.classrooms.get(id);
    if (!existing) throw new Error("Classroom not found");
    const updated = { ...existing, ...classroom };
    this.classrooms.set(id, updated);
    return updated;
  }

  // Subject operations
  async getSubjects(): Promise<Subject[]> {
    return Array.from(this.subjects.values());
  }

  async getSubjectsByProfessor(professorId: string): Promise<Subject[]> {
    return Array.from(this.subjects.values()).filter(s => s.professorId === professorId);
  }

  async createSubject(subject: InsertSubject): Promise<Subject> {
    const newSubject: Subject = { 
      ...subject, 
      id: this.nextId++,
      description: subject.description || null,
      professorId: subject.professorId || null,
      createdAt: new Date() 
    };
    this.subjects.set(newSubject.id, newSubject);
    return newSubject;
  }

  async updateSubject(id: number, subject: Partial<InsertSubject>): Promise<Subject> {
    const existing = this.subjects.get(id);
    if (!existing) throw new Error("Subject not found");
    const updated = { ...existing, ...subject };
    this.subjects.set(id, updated);
    return updated;
  }

  async deleteSubject(id: number): Promise<void> {
    this.subjects.delete(id);
  }

  // Schedule operations
  async getSchedules(): Promise<Schedule[]> {
    return Array.from(this.schedules.values());
  }

  async getSchedulesByProfessor(professorId: string): Promise<Schedule[]> {
    return Array.from(this.schedules.values()).filter(s => s.professorId === professorId);
  }

  async createSchedule(schedule: InsertSchedule): Promise<Schedule> {
    const newSchedule: Schedule = { 
      ...schedule, 
      id: this.nextId++,
      professorId: schedule.professorId || null,
      subjectId: schedule.subjectId || null,
      classroomId: schedule.classroomId || null,
      autoStart: schedule.autoStart ?? true,
      isActive: schedule.isActive ?? true,
      createdAt: new Date() 
    };
    this.schedules.set(newSchedule.id, newSchedule);
    return newSchedule;
  }

  async updateSchedule(id: number, schedule: Partial<InsertSchedule>): Promise<Schedule> {
    const existing = this.schedules.get(id);
    if (!existing) throw new Error("Schedule not found");
    const updated = { ...existing, ...schedule };
    this.schedules.set(id, updated);
    return updated;
  }

  async deleteSchedule(id: number): Promise<void> {
    this.schedules.delete(id);
  }

  // Class session operations
  async getActiveSession(professorId: string): Promise<ClassSession | undefined> {
    return Array.from(this.classSessions.values()).find(s => s.professorId === professorId && s.status === "active");
  }

  async createClassSession(session: InsertClassSession): Promise<ClassSession> {
    const newSession: ClassSession = { 
      ...session, 
      id: this.nextId++, 
      professorId: session.professorId || null,
      startTime: session.startTime || null,
      endTime: session.endTime || null,
      scheduleId: session.scheduleId || null,
      status: session.status || null,
      createdAt: new Date() 
    };
    this.classSessions.set(newSession.id, newSession);
    return newSession;
  }

  async updateClassSession(id: number, session: Partial<InsertClassSession>): Promise<ClassSession> {
    const existing = this.classSessions.get(id);
    if (!existing) throw new Error("Class session not found");
    const updated = { ...existing, ...session };
    this.classSessions.set(id, updated);
    return updated;
  }

  async getClassSessionsByDate(date: Date): Promise<ClassSession[]> {
    const dateStr = date.toISOString().split('T')[0];
    return Array.from(this.classSessions.values()).filter(s => 
      s.date && s.date.toISOString().split('T')[0] === dateStr
    );
  }

  // Attendance operations
  async getAttendanceBySession(sessionId: number): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(a => a.sessionId === sessionId);
  }

  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const newAttendance: Attendance = { 
      ...attendance, 
      id: this.nextId++, 
      studentId: attendance.studentId || null,
      sessionId: attendance.sessionId || null,
      status: attendance.status || null,
      checkInTime: attendance.checkInTime || null,
      checkOutTime: attendance.checkOutTime || null,
      proximityValidated: attendance.proximityValidated ?? null,
      computerId: attendance.computerId || null,
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.attendance.set(newAttendance.id, newAttendance);
    return newAttendance;
  }

  async updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance> {
    const existing = this.attendance.get(id);
    if (!existing) throw new Error("Attendance not found");
    const updated = { ...existing, ...attendance, updatedAt: new Date() };
    this.attendance.set(id, updated);
    return updated;
  }

  async checkStudentAttendance(studentId: number, sessionId: number): Promise<Attendance | undefined> {
    return Array.from(this.attendance.values()).find(a => a.studentId === studentId && a.sessionId === sessionId);
  }

  // Computer operations
  async getComputers(): Promise<Computer[]> {
    return Array.from(this.computers.values());
  }

  async getComputersByClassroom(classroomId: number): Promise<Computer[]> {
    return Array.from(this.computers.values()).filter(c => c.classroomId === classroomId);
  }

  async createComputer(computer: InsertComputer): Promise<Computer> {
    const newComputer: Computer = { 
      ...computer, 
      id: this.nextId++,
      classroomId: computer.classroomId || null,
      ipAddress: computer.ipAddress || null,
      status: computer.status || null,
      assignedStudentId: computer.assignedStudentId || null,
      isActive: computer.isActive ?? true,
      createdAt: new Date() 
    };
    this.computers.set(newComputer.id, newComputer);
    return newComputer;
  }

  async updateComputer(id: number, computer: Partial<InsertComputer>): Promise<Computer> {
    const existing = this.computers.get(id);
    if (!existing) throw new Error("Computer not found");
    const updated = { ...existing, ...computer };
    this.computers.set(id, updated);
    return updated;
  }

  async deleteComputer(id: number): Promise<void> {
    this.computers.delete(id);
  }

  async assignComputerToStudent(computerId: number, studentId: number): Promise<Computer> {
    const computer = this.computers.get(computerId);
    if (!computer) throw new Error("Computer not found");
    const updated = { ...computer, assignedStudentId: studentId, status: "occupied" as const };
    this.computers.set(computerId, updated);
    return updated;
  }

  async releaseComputer(computerId: number): Promise<Computer> {
    const computer = this.computers.get(computerId);
    if (!computer) throw new Error("Computer not found");
    const updated = { ...computer, assignedStudentId: null, status: "available" as const };
    this.computers.set(computerId, updated);
    return updated;
  }

  // Email notification operations
  async createEmailNotification(notification: InsertEmailNotification): Promise<EmailNotification> {
    const newNotification: EmailNotification = { 
      ...notification, 
      id: this.nextId++,
      studentId: notification.studentId || null,
      recipientName: notification.recipientName || null,
      content: notification.content || null,
      priority: notification.priority || null,
      status: notification.status || null,
      sentBy: notification.sentBy || null,
      sentAt: notification.sentAt || null,
      createdAt: new Date()
    };
    this.emailNotifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  async getUnsentNotifications(): Promise<EmailNotification[]> {
    return Array.from(this.emailNotifications.values()).filter(n => !n.sentAt);
  }

  async markNotificationAsSent(id: number): Promise<void> {
    const notification = this.emailNotifications.get(id);
    if (notification) {
      notification.sentAt = new Date();
      this.emailNotifications.set(id, notification);
    }
  }

  // System settings operations
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    return this.systemSettings.get(key);
  }

  async setSystemSetting(key: string, value: string, description?: string): Promise<SystemSetting> {
    const setting: SystemSetting = {
      id: this.nextId++,
      key,
      value,
      description: description || null,
      updatedAt: new Date(),
    };
    this.systemSettings.set(key, setting);
    return setting;
  }
}

// PostgreSQL database storage implementation
export class DbStorage implements IStorage {
  // User operations - required for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    if (!db) throw new Error("Database not available");
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!db) throw new Error("Database not available");
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: Partial<User>): Promise<User> {
    if (!db) throw new Error("Database not available");
    const [user] = await db.insert(users).values(userData as any).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    if (!db) throw new Error("Database not available");
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(asc(users.lastName));
  }

  async deleteUser(id: string): Promise<void> {
    if (!db) throw new Error("Database not available");
    await db.update(users).set({ isActive: false }).where(eq(users.id, id));
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

  async getActiveClassSessions(): Promise<ClassSession[]> {
    return await db
      .select()
      .from(sessions_class)
      .where(eq(sessions_class.status, "active"))
      .orderBy(desc(sessions_class.startTime));
  }

  async getAllClassSessions(): Promise<ClassSession[]> {
    return await db
      .select()
      .from(sessions_class)
      .orderBy(desc(sessions_class.createdAt));
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

// Create appropriate storage instance based on database availability
async function createStorage() {
  try {
    if (db) {
      console.log("✓ Using PostgreSQL database storage");
      return new DbStorage();
    } else {
      console.log("⚠️  Database not available, falling back to in-memory storage");
      return new MemStorage();
    }
  } catch (error) {
    console.error("Error connecting to database, using in-memory storage:", error);
    return new MemStorage();
  }
}

// Initialize storage - will use PostgreSQL if available, otherwise fallback to memory
export const storage = db ? new DbStorage() : new MemStorage();
