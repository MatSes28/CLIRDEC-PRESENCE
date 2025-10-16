# 🚂 Complete Railway Deployment Guide - Step by Step

## 📋 **Complete Deployment Steps**

---

## **PART 1: Push Your Code to GitHub**

### Step 1: Check Your Git Status
```bash
git status
```

### Step 2: Remove Git Lock (if you still have issues)
```bash
rm -f .git/index.lock
```

### Step 3: Stage All Your Files
```bash
git add .
```

### Step 4: Commit Your Changes
```bash
git commit -m "Ready for Railway deployment"
```

### Step 5: Push to GitHub
```bash
git push origin main
```

**If push fails with conflicts:**
```bash
# Option A: Force push (if your local code is correct)
git push origin main --force

# Option B: Pull and merge first
git pull origin main --no-rebase
git push origin main
```

---

## **PART 2: Create Railway Project**

### Step 6: Go to Railway
1. Open browser and go to: **https://railway.app**
2. Click **"Login"** (use GitHub to login)
3. Click **"New Project"**

### Step 7: Deploy from GitHub
1. Select **"Deploy from GitHub repo"**
2. If asked, click **"Configure GitHub App"** to give Railway access
3. Select your repository from the list
4. Click **"Deploy Now"**

Railway will start building your app (this takes 1-2 minutes)

---

## **PART 3: Add PostgreSQL Database**

### Step 8: Add Database
1. In your Railway project dashboard, click **"New"** button (top right)
2. Select **"Database"**
3. Choose **"Add PostgreSQL"**
4. Click **"Add"**

✅ Railway automatically creates `DATABASE_URL` environment variable!

---

## **PART 4: Configure Environment Variables**

### Step 9: Open Variables Tab
1. In Railway project, click **"Variables"** tab (left sidebar)
2. You'll see `DATABASE_URL` already there ✅

### Step 10: Add BREVO_API_KEY
1. Click **"New Variable"**
2. **Variable name**: `BREVO_API_KEY`
3. **Value**: Your Brevo API key
   - Get it from: https://app.brevo.com/settings/keys/api
   - Click your name → SMTP & API → API Keys
   - Copy the key
4. Click **"Add"**

### Step 11: Add FROM_EMAIL
1. Click **"New Variable"**
2. **Variable name**: `FROM_EMAIL`
3. **Value**: `matt.feria@clsu2.edu.ph`
4. Click **"Add"**

### Step 12: Add NODE_ENV
1. Click **"New Variable"**
2. **Variable name**: `NODE_ENV`
3. **Value**: `production`
4. Click **"Add"**

### Step 13: Generate and Add SESSION_SECRET
**In Replit Shell or your terminal, run:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
**Copy the output (64-character random string)**

Then in Railway:
1. Click **"New Variable"**
2. **Variable name**: `SESSION_SECRET`
3. **Value**: Paste the random string you copied
4. Click **"Add"**

---

## **PART 5: Wait for Deployment**

### Step 14: Monitor Deployment
1. Click **"Deployments"** tab (left sidebar)
2. Watch the latest deployment
3. Wait 2-3 minutes for it to complete

You should see:
```
✅ Build successful
✅ Deploy successful
🌐 Service is live
```

### Step 15: Get Your App URL
1. In Railway project, click **"Settings"** tab
2. Scroll to **"Domains"** section
3. Click **"Generate Domain"**
4. Railway creates: `https://your-app-name.up.railway.app`

✅ **Your app is now live!**

---

## **PART 6: Verify Everything Works**

### Step 16: Test Your App
1. Click the generated URL
2. You should see the CLIRDEC login page
3. Try logging in with your credentials
4. Test creating a schedule, adding students, etc.

---

## 📊 **Environment Variables Checklist**

Make sure you have ALL of these in Railway → Variables:

- [x] `DATABASE_URL` - ✅ Auto-created by PostgreSQL
- [x] `BREVO_API_KEY` - Your Brevo API key
- [x] `FROM_EMAIL` - `matt.feria@clsu2.edu.ph`
- [x] `NODE_ENV` - `production`
- [x] `SESSION_SECRET` - Random 64-character string

---

## 🔧 **Troubleshooting**

### If build fails:
1. Click **Deployments** → **View Logs**
2. Look for error messages
3. Share the error with me

### If app doesn't start:
1. Check all 5 environment variables are set
2. Check PostgreSQL database is running
3. Click **Deployments** → **View Logs**

### If you get "Service Unavailable":
- Wait 2-3 minutes (app is still starting)
- Check logs for database connection errors
- Verify `DATABASE_URL` exists

---

## 🎯 **Quick Summary**

```bash
# 1. Push to GitHub
git add .
git commit -m "Deploy to Railway"
git push origin main

# 2. Railway Setup
- Login to railway.app
- New Project → Deploy from GitHub
- Add PostgreSQL database
- Add 4 environment variables:
  • BREVO_API_KEY
  • FROM_EMAIL
  • NODE_ENV=production
  • SESSION_SECRET

# 3. Generate Domain
- Settings → Domains → Generate Domain
- Your app is live! 🎉
```

---

## 📱 **Your Live App**

Once deployed, you can:
- ✅ Access from anywhere: `https://your-app.railway.app`
- ✅ Faculty can login remotely
- ✅ ESP32 devices can connect via WebSocket
- ✅ Emails are sent to parents
- ✅ Real-time attendance tracking works

---

## 🚀 **You're Done!**

Your CLIRDEC: PRESENCE system is now live on Railway!

**Need help?** Share the Railway deployment logs and I'll help debug! 💪
