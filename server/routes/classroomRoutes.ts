import { insertClassroomSchema, updateClassroomSchema } from "@shared/schema";
import type { Express } from "express";
import { requireAdmin, requireAdminOrFaculty } from "../auth";
import { storage } from "../storage";

export function setupClassroomRoutes(app: Express) {
  // Classroom management routes - Admin only for classroom management
  app.get("/api/classrooms", requireAdminOrFaculty, async (req, res) => {
    try {
      const classrooms = await storage.getClassrooms();
      res.json(classrooms);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      res.status(500).json({ message: "Failed to fetch classrooms" });
    }
  });

  app.post("/api/classrooms", requireAdmin, async (req, res) => {
    try {
      const validationResult = insertClassroomSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: validationResult.error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
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

  app.put("/api/classrooms/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const validationResult = updateClassroomSchema.safeParse(req.body);
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
}