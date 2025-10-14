# 🚂 Quick Railway Setup Guide

## ⚡ 5-Minute Deployment

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repository
4. Railway auto-deploys! ✨

### Step 3: Add Database
1. Click **"New"** → **"Database"** → **"PostgreSQL"**
2. Done! `DATABASE_URL` is auto-configured

### Step 4: Add Environment Variables
Click **"Variables"** and add:
```
BREVO_API_KEY=your_key_here
FROM_EMAIL=matt.feria@clsu2.edu.ph
NODE_ENV=production
SESSION_SECRET=random_32_chars
```

### Step 5: Get Your URL
Railway generates a URL: `https://your-app.up.railway.app`

---

## 📋 Required Environment Variables

| Variable | Required | Description | Get It From |
|----------|----------|-------------|-------------|
| `DATABASE_URL` | ✅ Auto-set | PostgreSQL connection | Railway PostgreSQL |
| `BREVO_API_KEY` | ✅ Manual | Email service | [Brevo Dashboard](https://app.brevo.com/settings/keys/api) |
| `FROM_EMAIL` | ✅ Manual | Sender email | Your verified Brevo email |
| `NODE_ENV` | ✅ Manual | Set to `production` | - |
| `SESSION_SECRET` | ✅ Manual | Random string | Generate below ⬇️ |

### Generate Session Secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## ✅ Deployment Checklist

- [ ] Code on GitHub
- [ ] Railway project created
- [ ] PostgreSQL added
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] App is live!

---

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your secrets to .env

# Start development server
npm run dev
```

Visit: http://localhost:5000

---

## 📦 Project Structure

```
📁 client/       - React frontend (Vite)
📁 server/       - Express backend
📁 shared/       - Shared types
📄 railway.json  - Railway config
📄 package.json  - Scripts & dependencies
```

---

## 🚨 Troubleshooting

### Build Failed?
- Check Railway logs
- Test locally: `npm run build`

### Database Error?
- Verify PostgreSQL is running
- Check `DATABASE_URL` variable

### Emails Not Sending?
- Verify Brevo API key
- Check `FROM_EMAIL` is verified

---

## 📚 Full Documentation

- **Deployment Guide**: See `DEPLOYMENT.md`
- **Railway Docs**: https://docs.railway.com
- **Support**: support@clsu.edu.ph

---

🎉 **That's it! Your app is live on Railway!**
