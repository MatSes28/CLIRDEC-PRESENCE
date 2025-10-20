import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { auditService } from "./services/auditService";
// Removed connectPg import - using memorystore instead

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !stored.includes('.')) {
    return false;
  }
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use in-memory session store for better performance and reliability
  const MemoryStore = (await import('memorystore')).default(session);
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
    ttl: sessionTtl,
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email', // Allow login with email
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    ),
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(null, false);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName, role, facultyId } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        email,
        password: await hashPassword(password),
        firstName,
        lastName,
        role: role || 'faculty', // Default to faculty
        facultyId,
        department: "Information Technology"
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req: any, res, next) => {
    const { email, username } = req.body;
    const loginEmail = email || username; // Support both email and username fields
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    try {
      // Check rate limit (ISO 27001: max 5 failed attempts in 5 minutes)
      const isRateLimited = await auditService.checkRateLimit(loginEmail, ipAddress);
      if (isRateLimited) {
        await auditService.logLoginAttempt({
          email: loginEmail,
          ipAddress,
          success: false,
          userAgent,
        });
        
        return res.status(429).json({ 
          message: "Too many failed login attempts. Please try again in 5 minutes." 
        });
      }

      // Attempt authentication
      passport.authenticate("local", async (err: any, user: any, info: any) => {
        if (err) return next(err);

        const success = !!user;

        // Log login attempt
        await auditService.logLoginAttempt({
          email: loginEmail,
          ipAddress,
          success,
          userAgent,
        });

        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }

        // Log successful login in audit trail
        await auditService.logAction({
          userId: user.id,
          action: "LOGIN",
          entityType: "auth",
          entityId: user.id,
          ipAddress,
          userAgent,
          status: "success",
        });

        req.login(user, (loginErr: any) => {
          if (loginErr) return next(loginErr);
          res.status(200).json(req.user);
        });
      })(req, res, next);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Handle both GET and POST logout requests
  const logoutHandler = async (req: any, res: any, next: any) => {
    const userId = req.user?.id;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    req.logout((err: any) => {
      if (err) return next(err);
      
      // Log logout in audit trail
      if (userId) {
        auditService.logAction({
          userId,
          action: "LOGOUT",
          entityType: "auth",
          entityId: userId,
          ipAddress,
          userAgent,
          status: "success",
        });
      }

      req.session.destroy((destroyErr: any) => {
        if (destroyErr) {
          console.error("Session destroy error:", destroyErr);
        }
        res.clearCookie('connect.sid');
        res.sendStatus(200);
      });
    });
  };

  app.post("/api/logout", logoutHandler);
  app.get("/api/logout", logoutHandler);

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });
}

export function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function requireAdminOrFaculty(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!['admin', 'faculty'].includes(req.user.role)) {
    return res.status(403).json({ message: "Faculty or admin access required" });
  }
  next();
}