# 📋 CLIRDEC PRESENCE - Quick Reference

## 🚀 Common Commands

### Development
```bash
npm install          # Install dependencies
npm run dev         # Start dev server (http://localhost:5000)
npm run build       # Build for production
npm start           # Run production build
npm run check       # TypeScript type check
```

### Database
```bash
npm run db:push     # Push schema changes
```

---

## 🔑 Environment Variables

### Minimal Setup (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/clirdec
BREVO_API_KEY=your_brevo_key
FROM_EMAIL=matt.feria@clsu2.edu.ph
NODE_ENV=development
SESSION_SECRET=random_string_32_chars
```

### Generate Session Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🚂 Railway Deployment

### 1-Click Deploy
1. Push to GitHub
2. Railway → New Project → GitHub Repo
3. Add PostgreSQL
4. Set env vars: `BREVO_API_KEY`, `FROM_EMAIL`, `NODE_ENV=production`, `SESSION_SECRET`
5. Done!

**URL**: `https://your-app.up.railway.app`

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/login              # Login
POST   /api/logout             # Logout
GET    /api/user               # Get current user
```

### Students
```
GET    /api/students           # List students
POST   /api/students           # Create student
PUT    /api/students/:id       # Update student
DELETE /api/students/:id       # Delete student
```

### Attendance
```
POST   /api/attendance/rfid-tap        # Log RFID tap
GET    /api/attendance/session/:id     # Get session attendance
POST   /api/attendance/trigger-monitoring  # Manual monitoring
```

### Email
```
POST   /api/email/process-queue        # Send queued emails
POST   /api/email/contact-parent       # Contact parent
```

### IoT Devices
```
GET    /api/iot/devices               # List devices
POST   /api/iot/devices/:id/config    # Configure device
```

---

## 🌐 WebSocket Endpoints

### Web Clients
```
wss://your-app.railway.app/ws
```

### IoT Devices
```
wss://your-app.railway.app/iot
```

---

## 📱 IoT Device Setup (ESP32 S3)

### Quick Connect
1. Upload `ESP32_S3_DUAL_SENSOR_ATTENDANCE.ino`
2. Set WiFi credentials in code
3. Connect RFID (RC522) to 3.3V ⚠️
4. Connect sensors (HC-SR04) to 5V
5. Power on - auto-connects to server

### GPIO Pins
```
RFID RC522:
  SDA:  GPIO 21
  RST:  GPIO 22
  MISO: GPIO 19
  MOSI: GPIO 23
  SCK:  GPIO 18

Entry Sensor (HC-SR04):
  Trig: GPIO 12
  Echo: GPIO 13

Exit Sensor (HC-SR04):
  Trig: GPIO 25
  Echo: GPIO 26
```

---

## 🎨 VS Code Setup

### Install Extensions
Press `Ctrl+Shift+P` → "Extensions: Show Recommended Extensions" → Install All

### Format Code
- Auto: Save file (Ctrl+S)
- Manual: `Alt+Shift+F`

### Quick Navigation
- Files: `Ctrl+P`
- Commands: `Ctrl+Shift+P`
- Terminal: `Ctrl+~`

---

## 🐛 Troubleshooting

### Build Failed
```bash
rm -rf node_modules dist
npm install
npm run build
```

### Database Error
```bash
# Check DATABASE_URL
npm run db:push
```

### Email Not Sending
- Verify Brevo API key
- Check FROM_EMAIL is verified
- Test: POST `/api/email/process-queue`

### Port In Use
```bash
# Kill process on port 5000
npx kill-port 5000
npm run dev
```

---

## 📊 Default Credentials

### Faculty Account
```
Email: prof.smith@clsu.edu.ph
Password: password123
```

### Admin Account
```
Email: admin@clsu.edu.ph
Password: admin123
```

⚠️ **Change these in production!**

---

## 🔐 Security Checklist

- [ ] Change default passwords
- [ ] Set strong SESSION_SECRET
- [ ] Verify Brevo API key
- [ ] Enable HTTPS (Railway auto)
- [ ] Review user permissions
- [ ] Configure CORS if needed

---

## 📈 Performance Tips

1. **Database**: Use connection pooling (auto-configured)
2. **Memory**: System auto-optimizes (emergency cleanup)
3. **Caching**: TanStack Query handles client-side
4. **WebSocket**: Auto-reconnect on disconnect

---

## 🎯 Common Tasks

### Add New Student
1. Login as faculty
2. Students page → Add Student
3. Fill form (include RFID UID)
4. Save

### View Attendance
1. Dashboard → Class Sessions
2. Click session → View Attendance
3. Export as PDF/CSV

### Contact Parent
1. Find student
2. Actions → Contact Parent
3. Write message → Send

### Assign Computer
1. Computers page
2. Select computer → Assign
3. Choose student → Confirm

---

## 📚 Documentation Links

- Full Deployment: `DEPLOYMENT.md`
- Railway Setup: `RAILWAY_SETUP.md`
- VS Code Guide: `VSCODE_SETUP.md`
- ESP32 Setup: `QUICK_START_ESP32_S3.md`
- Main README: `README.md`

---

## 🆘 Get Help

- **Email**: support@clsu.edu.ph
- **Docs**: See markdown files in root
- **Railway**: https://railway.app/help
- **Brevo**: https://help.brevo.com

---

<div align="center">

**Quick Reference v1.0**

[⬆ Back to Top](#-clirdec-presence---quick-reference)

</div>
