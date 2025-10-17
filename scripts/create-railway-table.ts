import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

// Script to create password_reset_tokens table in Railway production database
async function createPasswordResetTable() {
  console.log('🚀 Creating password_reset_tokens table in Railway database...\n');

  // Get Railway database URL from environment or prompt
  const railwayDbUrl = process.env.RAILWAY_DATABASE_URL;
  
  if (!railwayDbUrl) {
    console.error('❌ Error: RAILWAY_DATABASE_URL environment variable not set');
    console.log('\nPlease set it with your Railway database URL:');
    console.log('export RAILWAY_DATABASE_URL="postgresql://..."');
    console.log('\nYou can find this in Railway Dashboard → PostgreSQL → Connect → Connection URL');
    process.exit(1);
  }

  try {
    // Connect to Railway database
    const connection = postgres(railwayDbUrl);
    const db = drizzle(connection);

    console.log('✅ Connected to Railway database\n');

    // Create the table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Created password_reset_tokens table\n');

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token 
      ON password_reset_tokens(token);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id 
      ON password_reset_tokens(user_id);
    `);

    console.log('✅ Created indexes\n');

    // Verify table was created
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'password_reset_tokens'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Table structure:');
    console.table(result);

    console.log('\n🎉 Success! Password reset table is ready in Railway!\n');

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('❌ Error creating table:', error);
    process.exit(1);
  }
}

createPasswordResetTable();
