import { strongPasswordSchema, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import { hashPassword, requireAdmin } from "../auth";
import { db } from "../db";
import { storage } from "../storage";

export function setupUserRoutes(app: Express) {
  // User management routes - Admin only
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response for security
      const safeUsers = users.map((user) => ({
        ...user,
        password: undefined,
      }));
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", requireAdmin, async (req: any, res) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        role,
        facultyId,
        department,
        gender,
      } = req.body;

      // Input validation
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          message: "Email, password, first name, and last name are required",
        });
      }

      // Validate password strength (ISO 27001 compliance)
      const passwordValidation = strongPasswordSchema.safeParse(password);
      if (!passwordValidation.success) {
        return res.status(400).json({
          message: "Password does not meet security requirements",
          errors: passwordValidation.error.errors.map((e) => e.message),
        });
      }

      // Sanitize and validate email
      const trimmedEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Sanitize string inputs and validate lengths
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();

      if (trimmedFirstName.length < 1 || trimmedFirstName.length > 50) {
        return res
          .status(400)
          .json({ message: "First name must be between 1 and 50 characters" });
      }
      if (trimmedLastName.length < 1 || trimmedLastName.length > 50) {
        return res
          .status(400)
          .json({ message: "Last name must be between 1 and 50 characters" });
      }

      const trimmedFacultyId = facultyId?.trim();
      if (
        trimmedFacultyId &&
        (trimmedFacultyId.length < 1 || trimmedFacultyId.length > 20)
      ) {
        return res
          .status(400)
          .json({ message: "Faculty ID must be between 1 and 20 characters" });
      }

      // Validate role
      const validRoles = ["admin", "faculty"];
      if (role && !validRoles.includes(role)) {
        return res
          .status(400)
          .json({ message: "Invalid role. Must be 'admin' or 'faculty'" });
      }

      // Validate gender
      const validGenders = ["male", "female"];
      if (gender && !validGenders.includes(gender)) {
        return res
          .status(400)
          .json({ message: "Invalid gender. Must be 'male' or 'female'" });
      }

      // Validate department if provided
      if (department && (department.length < 1 || department.length > 100)) {
        return res
          .status(400)
          .json({ message: "Department must be between 1 and 100 characters" });
      }

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
          isActive: true,
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
        const duplicateFacultyId = users.find(
          (u) => u.facultyId === trimmedFacultyId && u.isActive
        );
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
        department: department?.trim() || "Information Technology",
      });

      // Remove password from response
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req: any, res) => {
    try {
      const userId = req.params.id;

      // Prevent admin from deleting themselves
      if (userId === req.user.id) {
        return res
          .status(400)
          .json({ message: "Cannot delete your own account" });
      }

      // Soft delete (default)
      await storage.deleteUser(userId);

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(400).json({ message: "Failed to delete user" });
    }
  });

  // Hard delete endpoint - GDPR/Privacy compliance (Right to be Forgotten)
  app.delete(
    "/api/users/:id/permanent",
    requireAdmin,
    async (req: any, res) => {
      try {
        const userId = req.params.id;
        const { confirmation } = req.body;

        if (confirmation !== "PERMANENTLY_DELETE") {
          return res.status(400).json({
            message:
              "Confirmation required. Send {confirmation: 'PERMANENTLY_DELETE'}",
          });
        }

        // Prevent admin from permanently deleting themselves
        if (userId === req.user.id) {
          return res
            .status(400)
            .json({ message: "Cannot permanently delete your own account" });
        }

        // Permanently delete from database
        if (!db) throw new Error("Database not available");

        await db.delete(users).where(eq(users.id, userId));

        res.status(204).send();
      } catch (error) {
        console.error("Error permanently deleting user:", error);
        res.status(400).json({ message: "Failed to permanently delete user" });
      }
    }
  );
}
