import { insertSubjectSchema } from "@shared/schema";
import type { Express } from "express";
import { requireAdminOrFaculty } from "../auth";
import { storage } from "../storage";

export function setupSubjectRoutes(app: Express) {
  // Subject management routes
  app.get("/api/subjects", requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      const subjects = await storage.getSubjectsByProfessor(professorId);
      res.json(subjects);
    } catch (error) {
      console.error("Error fetching subjects:", error);
      res.status(500).json({ message: "Failed to fetch subjects" });
    }
  });

  app.post("/api/subjects", requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      const subjectData = insertSubjectSchema.parse({ ...req.body, professorId });
      const subject = await storage.createSubject(subjectData);
      res.status(201).json(subject);
    } catch (error) {
      console.error("Error creating subject:", error);
      res.status(400).json({ message: "Failed to create subject" });
    }
  });

  app.put("/api/subjects/:id", requireAdminOrFaculty, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const professorId = req.user.id;
      const subjectData = insertSubjectSchema.partial().parse({ ...req.body, professorId });
      const subject = await storage.updateSubject(id, subjectData);
      res.json(subject);
    } catch (error) {
      console.error("Error updating subject:", error);
      res.status(400).json({ message: "Failed to update subject" });
    }
  });

  app.delete("/api/subjects/:id", requireAdminOrFaculty, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSubject(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(400).json({ message: "Failed to delete subject" });
    }
  });
}