# Create Password Reset Table in Railway (2 Steps)

## Step 1: Get Your Railway Database URL

1. Go to your Railway dashboard: https://railway.app
2. Open your CLIRDEC project
3. Click on your **PostgreSQL** database (not your web service)
4. Click on the **"Connect"** tab
5. Look for **"Postgres Connection URL"** 
6. Click the copy icon to copy the full URL
   - It looks like: `postgresql://postgres:password@containers-us-west-xxx.railway.app:7432/railway`

## Step 2: Run the Migration Script

Back here in Replit, run these commands:

```bash
# Set the Railway database URL (paste the URL you copied)
export RAILWAY_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@containers-us-west-xxx.railway.app:7432/railway"

# Run the migration script
npx tsx scripts/create-railway-table.ts
```

**That's it!** The table will be created in Railway.

---

## Alternative: Manual SQL in Railway

If you prefer to do it manually:

1. In Railway, go to your PostgreSQL database
2. Click "Data" tab
3. Click "+ Create Table" button (you already found this)
4. **Instead of using the UI, look for a "SQL" or "Query" option** at the top
5. If there's a SQL tab/option, paste this:

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## After Table is Created

Then deploy your latest code:

```bash
git add .
git commit -m "Fix password reset feature"
git push origin main
```

Railway will auto-deploy and the password reset feature will work! ✅
