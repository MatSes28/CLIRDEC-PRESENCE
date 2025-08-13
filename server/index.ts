import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seedData";

// Global error handlers to prevent unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't crash the server, just log the error
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // Don't crash the server, just log the error
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  
  // Seed database with sample data on first run
  try {
    await seedDatabase();
  } catch (error) {
    console.log("Database already seeded or error occurred:", error);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Initialize memory optimization
    if (global.gc) {
      global.gc();
      console.log('Initial memory cleanup completed');
    }
    
    // Start automated attendance monitoring with memory optimization
    setTimeout(async () => {
      try {
        const { startAttendanceMonitoring } = await import('./services/attendanceMonitor');
        await startAttendanceMonitoring();
      } catch (error) {
        console.error('Failed to start attendance monitoring:', error);
      }
    }, 5000); // Reduced delay

    // Aggressive memory cleanup every 5 minutes during high usage
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memMB = Math.round(memUsage.rss / 1024 / 1024);
      
      if (memMB > 300 && global.gc) { // Trigger GC if over 300MB
        global.gc();
        const afterGC = process.memoryUsage();
        const afterMB = Math.round(afterGC.rss / 1024 / 1024);
        console.log(`Memory cleanup: ${memMB}MB → ${afterMB}MB (freed ${memMB - afterMB}MB)`);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  });
})();
