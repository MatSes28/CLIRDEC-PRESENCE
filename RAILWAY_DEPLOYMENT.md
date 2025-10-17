# Railway Deployment Guide - CLIRDEC: PRESENCE

## Prerequisites
- GitHub account with your code repository
- Railway account connected to GitHub
- Brevo account with API key

## Step 1: Prepare Your Code

The following fixes have been implemented:
- ✅ Fixed import paths (`@shared/schema` instead of `@/shared/schema`)
- ✅ Added `bcrypt` package for password hashing
- ✅ Enhanced Railway environment detection
- ✅ Improved error logging for debugging

## Step 2: Push Latest Code to GitHub

```bash
git add .
git commit -m "Fix password reset feature with Railway support"
git push origin main
```

## Step 3: Set Up Environment Variables on Railway

Go to your Railway project settings and add these environment variables:

### Required Variables:
1. **DATABASE_URL** - (Auto-configured by Railway Postgres)
2. **BREVO_API_KEY** - Your Brevo API key from https://app.brevo.com/settings/keys/api
3. **FROM_EMAIL** - Your verified sender email (e.g., matt.feria@clsu2.edu.ph)
4. **NODE_ENV** - Set to `production`
5. **RAILWAY_PUBLIC_DOMAIN** - (Auto-set by Railway)

### How to Add Environment Variables:
1. Go to Railway Dashboard
2. Select your project
3. Click on your service
4. Go to "Variables" tab
5. Click "New Variable"
6. Add each variable with its value

## Step 4: Create Password Reset Table in Production Database

### Option A: Using Railway's Database Console
1. Go to Railway Dashboard
2. Click on your PostgreSQL database
3. Go to "Data" tab
4. Click "Query" and run:

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

### Option B: Using Railway CLI
```bash
railway run npm run db:push
```

## Step 5: Verify Brevo API Key

Test your Brevo API key:
1. Go to https://app.brevo.com/settings/keys/api
2. Copy your API key (starts with `xkeysib-`)
3. Verify the sender email is added and verified in Brevo
4. Add both to Railway environment variables

## Step 6: Deploy

Railway will automatically deploy when you push to GitHub. Monitor the deployment:
1. Go to Railway Dashboard
2. Click on "Deployments"
3. Watch the build logs
4. Ensure build succeeds

## Step 7: Test Password Reset Flow

1. Go to your Railway app URL: `https://clirdec-presence-production.up.railway.app`
2. Click "Forgot Password"
3. Enter a registered email address
4. Check the email inbox for the reset link
5. Click the link and set a new password

## Troubleshooting

### Error: "500: Failed to process password reset request"

**Cause**: Brevo API authentication failure

**Fix**:
1. Verify `BREVO_API_KEY` is correctly set in Railway
2. Ensure the API key has "Send transactional emails" permission
3. Check that `FROM_EMAIL` is verified in your Brevo account

### Error: "Password reset tokens table doesn't exist"

**Cause**: Database migration not run

**Fix**:
```bash
railway run npm run db:push --force
```

### Error: "Invalid reset token"

**Cause**: Token expired or already used

**Fix**:
- Request a new password reset link (tokens expire after 1 hour)
- Each token can only be used once

## Environment Variable Checklist

- [ ] `DATABASE_URL` (auto-configured)
- [ ] `BREVO_API_KEY` (from Brevo dashboard)
- [ ] `FROM_EMAIL` (verified in Brevo)
- [ ] `NODE_ENV=production`
- [ ] `RAILWAY_PUBLIC_DOMAIN` (auto-configured)

## Security Notes

- All password reset tokens expire after 1 hour
- Tokens are single-use only
- Audit logs track all password reset activities
- ISO 27001 compliant password policies enforced

## Support

If issues persist:
1. Check Railway deployment logs
2. Verify all environment variables are set
3. Ensure Brevo account is active and email is verified
4. Check database connection and table existence
