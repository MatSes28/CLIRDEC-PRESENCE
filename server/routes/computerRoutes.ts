import { insertComputerSchema } from "@shared/schema";
import type { Express } from "express";
import { requireAdminOrFaculty } from "../auth";
import { storage } from "../storage";

export function setupComputerRoutes(app: Express) {
  // Computer management routes
  app.get("/api/computers", requireAdminOrFaculty, async (req: any, res) => {
    try {
      const { classroomId } = req.query;
      const currentUser = req.user;

      let computers;
      if (classroomId) {
        computers = await storage.getComputersByClassroom(parseInt(classroomId));
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

  app.post("/api/computers", requireAdminOrFaculty, async (req: any, res) => {
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

  app.put("/api/computers/:id", requireAdminOrFaculty, async (req, res) => {
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

  app.delete("/api/computers/:id", requireAdminOrFaculty, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteComputer(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting computer:", error);
      res.status(400).json({ message: "Failed to delete computer" });
    }
  });

  app.put("/api/computers/:id/assign", requireAdminOrFaculty, async (req, res) => {
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

  app.put("/api/computers/:id/release", requireAdminOrFaculty, async (req, res) => {
    try {
      const computerId = parseInt(req.params.id);
      const computer = await storage.releaseComputer(computerId);
      res.json(computer);
    } catch (error) {
      console.error("Error releasing computer:", error);
      res.status(400).json({ message: "Failed to release computer" });
    }
  });
}