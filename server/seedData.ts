import { storage } from "./storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seedDatabase() {
  try {
    console.log("Seeding database with sample data...");

    // Check if database is already seeded
    const existingAdmin = await storage.getUserByEmail("admin@clsu.edu.ph");
    if (existingAdmin) {
      console.log("Database already seeded - skipping seed data");
      return;
    }

    // Create sample users with hashed passwords
    const adminUser = await storage.createUser({
      email: "admin@clsu.edu.ph",
      password: await hashPassword("admin123"),
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      gender: "male",
      facultyId: "ADMIN001",
      department: "Information Technology"
    });

    await storage.createUser({
      email: "faculty@clsu.edu.ph", 
      password: await hashPassword("faculty123"),
      firstName: "Faculty",
      lastName: "Member",
      role: "faculty",
      gender: "female",
      facultyId: "FAC001",
      department: "Information Technology"
    });

    console.log("Created sample users: admin@clsu.edu.ph and faculty@clsu.edu.ph");

    // Create sample classrooms
    const classroom1 = await storage.createClassroom({
      name: "Lab 204",
      location: "CLIRDEC Building",
      capacity: 40,
      type: "laboratory"
    });

    const classroom2 = await storage.createClassroom({
      name: "Room 301", 
      location: "CLIRDEC Building",
      capacity: 35,
      type: "lecture"
    });

    console.log("Created classrooms:", [classroom1.name, classroom2.name]);

    // Create sample subjects (will be associated with authenticated professor)
    const subjects = [
      {
        name: "Database Management Systems",
        code: "IT-301",
        description: "Advanced database concepts and management"
      },
      {
        name: "Programming Logic",
        code: "IT-201", 
        description: "Fundamentals of programming logic and algorithms"
      },
      {
        name: "Data Structures",
        code: "IT-302",
        description: "Advanced data structures and algorithms"
      }
    ];

    // Note: Subjects will be created when a professor logs in and creates them
    // through the UI, as they need to be associated with a specific professorId

    // Students will be enrolled through the enrollment process
    // No demo students - system starts empty for realistic deployment
    console.log("Student enrollment ready - no demo data created");

    // Create sample computers for the lab
    const computers = [
      { name: "PC-001", ipAddress: "192.168.1.101", status: "available", classroomId: classroom1.id },
      { name: "PC-002", ipAddress: "192.168.1.102", status: "available", classroomId: classroom1.id },
      { name: "PC-003", ipAddress: "192.168.1.103", status: "available", classroomId: classroom1.id },
      { name: "PC-004", ipAddress: "192.168.1.104", status: "available", classroomId: classroom1.id },
      { name: "PC-005", ipAddress: "192.168.1.105", status: "available", classroomId: classroom1.id },
      { name: "PC-006", ipAddress: "192.168.1.106", status: "available", classroomId: classroom2.id },
      { name: "PC-007", ipAddress: "192.168.1.107", status: "available", classroomId: classroom2.id },
      { name: "PC-008", ipAddress: "192.168.1.108", status: "available", classroomId: classroom2.id }
    ];

    for (const computerData of computers) {
      await storage.createComputer(computerData);
    }

    console.log(`Created ${computers.length} computers`);

    // No demo class sessions - sessions will be created from schedules
    console.log("Class sessions ready - will be auto-generated from uploaded schedules");

    // Set some system settings
    await storage.setSystemSetting("attendance_grace_period", "15", "Grace period in minutes for late arrivals");
    await storage.setSystemSetting("email_notifications_enabled", "true", "Enable automated email notifications");
    await storage.setSystemSetting("auto_session_end", "true", "Automatically end sessions based on schedule");

    console.log("Database seeding completed successfully!");
    
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}