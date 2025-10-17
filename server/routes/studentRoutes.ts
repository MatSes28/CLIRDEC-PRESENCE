import {
  insertStudentSchema,
  students,
  updateStudentSchema,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { requireAdmin, requireAdminOrFaculty } from "../auth";
import { db } from "../db";
import { storage } from "../storage";

export function setupStudentRoutes(app: Express) {
  // Student management routes - Admin only for user management
  app.get("/api/students", requireAdminOrFaculty, async (req: any, res) => {
    try {
      const currentUser = req.user;

      if (currentUser.role === "admin") {
        // Admin sees all students
        const students = await storage.getStudents();
        res.json(students);
      } else {
        // Faculty only sees students enrolled in their subjects
        const professorId = currentUser.id;
        const subjects = await storage.getSubjectsByProfessor(professorId);
        const subjectIds = subjects.map((s) => s.id);

        // Get all students enrolled in these subjects
        const studentSet = new Set<number>();
        for (const subjectId of subjectIds) {
          const enrollments = await storage.getEnrollmentsBySubject(subjectId);
          enrollments.forEach((e) => studentSet.add(e.studentId));
        }

        // Fetch full student details
        const allStudents = await storage.getStudents();
        const filteredStudents = allStudents.filter((s) =>
          studentSet.has(s.id)
        );
        res.json(filteredStudents);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.post("/api/students", requireAdmin, async (req, res) => {
    try {
      // Validate with Zod schema
      const validationResult = insertStudentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationResult.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }

      const studentData = validationResult.data;

      // Trim string inputs
      if (studentData.studentId)
        studentData.studentId = studentData.studentId.trim();
      if (studentData.firstName)
        studentData.firstName = studentData.firstName.trim();
      if (studentData.lastName)
        studentData.lastName = studentData.lastName.trim();
      if (studentData.email)
        studentData.email = studentData.email.trim().toLowerCase();
      if (studentData.section) studentData.section = studentData.section.trim();
      if (studentData.rfidCardId)
        studentData.rfidCardId = studentData.rfidCardId.trim();
      if (studentData.parentEmail)
        studentData.parentEmail = studentData.parentEmail.trim().toLowerCase();
      if (studentData.parentName)
        studentData.parentName = studentData.parentName.trim();

      // Check for duplicate student ID
      const allStudents = await storage.getStudents();
      const duplicateStudentId = allStudents.find(
        (s) => s.studentId === studentData.studentId && s.isActive
      );
      if (duplicateStudentId) {
        return res.status(400).json({ message: "Student ID already exists" });
      }

      // Check for duplicate RFID card if provided
      if (studentData.rfidCardId) {
        const duplicateRfid = allStudents.find(
          (s) => s.rfidCardId === studentData.rfidCardId && s.isActive
        );
        if (duplicateRfid) {
          return res.status(400).json({
            message: "RFID card is already assigned to another student",
          });
        }
      }

      const student = await storage.createStudent(studentData);
      res.status(201).json(student);
    } catch (error) {
      console.error("Error creating student:", error);
      res.status(400).json({ message: "Failed to create student" });
    }
  });

  app.put("/api/students/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Validate with Zod schema
      const validationResult = updateStudentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationResult.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }

      const updateData = validationResult.data;

      // Get existing student
      const existingStudent = await storage.getStudent(id);
      if (!existingStudent) {
        return res.status(404).json({ message: "Student not found" });
      }

      // Trim string inputs
      if (updateData.studentId)
        updateData.studentId = updateData.studentId.trim();
      if (updateData.firstName)
        updateData.firstName = updateData.firstName.trim();
      if (updateData.lastName) updateData.lastName = updateData.lastName.trim();
      if (updateData.email)
        updateData.email = updateData.email.trim().toLowerCase();
      if (updateData.section) updateData.section = updateData.section.trim();
      if (updateData.rfidCardId)
        updateData.rfidCardId = updateData.rfidCardId.trim();
      if (updateData.parentEmail)
        updateData.parentEmail = updateData.parentEmail.trim().toLowerCase();
      if (updateData.parentName)
        updateData.parentName = updateData.parentName.trim();

      const allStudents = await storage.getStudents();

      // Check for duplicate student ID if being changed
      if (
        updateData.studentId &&
        updateData.studentId !== existingStudent.studentId
      ) {
        const duplicateStudentId = allStudents.find(
          (s) =>
            s.studentId === updateData.studentId && s.id !== id && s.isActive
        );
        if (duplicateStudentId) {
          return res.status(400).json({ message: "Student ID already exists" });
        }
      }

      // Check for duplicate RFID card if being changed
      if (
        updateData.rfidCardId &&
        updateData.rfidCardId !== existingStudent.rfidCardId
      ) {
        const duplicateRfid = allStudents.find(
          (s) =>
            s.rfidCardId === updateData.rfidCardId && s.id !== id && s.isActive
        );
        if (duplicateRfid) {
          return res.status(400).json({
            message: "RFID card is already assigned to another student",
          });
        }
      }

      // Build clean update object with only provided fields
      const cleanData: any = {};
      if (updateData.studentId !== undefined)
        cleanData.studentId = updateData.studentId;
      if (updateData.firstName !== undefined)
        cleanData.firstName = updateData.firstName;
      if (updateData.lastName !== undefined)
        cleanData.lastName = updateData.lastName;
      if (updateData.email !== undefined) cleanData.email = updateData.email;
      if (updateData.gender !== undefined) cleanData.gender = updateData.gender;
      if (updateData.year !== undefined) cleanData.year = updateData.year;
      if (updateData.section !== undefined)
        cleanData.section = updateData.section;
      if (updateData.rfidCardId !== undefined)
        cleanData.rfidCardId = updateData.rfidCardId;
      if (updateData.parentEmail !== undefined)
        cleanData.parentEmail = updateData.parentEmail;
      if (updateData.parentName !== undefined)
        cleanData.parentName = updateData.parentName;
      if (updateData.isActive !== undefined)
        cleanData.isActive = updateData.isActive;

      const student = await storage.updateStudent(id, cleanData);
      res.json(student);
    } catch (error) {
      console.error("Error updating student:", error);
      res.status(400).json({ message: "Failed to update student" });
    }
  });

  app.delete("/api/students/:id", requireAdmin, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);

      // Soft delete (default)
      await storage.deleteStudent(id);

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(400).json({ message: "Failed to delete student" });
    }
  });

  // Hard delete student endpoint - GDPR/Privacy compliance
  app.delete(
    "/api/students/:id/permanent",
    requireAdmin,
    async (req: any, res) => {
      try {
        const id = parseInt(req.params.id);
        const { confirmation } = req.body;

        if (confirmation !== "PERMANENTLY_DELETE") {
          return res.status(400).json({
            message:
              "Confirmation required. Send {confirmation: 'PERMANENTLY_DELETE'}",
          });
        }

        // Permanently delete from database
        if (!db) throw new Error("Database not available");

        await db.delete(students).where(eq(students.id, id));

        res.status(204).send();
      } catch (error) {
        console.error("Error permanently deleting student:", error);
        res
          .status(400)
          .json({ message: "Failed to permanently delete student" });
      }
    }
  );
}
