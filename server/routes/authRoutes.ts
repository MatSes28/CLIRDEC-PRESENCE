import { passwordResetTokens, users } from "@shared/schema";
import { and, eq } from "drizzle-orm";
import type { Express } from "express";
import { db } from "../db";
import { storage } from "../storage";

export function setupAuthRoutes(app: Express) {
  // Forgot password route - generates secure token and sends reset link to user (ISO 27001 compliant)
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      console.log(`[FORGOT_PASSWORD] Processing request for email: ${email}`);

      // Check if user exists (but don't reveal this in response for security)
      const user = await storage.getUserByEmail(email);
      console.log(`[FORGOT_PASSWORD] User found: ${user ? "yes" : "no"}`);

      if (user) {
        // Generate cryptographically secure random token with high entropy
        const crypto = await import("crypto");
        const resetToken = crypto.randomBytes(64).toString("base64url"); // 64 bytes = 512 bits of entropy
        console.log(`[FORGOT_PASSWORD] Generated reset token`);

        // Token expires in 1 hour
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        // Store token in database
        if (!db) {
          console.error("[FORGOT_PASSWORD] Database not available");
          throw new Error("Database not available");
        }

        console.log(`[FORGOT_PASSWORD] Inserting token into database`);
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token: resetToken,
          expiresAt,
          used: false,
        });
        console.log(`[FORGOT_PASSWORD] Token inserted successfully`);

        // Get reset link - works for both Replit and Railway
        let FRONTEND_URL = "http://localhost:5000"; // default

        if (process.env.REPLIT_DOMAINS) {
          // Replit environment
          FRONTEND_URL = `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`;
        } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
          // Railway environment
          FRONTEND_URL = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
        } else if (req.headers.host) {
          // Fallback: use the host from the request
          const protocol =
            req.secure || req.headers["x-forwarded-proto"] === "https"
              ? "https"
              : "http";
          FRONTEND_URL = `${protocol}://${req.headers.host}`;
        }

        console.log(`[FORGOT_PASSWORD] Using FRONTEND_URL: ${FRONTEND_URL}`);
        const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

        const FROM_EMAIL = process.env.FROM_EMAIL || "matt.feria@clsu2.edu.ph";

        const resetEmailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2596be; color: white; padding: 20px; text-align: center;">
              <h1>CLIRDEC: PRESENCE</h1>
              <p>Password Reset Request</p>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #2596be;">Reset Your Password</h2>
              <p>Hello ${user.firstName},</p>
              <p>We received a request to reset your password for your CLIRDEC: PRESENCE account.</p>
              <div style="background-color: white; padding: 20px; text-align: center; margin: 20px 0;">
                <a href="${resetLink}" style="background-color: #2596be; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="background-color: #f0f0f0; padding: 10px; word-break: break-all; font-family: monospace; font-size: 12px;">${resetLink}</p>
              <p><strong>⏰ This link will expire in 1 hour for security reasons.</strong></p>
              <p>If you didn't request this password reset, please ignore this email or contact IT support if you're concerned about your account security.</p>
              <p>Best regards,<br>CLIRDEC: PRESENCE System<br>Department of Information Technology<br>Central Luzon State University</p>
            </div>
          </div>
        `;

        const resetEmailText = `
CLIRDEC: PRESENCE - Password Reset

Hello ${user.firstName},

We received a request to reset your password for your CLIRDEC: PRESENCE account.

To reset your password, click the link below or copy it into your browser:
${resetLink}

⏰ This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email or contact IT support if you're concerned about your account security.

Best regards,
CLIRDEC: PRESENCE System
Department of Information Technology
Central Luzon State University
        `;

        // Send email to user
        const { sendEmail } = await import("../services/emailService");
        try {
          await sendEmail({
            to: email,
            from: FROM_EMAIL,
            subject: "Reset Your Password - CLIRDEC: PRESENCE",
            html: resetEmailHtml,
            text: resetEmailText,
          });
          console.log(`Password reset email sent to ${email}`);
        } catch (emailError) {
          console.error("Failed to send password reset email:", emailError);
          // Don't reveal the error to the user
        }
      }

      // Always return success for security (don't reveal if email exists)
      res.json({
        success: true,
        message:
          "If an account exists with this email, you will receive password reset instructions shortly.",
      });
    } catch (error) {
      console.error(
        "[FORGOT_PASSWORD] Error processing forgot password request:",
        error
      );
      console.error(
        "[FORGOT_PASSWORD] Error stack:",
        error instanceof Error ? error.stack : "No stack trace"
      );
      res
        .status(500)
        .json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password route - validates token and updates password
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res
          .status(400)
          .json({ message: "Token and new password are required" });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res
          .status(400)
          .json({ message: "Password must be at least 8 characters long" });
      }

      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
      if (!passwordRegex.test(newPassword)) {
        return res.status(400).json({
          message:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
        });
      }

      if (!db) throw new Error("Database not available");

      // Find token in database
      const tokenRecord = await db
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            eq(passwordResetTokens.used, false)
          )
        )
        .limit(1);

      if (!tokenRecord || tokenRecord.length === 0) {
        return res
          .status(400)
          .json({ message: "Invalid or expired reset token" });
      }

      const resetToken = tokenRecord[0];

      // Check if token has expired
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({
          message: "Reset token has expired. Please request a new one.",
        });
      }

      // Hash new password
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user's password
      await db
        .update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, resetToken.id));

      console.log(`Password successfully reset for user ${resetToken.userId}`);

      res.json({
        success: true,
        message:
          "Password has been reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res
        .status(500)
        .json({ message: "Failed to reset password. Please try again." });
    }
  });
}
