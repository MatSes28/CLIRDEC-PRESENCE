import { auditLogs, dataRetentionPolicies } from "@shared/schema";
import { desc, eq, lt } from "drizzle-orm";
import { db } from "../db";

export class AuditRetentionService {
  /**
   * Initialize default retention policies for audit logs
   */
  static async initializeDefaultPolicies() {
    try {
      // Check if policies already exist
      const existingPolicies = await db.select().from(dataRetentionPolicies);
      if (existingPolicies.length > 0) {
        console.log("✅ Audit retention policies already initialized");
        return;
      }

      // Create default retention policies
      const defaultPolicies = [
        {
          entityType: "audit_logs",
          retentionPeriodMonths: 24, // 2 years for audit logs (ISO 27001 compliance)
          autoDelete: true,
          description: "Security audit logs retention for compliance",
        },
        {
          entityType: "login_attempts",
          retentionPeriodMonths: 12, // 1 year for login attempts
          autoDelete: true,
          description: "Login attempt logs for security monitoring",
        },
        {
          entityType: "email_notifications",
          retentionPeriodMonths: 6, // 6 months for email logs
          autoDelete: true,
          description: "Email notification history",
        },
        {
          entityType: "attendance",
          retentionPeriodMonths: 36, // 3 years for attendance records
          autoDelete: false, // Manual review required
          description: "Student attendance records (academic records)",
        },
        {
          entityType: "consent_logs",
          retentionPeriodMonths: 60, // 5 years for consent logs (GDPR)
          autoDelete: false,
          description: "Privacy consent and data processing logs",
        },
      ];

      for (const policy of defaultPolicies) {
        await db.insert(dataRetentionPolicies).values(policy);
      }

      console.log("✅ Initialized default audit retention policies");
    } catch (error) {
      console.error("❌ Failed to initialize audit retention policies:", error);
    }
  }

  /**
   * Clean up old audit logs based on retention policies
   */
  static async cleanupAuditLogs() {
    try {
      const auditPolicy = await db
        .select()
        .from(dataRetentionPolicies)
        .where(eq(dataRetentionPolicies.entityType, "audit_logs"))
        .limit(1);

      if (
        !auditPolicy ||
        auditPolicy.length === 0 ||
        !auditPolicy[0].autoDelete
      ) {
        console.log("ℹ️ Audit log auto-deletion disabled or policy not found");
        return { deleted: 0, message: "Auto-deletion disabled" };
      }

      const retentionMonths = auditPolicy[0].retentionPeriodMonths;
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

      console.log(
        `🧹 Cleaning up audit logs older than ${retentionMonths} months (${cutoffDate.toISOString()})`
      );

      const result = await db
        .delete(auditLogs)
        .where(lt(auditLogs.timestamp, cutoffDate));

      const deletedCount = result.rowCount || 0;

      // Update last cleanup timestamp
      await db
        .update(dataRetentionPolicies)
        .set({
          lastCleanupAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dataRetentionPolicies.entityType, "audit_logs"));

      console.log(`✅ Cleaned up ${deletedCount} old audit log entries`);
      return {
        deleted: deletedCount,
        cutoffDate: cutoffDate.toISOString(),
        message: `Cleaned up ${deletedCount} audit log entries older than ${retentionMonths} months`,
      };
    } catch (error) {
      console.error("❌ Failed to cleanup audit logs:", error);
      return {
        deleted: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clean up old login attempts
   */
  static async cleanupLoginAttempts() {
    try {
      const loginPolicy = await db
        .select()
        .from(dataRetentionPolicies)
        .where(eq(dataRetentionPolicies.entityType, "login_attempts"))
        .limit(1);

      if (
        !loginPolicy ||
        loginPolicy.length === 0 ||
        !loginPolicy[0].autoDelete
      ) {
        return { deleted: 0, message: "Auto-deletion disabled" };
      }

      const retentionMonths = loginPolicy[0].retentionPeriodMonths;
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

      const { loginAttempts } = await import("@shared/schema");
      const result = await db
        .delete(loginAttempts)
        .where(lt(loginAttempts.timestamp, cutoffDate));

      const deletedCount = result.rowCount || 0;
      console.log(`✅ Cleaned up ${deletedCount} old login attempt entries`);

      return {
        deleted: deletedCount,
        cutoffDate: cutoffDate.toISOString(),
        message: `Cleaned up ${deletedCount} login attempt entries`,
      };
    } catch (error) {
      console.error("❌ Failed to cleanup login attempts:", error);
      return {
        deleted: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get audit log statistics for reporting
   */
  static async getAuditStats() {
    try {
      const totalLogs = await db.$count(auditLogs);

      // Get logs by action type
      const actionStats = await db
        .select({
          action: auditLogs.action,
          count: db.$count(auditLogs.id),
        })
        .from(auditLogs)
        .groupBy(auditLogs.action);

      // Get recent activity (last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const recentActivity = await db
        .select()
        .from(auditLogs)
        .where(lt(auditLogs.timestamp, yesterday))
        .orderBy(desc(auditLogs.timestamp))
        .limit(10);

      return {
        totalLogs,
        actionStats,
        recentActivity,
        lastCleanup: await this.getLastCleanupDate(),
      };
    } catch (error) {
      console.error("❌ Failed to get audit statistics:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the last cleanup date for audit logs
   */
  private static async getLastCleanupDate() {
    try {
      const policy = await db
        .select({ lastCleanupAt: dataRetentionPolicies.lastCleanupAt })
        .from(dataRetentionPolicies)
        .where(eq(dataRetentionPolicies.entityType, "audit_logs"))
        .limit(1);

      return policy.length > 0 ? policy[0].lastCleanupAt : null;
    } catch (error) {
      console.error("❌ Failed to get last cleanup date:", error);
      return null;
    }
  }

  /**
   * Run full cleanup process for all retention policies
   */
  static async runFullCleanup() {
    console.log("🧹 Starting full audit retention cleanup...");

    const results = {
      auditLogs: await this.cleanupAuditLogs(),
      loginAttempts: await this.cleanupLoginAttempts(),
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Full audit retention cleanup completed");
    return results;
  }

  /**
   * Schedule periodic cleanup (to be called by cron job or interval)
   */
  static startPeriodicCleanup(intervalHours: number = 24) {
    console.log(`⏰ Scheduling audit cleanup every ${intervalHours} hours`);

    setInterval(async () => {
      try {
        await this.runFullCleanup();
      } catch (error) {
        console.error("❌ Periodic audit cleanup failed:", error);
      }
    }, intervalHours * 60 * 60 * 1000);
  }
}
