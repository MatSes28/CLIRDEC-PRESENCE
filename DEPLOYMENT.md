# 🚀 CLIRDEC PRESENCE - Railway Deployment Guide

This guide will help you deploy the CLIRDEC Presence attendance monitoring system to Railway.com.

## 📋 Prerequisites

- Railway account (sign up at [railway.app](https://railway.app))
- GitHub account (to connect your repository)
- Brevo API key for email notifications ([get one here](https://app.brevo.com/settings/keys/api))

## 🔧 Quick Start Deployment

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/clirdec-presence.git
git push -u origin main
```

### 2. Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `clirdec-presence` repository
5. Railway will auto-detect the Node.js application

### 3. Add PostgreSQL Database

1. In your Railway project, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway will automatically provision a database and set `DATABASE_URL`
3. The following environment variables are auto-configured:
   - `DATABASE_URL`
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

### 4. Configure Environment Variables

In your Railway service, go to **Variables** and add:

#### Required Variables:
```
BREVO_API_KEY=your_brevo_api_key_here
FROM_EMAIL=matt.feria@clsu2.edu.ph
NODE_ENV=production
SESSION_SECRET=generate_random_32_char_string
```

#### Generate Session Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Deploy!

Railway will automatically:
- Install dependencies (`npm ci`)
- Build the application (`npm run build`)
- Run database migrations
- Start the server (`node dist/index.js`)

Your app will be live at: `https://your-app-name.up.railway.app`

## 🔒 Environment Variables Reference

### Database (Auto-configured by Railway PostgreSQL)
- `DATABASE_URL` - Full PostgreSQL connection string
- `PGHOST` - PostgreSQL host
- `PGPORT` - PostgreSQL port (default: 5432)
- `PGUSER` - PostgreSQL username
- `PGPASSWORD` - PostgreSQL password
- `PGDATABASE` - Database name

### Email Service (Required)
- `BREVO_API_KEY` - Your Brevo API key ([get it here](https://app.brevo.com/settings/keys/api))
- `FROM_EMAIL` - Sender email address (must be verified in Brevo)

### Application (Required)
- `NODE_ENV` - Set to `production`
- `SESSION_SECRET` - Random secret for session encryption

### Optional
- `PORT` - Auto-set by Railway (default: 5000)
- `REPLIT_CLIENT_ID` - Only if using Replit Auth
- `REPLIT_CLIENT_SECRET` - Only if using Replit Auth

## 📁 Project Structure

```
clirdec-presence/
├── client/              # React frontend (Vite)
├── server/              # Express backend
├── shared/              # Shared types and schemas
├── dist/                # Built files (production)
├── railway.json         # Railway deployment config
├── package.json         # Dependencies and scripts
├── .env.example         # Environment variables template
└── DEPLOYMENT.md        # This file
```

## 🛠️ Development Workflow

### Local Development
```bash
npm install
npm run dev
```
- Frontend: http://localhost:5000 (Vite HMR enabled)
- Backend: Same port (Express + WebSocket)

### Build for Production
```bash
npm run build
```
Builds:
- Frontend → `dist/public` (Vite)
- Backend → `dist/index.js` (ESBuild)

### Production Start
```bash
npm start
```
Runs the built application from `dist/`

## 🔄 Database Migrations

### Push Schema Changes
```bash
npm run db:push
```
This uses Drizzle Kit to push schema changes directly to the database.

⚠️ **Important**: In production, Railway runs this automatically during deployment.

## 🌐 Custom Domain Setup

1. In Railway, go to your service → **Settings** → **Networking**
2. Click **"Generate Domain"** for a free Railway domain
3. Or add your **Custom Domain**:
   - Enter your domain (e.g., `presence.clsu.edu.ph`)
   - Add CNAME record to your DNS:
     ```
     CNAME @ your-app.up.railway.app
     ```

## 📊 Monitoring & Logs

### View Logs
- In Railway dashboard → **Deployments** → Click deployment → **View Logs**

### Health Check
- Railway automatically monitors: `GET /`
- Timeout: 100 seconds (configured in `railway.json`)

### Restart Policy
- Auto-restart on failure (configured in `railway.json`)

## 🐛 Troubleshooting

### Build Fails
1. Check build logs in Railway dashboard
2. Verify all dependencies in `package.json`
3. Test build locally: `npm run build`

### Database Connection Issues
1. Ensure PostgreSQL service is running in Railway
2. Verify `DATABASE_URL` is set correctly
3. Check database logs in Railway

### Email Not Sending
1. Verify `BREVO_API_KEY` is correct
2. Ensure `FROM_EMAIL` is verified in Brevo
3. Check Brevo dashboard for delivery status

### WebSocket Connection Issues
1. Railway supports WebSocket by default
2. Ensure client connects to `wss://` (secure WebSocket)
3. Check CORS settings in backend

## 🔐 Security Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Rotate secrets regularly** - Update `SESSION_SECRET` periodically
3. **Use strong passwords** - For database and admin accounts
4. **Enable HTTPS only** - Railway provides SSL certificates automatically
5. **Limit database access** - Use Railway's private networking

## 📦 VS Code Setup

The project includes VS Code settings for optimal development:

### Recommended Extensions (auto-suggested):
- Prettier - Code formatter
- ESLint - Linting
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features
- Auto Rename Tag
- Path Intellisense
- Color Highlight
- Error Lens

### Open in VS Code:
```bash
code .
```

Extensions will be recommended automatically!

## 🚨 Emergency Rollback

If deployment fails or has issues:

1. Go to Railway → **Deployments**
2. Find a working deployment
3. Click **"..."** → **"Redeploy"**

## 📞 Support

- **Railway Docs**: https://docs.railway.com
- **Drizzle ORM**: https://orm.drizzle.team
- **Brevo API**: https://developers.brevo.com
- **Project Issues**: Contact IT Support at support@clsu.edu.ph

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Railway project created
- [ ] PostgreSQL database added
- [ ] Environment variables configured
- [ ] `BREVO_API_KEY` added
- [ ] `SESSION_SECRET` generated and added
- [ ] Deployment successful
- [ ] Health check passing
- [ ] Database migrations applied
- [ ] Email service tested
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] WebSocket connections working

---

🎉 **Congratulations!** Your CLIRDEC Presence system is now live on Railway!
