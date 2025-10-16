import { db } from "../db";
import { 
  dataRetentionPolicies, 
  attendance, 
  auditLogs, 
  emailNotifications,
  loginAttempts,
  type InsertDataRetentionPolicy 
} from "@shared/schema";
import { eq, lt, sql } from "drizzle-orm";

export class DataRetentionService {
  async createPolicy(data: InsertDataRetentionPolicy) {
    if (!db) throw new Error("Database not available");
    
    const [policy] = await db.insert(dataRetentionPolicies).values(data).returning();
    return policy;
  }

  async getPolicies() {
    if (!db) throw new Error("Database not available");
    
    const policies = await db.select().from(dataRetentionPolicies);
    return policies;
  }

  async updatePolicy(id: number, data: Partial<InsertDataRetentionPolicy>) {
    if (!db) throw new Error("Database not available");
    
    const [policy] = await db
      .update(dataRetentionPolicies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(dataRetentionPolicies.id, id))
      .returning();
    
    return policy;
  }

  async deletePolicy(id: number) {
    if (!db) throw new Error("Database not available");
    
    await db.delete(dataRetentionPolicies).where(eq(dataRetentionPolicies.id, id));
  }

  async cleanupOldData() {
    if (!db) throw new Error("Database not available");
    
    const policies = await this.getPolicies();
    const results = [];

    for (const policy of policies) {
      if (!policy.autoDelete) continue;

      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - policy.retentionPeriodMonths);

      let deletedCount = 0;

      switch (policy.entityType) {
        case "attendance":
          const attendanceResult = await db
            .delete(attendance)
            .where(lt(attendance.checkInTime, cutoffDate));
          deletedCount = attendanceResult.rowCount || 0;
          break;

        case "audit_logs":
          const auditResult = await db
            .delete(auditLogs)
            .where(lt(auditLogs.timestamp, cutoffDate));
          deletedCount = auditResult.rowCount || 0;
          break;

        case "email_notifications":
          const emailResult = await db
            .delete(emailNotifications)
            .where(lt(emailNotifications.createdAt, cutoffDate));
          deletedCount = emailResult.rowCount || 0;
          break;

        case "login_attempts":
          const loginResult = await db
            .delete(loginAttempts)
            .where(lt(loginAttempts.timestamp, cutoffDate));
          deletedCount = loginResult.rowCount || 0;
          break;

        default:
          console.warn(`Unknown entity type for cleanup: ${policy.entityType}`);
          continue;
      }

      // Update last cleanup timestamp
      await db
        .update(dataRetentionPolicies)
        .set({ lastCleanupAt: new Date() })
        .where(eq(dataRetentionPolicies.id, policy.id));

      results.push({
        entityType: policy.entityType,
        deletedCount,
        cutoffDate,
      });
    }

    return results;
  }

  async initializeDefaultPolicies() {
    if (!db) throw new Error("Database not available");
    
    const existingPolicies = await this.getPolicies();
    
    if (existingPolicies.length > 0) {
      return existingPolicies;
    }

    const defaultPolicies: InsertDataRetentionPolicy[] = [
      {
        entityType: "attendance",
        retentionPeriodMonths: 60, // 5 years
        autoDelete: false,
        description: "Attendance records retention - Philippine academic records law requires 5 years",
      },
      {
        entityType: "audit_logs",
        retentionPeriodMonths: 24, // 2 years
        autoDelete: true,
        description: "Audit logs retention - ISO 27001 requirement",
      },
      {
        entityType: "email_notifications",
        retentionPeriodMonths: 12, // 1 year
        autoDelete: true,
        description: "Email notification history - operational convenience",
      },
      {
        entityType: "login_attempts",
        retentionPeriodMonths: 6, // 6 months
        autoDelete: true,
        description: "Login attempts - security monitoring",
      },
    ];

    const createdPolicies = [];
    for (const policy of defaultPolicies) {
      const created = await this.createPolicy(policy);
      createdPolicies.push(created);
    }

    return createdPolicies;
  }
}

export const dataRetentionService = new DataRetentionService();
