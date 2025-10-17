import { insertScheduleSchema } from "@shared/schema";
import type { Express } from "express";
import { requireAdminOrFaculty } from "../auth";
import { storage } from "../storage";

export function setupScheduleRoutes(app: Express) {
  // Schedule management routes
  app.get("/api/schedules", requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      const schedules = await storage.getSchedulesByProfessor(professorId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post("/api/schedules", requireAdminOrFaculty, async (req: any, res) => {
    try {
      const professorId = req.user.id;
      let scheduleData = { ...req.body, professorId };

      // Handle subjectName to subjectId conversion
      if (scheduleData.subjectName && !scheduleData.subjectId) {
        // Create or find subject with the provided name
        const existingSubject = await storage.getSubjectByName(scheduleData.subjectName);
        let subjectId;

        if (existingSubject) {
          subjectId = existingSubject.id;
        } else {
          // Create new subject
          const newSubject = await storage.createSubject({
            name: scheduleData.subjectName,
            code: scheduleData.subjectName.toUpperCase().replace(/\s+/g, '_'),
            professorId: professorId,
            description: `Subject created from schedule: ${scheduleData.subjectName}`
          });
          subjectId = newSubject.id;
        }

        // Replace subjectName with subjectId
        scheduleData.subjectId = subjectId;
        delete scheduleData.subjectName;
      }

      const validatedData = insertScheduleSchema.parse(scheduleData);
      const schedule = await storage.createSchedule(validatedData);

      // Auto-populate sessions for the entire semester
      if (scheduleData.autoPopulate !== false) {
        const { populateScheduleSessions } = await import('../services/scheduleService');
        const populateResult = await populateScheduleSessions(schedule.id);
        console.log(`📅 Auto-populated ${populateResult.sessionsCreated} sessions for schedule ${schedule.id}`);
      }

      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(400).json({ message: "Failed to create schedule" });
    }
  });

  app.put("/api/schedules/:id", requireAdminOrFaculty, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const professorId = req.user.id;
      const scheduleData = insertScheduleSchema.partial().parse({ ...req.body, professorId });
      const schedule = await storage.updateSchedule(id, scheduleData);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(400).json({ message: "Failed to update schedule" });
    }
  });

  app.delete("/api/schedules/:id", requireAdminOrFaculty, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSchedule(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(400).json({ message: "Failed to delete schedule" });
    }
  });
}