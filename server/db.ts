import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Build DATABASE_URL from individual components if not provided
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  
  if (PGHOST && PGPORT && PGUSER && PGPASSWORD && PGDATABASE) {
    databaseUrl = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
    console.log("Built DATABASE_URL from environment variables");
  } else {
    console.warn("DATABASE_URL not set and unable to build from components. Using in-memory storage.");
    // We'll handle this gracefully by using MemStorage
  }
}

export const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
export const db = pool ? drizzle(pool, { schema }) : null;