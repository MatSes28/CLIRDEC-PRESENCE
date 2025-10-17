import { exec } from "child_process";
import { promisify } from "util";
import { pool } from "./db";

const execAsync = promisify(exec);

export async function initializeDatabase(): Promise<void> {
  console.log("🔧 Initializing database...");

  // Check if database is available
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set, skipping database initialization");
    return;
  }

  try {
    // Test database connection
    if (pool) {
      const client = await pool.connect();
      console.log("✅ Database connection successful");
      client.release();

      // Check if tables exist
      const tablesExist = await checkTablesExist();

      if (!tablesExist) {
        console.log("📋 Creating database tables...");
        await execAsync("npm run db:push -- --force");
        console.log("✅ Database tables created successfully");
      } else {
        console.log("✅ Database tables already exist");
      }
    }
  } catch (error: any) {
    console.error("❌ Database initialization error:", error.message);
    // In production, don't try to push schema - let Railway handle it
    if (process.env.NODE_ENV !== "production") {
      // Try to push schema anyway in development
      try {
        console.log("🔄 Attempting to create/update database schema...");
        await execAsync("npm run db:push -- --force");
        console.log("✅ Database schema updated successfully");
      } catch (pushError: any) {
        console.error("❌ Failed to push database schema:", pushError.message);
        console.log("⚠️  Application will continue with in-memory storage");
      }
    } else {
      console.log("⚠️  Production environment - skipping schema push");
    }
  }
}

async function checkTablesExist(): Promise<boolean> {
  if (!pool) return false;

  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    client.release();
    return result.rows[0]?.exists || false;
  } catch (error) {
    return false;
  }
}
