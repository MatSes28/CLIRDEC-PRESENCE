# 🚀 Quick Start: Deploy Password Reset Feature to Railway

## Current Status
✅ All code fixes are ready in development  
❌ Production (Railway) needs to be updated

## The Problem
Your Railway deployment has the old code without:
- Password reset functionality
- `bcrypt` package
- `password_reset_tokens` table

## The Solution (3 Simple Steps)

### Step 1: Set Up Brevo API Key on Railway (2 minutes)

1. **Get your Brevo API Key:**
   - Go to https://app.brevo.com/settings/keys/api
   - Copy the API key (starts with `xkeysib-`)

2. **Add to Railway:**
   - Go to https://railway.app
   - Open your project
   - Click on your service
   - Go to "Variables" tab
   - Click "+ New Variable"
   - Add these:
     ```
     BREVO_API_KEY = xkeysib-your-actual-key-here
     FROM_EMAIL = matt.feria@clsu2.edu.ph
     NODE_ENV = production
     ```
   - Click "Save"

### Step 2: Create Database Table (1 minute)

**Option A: Using Railway Dashboard**
1. In Railway, click on your PostgreSQL database
2. Click "Data" tab
3. Click "Query"
4. Copy and paste this SQL:

```sql
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  token VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```
5. Click "Run"

**Option B: Using the SQL file I created**
1. Download `scripts/create-password-reset-table.sql`
2. Run it in Railway's database query interface

### Step 3: Deploy to Railway (1 minute)

In your Replit terminal:

```bash
# Commit and push the latest code
git add .
git commit -m "Fix password reset with Railway support"
git push origin main
```

Railway will automatically detect the changes and redeploy!

## Verify It's Working

1. Wait for Railway deployment to complete (check Railway dashboard)
2. Open your app: https://clirdec-presence-production.up.railway.app
3. Click "Forgot Password"
4. Enter: `matt.feria@clsu2.edu.ph` (or another registered email)
5. Check your email inbox
6. Click the reset link and set a new password

## If You Get Errors

### "500: Failed to process password reset request"
- Check Brevo API key is correct in Railway variables
- Verify FROM_EMAIL is verified in Brevo account

### "Invalid reset token"  
- Make sure the database table was created (Step 2)
- Token might have expired (they last 1 hour)

### "Email not received"
- Check spam folder
- Verify email is verified in Brevo
- Check Railway logs: `railway logs`

## Need Help?

Run the automated deployment script:
```bash
./scripts/deploy-railway.sh
```

Or check the full guide: `RAILWAY_DEPLOYMENT.md`

---

**⏱️ Total Time: ~5 minutes**  
**🎯 Result: Working password reset on production!**
