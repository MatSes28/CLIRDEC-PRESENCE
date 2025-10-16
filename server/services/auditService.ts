import { db } from "../db";
import { auditLogs, loginAttempts } from "@shared/schema";
import type { InsertAuditLog, InsertLoginAttempt } from "@shared/schema";
import { sql } from "drizzle-orm";

class AuditService {
  /**
   * Log any action performed in the system (ISO 27001 compliance)
   */
  async logAction(data: InsertAuditLog): Promise<void> {
    try {
      if (!db) {
        console.warn("Database not available for audit logging");
        return;
      }
      
      await db.insert(auditLogs).values({
        ...data,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Don't throw - logging failures shouldn't break the app
    }
  }

  /**
   * Log login attempt (for rate limiting and security monitoring)
   */
  async logLoginAttempt(data: InsertLoginAttempt): Promise<void> {
    try {
      if (!db) {
        console.warn("Database not available for login attempt logging");
        return;
      }

      await db.insert(loginAttempts).values({
        ...data,
        timestamp: new Date()
      });

      // Clean up old login attempts (keep last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await db.delete(loginAttempts).where(
        sql`timestamp < ${thirtyDaysAgo}`
      );
    } catch (error) {
      console.error("Failed to log login attempt:", error);
    }
  }

  /**
   * Check if IP address has exceeded login attempt limit
   * Returns true if rate limit exceeded
   */
  async checkRateLimit(email: string, ipAddress: string): Promise<boolean> {
    try {
      if (!db) return false;

      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      // Count failed attempts in last 5 minutes from this IP for this email
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(loginAttempts)
        .where(
          sql`email = ${email} AND ip_address = ${ipAddress} AND success = false AND timestamp > ${fiveMinutesAgo}`
        );

      const failedAttempts = Number(result[0]?.count || 0);

      // ISO 27001: Maximum 5 failed attempts in 5 minutes
      return failedAttempts >= 5;
    } catch (error) {
      console.error("Failed to check rate limit:", error);
      return false; // Allow login on error (fail open)
    }
  }

  /**
   * Get audit trail for a specific entity
   */
  async getAuditTrail(entityType: string, entityId: string) {
    try {
      if (!db) return [];

      return await db
        .select()
        .from(auditLogs)
        .where(
          sql`entity_type = ${entityType} AND entity_id = ${entityId}`
        )
        .orderBy(sql`timestamp DESC`)
        .limit(100);
    } catch (error) {
      console.error("Failed to get audit trail:", error);
      return [];
    }
  }

  /**
   * Get recent audit logs (for compliance dashboard)
   */
  async getRecentLogs(limit: number = 100) {
    try {
      if (!db) return [];

      return await db
        .select()
        .from(auditLogs)
        .orderBy(sql`timestamp DESC`)
        .limit(limit);
    } catch (error) {
      console.error("Failed to get recent logs:", error);
      return [];
    }
  }
}

export const auditService = new AuditService();
