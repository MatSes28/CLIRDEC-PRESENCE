# 🚂 Railway Deployment via GitHub - Complete Guide

This guide covers deploying CLIRDEC PRESENCE to Railway.com through GitHub with VS Code integration.

## 📋 Pre-Deployment Checklist

### ✅ Code Preparation
- [x] All TypeScript errors resolved
- [x] WebSocket CORS properly configured for production
- [x] Debug logging conditional (development only)
- [x] Environment variables properly configured
- [x] Port configuration uses `process.env.PORT`
- [x] Database connection uses `DATABASE_URL`
- [x] Build scripts tested and working

### ✅ GitHub Setup
- [ ] Repository created on GitHub
- [ ] Code pushed to `main` branch
- [ ] `.gitignore` properly configured
- [ ] GitHub Actions workflows in place

### ✅ Railway Configuration
- [ ] Railway account created
- [ ] Railway project created
- [ ] PostgreSQL database provisioned
- [ ] Environment variables configured

---

## 🚀 Step-by-Step Deployment

### Step 1: Push to GitHub (VS Code)

#### Option A: Using VS Code GUI
1. Open VS Code
2. Click on **Source Control** icon (Ctrl+Shift+G)
3. Click **"Initialize Repository"** (if not already initialized)
4. Stage all changes (click + next to "Changes")
5. Enter commit message: `Initial deployment setup`
6. Click **"Commit"**
7. Click **"Publish Branch"** and select GitHub
8. Choose repository visibility (Public/Private)

#### Option B: Using VS Code Terminal
```bash
# Open terminal in VS Code (Ctrl+`)
git init
git add .
git commit -m "Initial deployment setup"
git branch -M main

# Create GitHub repository and get the URL, then:
git remote add origin https://github.com/YOUR_USERNAME/clirdec-presence.git
git push -u origin main
```

### Step 2: Setup Railway Project

1. **Go to Railway**
   - Visit [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create New Project**
   - Click **"New Project"**
   - Select **"Deploy from GitHub repo"**
   - Authorize Railway to access your GitHub account
   - Choose `clirdec-presence` repository

3. **Railway Auto-Detection**
   - Railway will detect Node.js application
   - It will use the `railway.json` configuration
   - Build command: `npm ci && npm run build`
   - Start command: `node dist/index.js`

### Step 3: Add PostgreSQL Database

1. **In Railway Dashboard**
   - Click **"New"** → **"Database"** → **"PostgreSQL"**
   - Railway provisions database instantly

2. **Auto-Configured Variables**
   Railway automatically sets:
   - `DATABASE_URL` (full connection string)
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

### Step 4: Configure Environment Variables

1. **Click on Your Service** → **"Variables"** tab

2. **Add Required Variables:**

```bash
# Email Service (Required)
BREVO_API_KEY=your_brevo_api_key_here
FROM_EMAIL=matt.feria@clsu2.edu.ph

# Application (Required)
NODE_ENV=production

# Session Security (Required)
SESSION_SECRET=your_generated_secret_here
```

3. **Generate Session Secret:**
```bash
# Run in VS Code terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Deploy Application

Railway will automatically:
1. ✅ Clone from GitHub
2. ✅ Install dependencies (`npm ci`)
3. ✅ Build application (`npm run build`)
4. ✅ Push database schema (`npm run db:push` - if configured)
5. ✅ Start server (`node dist/index.js`)

**Your app will be live at:** `https://your-app-name.up.railway.app`

---

## 🔄 Continuous Deployment (Automatic)

### Setup GitHub Actions (Optional but Recommended)

1. **Get Railway Token**
   - Go to Railway Dashboard → **Account Settings** → **Tokens**
   - Click **"Create Token"**
   - Copy the token

2. **Add GitHub Secrets (VS Code/Browser)**
   - Go to GitHub repository → **Settings** → **Secrets and variables** → **Actions**
   - Click **"New repository secret"**
   - Add these secrets:
     - `RAILWAY_TOKEN` = your Railway token
     - `RAILWAY_SERVICE` = your Railway service name

3. **GitHub Actions Will:**
   - ✅ Run type checks on every PR
   - ✅ Build and test on every push
   - ✅ Auto-deploy to Railway on push to `main`

### Workflow Files Included:
- `.github/workflows/ci.yml` - CI checks for PRs
- `.github/workflows/deploy.yml` - Auto-deploy to Railway

---

## 💻 VS Code Integration

### Recommended Extensions

Install these in VS Code for better development:

1. **GitHub Pull Requests and Issues** (by GitHub)
   - Manage PRs directly in VS Code

2. **Railway** (by Railway)
   - View logs and deployments in VS Code

3. **GitLens** (by GitKraken)
   - Better Git integration

4. **ESLint** (by Microsoft)
   - Code quality checks

5. **Tailwind CSS IntelliSense** (by Tailwind Labs)
   - Tailwind autocomplete

### VS Code Settings

Your `.vscode/settings.json` is already configured for:
- Auto-format on save
- ESLint integration
- TypeScript strict mode
- Tailwind IntelliSense

---

## 🔍 Monitoring & Debugging

### View Logs in Railway
1. **Dashboard** → Your service → **Deployments** tab
2. Click on latest deployment
3. View **Build Logs** and **Deploy Logs**

### View Logs in VS Code (with Railway Extension)
1. Install Railway extension
2. Login to Railway
3. View logs in VS Code sidebar

### Common Issues & Solutions

#### ❌ Build Fails
```bash
# Locally test the build
npm run build

# Check for TypeScript errors
npm run check
```

#### ❌ Database Connection Error
- Verify `DATABASE_URL` is set in Railway
- Check PostgreSQL service is running
- Ensure database migration ran successfully

#### ❌ WebSocket Connection Issues
- Verify Railway domain is accessible
- Check CORS configuration includes Railway domain
- Review browser console for errors

#### ❌ Environment Variables Missing
- Go to Railway → Variables tab
- Ensure all required variables are set
- Redeploy after adding variables

---

## 📊 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | Auto-set by Railway |
| `BREVO_API_KEY` | Email service API key | `xkeysib-...` |
| `FROM_EMAIL` | Verified sender email | `matt.feria@clsu2.edu.ph` |
| `NODE_ENV` | Environment mode | `production` |
| `SESSION_SECRET` | Session encryption key | Generate with crypto |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | Auto-set by Railway |
| `REPLIT_CLIENT_ID` | Replit Auth (if used) | N/A |
| `REPLIT_CLIENT_SECRET` | Replit Auth (if used) | N/A |

---

## 🚦 Deployment Verification

### After Deployment, Verify:

1. **Application Running**
   - Visit your Railway URL
   - Should see login page

2. **Database Connected**
   - Login with admin credentials
   - Check if data loads properly

3. **WebSocket Working**
   - Open browser DevTools → Network → WS
   - Should see WebSocket connection

4. **Email Service Working**
   - Test "Contact Parent" feature
   - Verify emails are sent

5. **Performance Check**
   - Check response times
   - Monitor memory usage in Railway

---

## 🔄 Making Updates

### Development Workflow

1. **Make Changes in VS Code**
   ```bash
   # Create feature branch
   git checkout -b feature/your-feature
   
   # Make changes, test locally
   npm run dev
   
   # Commit changes
   git add .
   git commit -m "Add feature: description"
   
   # Push to GitHub
   git push origin feature/your-feature
   ```

2. **Create Pull Request**
   - Use VS Code GitHub extension OR
   - Go to GitHub repository in browser
   - Click "Compare & pull request"
   - CI will run automatically

3. **Merge to Main**
   - Review and approve PR
   - Merge to `main` branch
   - Railway auto-deploys latest code

### Hotfix Workflow

```bash
# For urgent fixes
git checkout main
git pull
# Make fix
git add .
git commit -m "Hotfix: description"
git push origin main
# Railway deploys automatically
```

---

## 📝 Git Workflow Best Practices

### Branch Strategy

- `main` - Production (auto-deploys to Railway)
- `develop` - Development branch (optional)
- `feature/*` - Feature branches
- `hotfix/*` - Emergency fixes

### Commit Messages

```bash
# Good commit messages
git commit -m "Add WebSocket security improvements"
git commit -m "Fix database connection pool timeout"
git commit -m "Update CORS configuration for Railway"

# Bad commit messages
git commit -m "fix"
git commit -m "updates"
git commit -m "changes"
```

---

## 🎯 Quick Reference Commands

### Local Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run check        # TypeScript type check
npm run db:push      # Push database schema
```

### Git Commands
```bash
git status           # Check changes
git add .            # Stage all changes
git commit -m "msg"  # Commit with message
git push             # Push to remote
git pull             # Pull latest changes
```

### Railway CLI (Optional)
```bash
npm i -g @railway/cli    # Install Railway CLI
railway login            # Login to Railway
railway logs             # View logs
railway run npm run dev  # Run with Railway env vars
```

---

## ✅ Final Checklist

Before going live:

- [ ] All tests passing
- [ ] TypeScript check passes (`npm run check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables configured in Railway
- [ ] Database connected and migrated
- [ ] WebSocket connections working
- [ ] Email notifications tested
- [ ] HTTPS enabled (automatic on Railway)
- [ ] Custom domain configured (if needed)
- [ ] Monitoring setup (Railway built-in)
- [ ] Backup strategy in place (Railway auto-backups)

---

## 🆘 Support Resources

- **Railway Docs:** [docs.railway.app](https://docs.railway.app)
- **GitHub Actions Docs:** [docs.github.com/actions](https://docs.github.com/actions)
- **VS Code Git Guide:** [code.visualstudio.com/docs/editor/versioncontrol](https://code.visualstudio.com/docs/editor/versioncontrol)
- **Project README:** `README.md`
- **Deployment Issues:** `DEPLOYMENT.md`

---

## 🎉 You're All Set!

Your application is now:
- ✅ Deployed to Railway
- ✅ Auto-deploying from GitHub
- ✅ Integrated with VS Code
- ✅ Production-ready and secure

**Need help?** Check the troubleshooting section or Railway logs!
