import { storage } from "./storage";

export async function seedDatabase() {
  try {
    console.log("Seeding database with sample data...");

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

    // Create sample students
    const students = [
      {
        studentId: "2021-IT-001",
        firstName: "Maria",
        lastName: "Santos",
        year: 3,
        email: "maria.santos@student.clsu.edu.ph",
        parentEmail: "parent.santos@gmail.com",
        rfidCardId: "RFID001",
        section: "3IT-A"
      },
      {
        studentId: "2021-IT-002", 
        firstName: "Juan",
        lastName: "Dela Cruz",
        year: 3,
        email: "juan.delacruz@student.clsu.edu.ph",
        parentEmail: "parent.delacruz@gmail.com",
        rfidCardId: "RFID002",
        section: "3IT-A"
      },
      {
        studentId: "2021-IT-003",
        firstName: "Anna",
        lastName: "Rodriguez", 
        year: 3,
        email: "anna.rodriguez@student.clsu.edu.ph",
        parentEmail: "parent.rodriguez@gmail.com",
        rfidCardId: "RFID003",
        section: "3IT-A"
      },
      {
        studentId: "2021-IT-004",
        firstName: "Carlos",
        lastName: "Mendez",
        year: 3,
        email: "carlos.mendez@student.clsu.edu.ph", 
        parentEmail: "parent.mendez@gmail.com",
        rfidCardId: "RFID004",
        section: "3IT-A"
      },
      {
        studentId: "2021-IT-005",
        firstName: "Lisa",
        lastName: "Garcia",
        year: 3,
        email: "lisa.garcia@student.clsu.edu.ph",
        parentEmail: "parent.garcia@gmail.com", 
        rfidCardId: "RFID005",
        section: "3IT-B"
      }
    ];

    for (const studentData of students) {
      await storage.createStudent(studentData);
    }

    console.log(`Created ${students.length} sample students`);

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