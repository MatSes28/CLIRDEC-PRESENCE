import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Get DATABASE_URL from environment
let databaseUrl = process.env.DATABASE_URL;

// Configure pool with SSL for Neon database
let pool: Pool | null = null;

if (databaseUrl) {
  try {
    // Neon requires SSL connections
    pool = new Pool({ 
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require') ? {
        rejectUnauthorized: false
      } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    console.log('✅ Database pool created successfully');
  } catch (error) {
    console.error('❌ Error creating database pool:', error);
    pool = null;
  }
} else {
  // Try to build DATABASE_URL from individual components
  const { PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE } = process.env;
  
  if (PGHOST && PGPORT && PGUSER && PGPASSWORD && PGDATABASE) {
    databaseUrl = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
    console.log("Built DATABASE_URL from environment variables");
    
    try {
      pool = new Pool({ 
        connectionString: databaseUrl,
        ssl: {
          rejectUnauthorized: false
        }
      });
    } catch (error) {
      console.error('❌ Error creating database pool:', error);
      pool = null;
    }
  } else {
    console.warn("⚠️  DATABASE_URL not set and unable to build from components. Using in-memory storage.");
  }
}

export { pool };
export const db = pool ? drizzle(pool, { schema }) : null;

// Test connection on initialization
if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
  });
  
  // Test the connection
  pool.query('SELECT NOW()')
    .then(() => console.log('✅ Database connection test successful'))
    .catch((err) => console.error('❌ Database connection test failed:', err.message));
}
