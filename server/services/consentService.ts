import { db } from "../db";
import { consentLogs, type InsertConsentLog } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export class ConsentService {
  async logConsent(data: InsertConsentLog) {
    if (!db) throw new Error("Database not available");
    
    const [consent] = await db.insert(consentLogs).values(data).returning();
    return consent;
  }

  async getLatestConsent(userEmail: string, consentType: string) {
    if (!db) throw new Error("Database not available");
    
    const [consent] = await db
      .select()
      .from(consentLogs)
      .where(
        and(
          eq(consentLogs.userEmail, userEmail),
          eq(consentLogs.consentType, consentType)
        )
      )
      .orderBy(desc(consentLogs.consentedAt))
      .limit(1);
    
    return consent;
  }

  async getUserConsents(userEmail: string) {
    if (!db) throw new Error("Database not available");
    
    const consents = await db
      .select()
      .from(consentLogs)
      .where(eq(consentLogs.userEmail, userEmail))
      .orderBy(desc(consentLogs.consentedAt));
    
    return consents;
  }

  async hasActiveConsent(userEmail: string, consentType: string): Promise<boolean> {
    const consent = await this.getLatestConsent(userEmail, consentType);
    return consent?.consentGiven ?? false;
  }

  async withdrawConsent(userEmail: string, consentType: string, ipAddress?: string, userAgent?: string) {
    const data: InsertConsentLog = {
      userType: "parent", // Default to parent, can be overridden
      userEmail,
      consentType,
      consentGiven: false,
      ipAddress,
      userAgent,
    };

    return this.logConsent(data);
  }
}

export const consentService = new ConsentService();
