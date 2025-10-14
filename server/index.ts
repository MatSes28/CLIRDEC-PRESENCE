import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { seedDatabase } from "./seedData";
import { initializeDatabase } from "./initDatabase";

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
  // Initialize database tables before starting server
  await initializeDatabase();
  
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

  // Use PORT from environment variable (Railway, etc.) or default to 5000 (Replit)
  // This serves both the API and the client.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log(`🌐 HTTP server running on http://0.0.0.0:${port}`);
    log(`🔌 WebSocket servers running on:`);
    log(`   📱 IoT devices: ws://0.0.0.0:${port}/iot`);
    log(`   💻 Web clients: ws://0.0.0.0:${port}/ws`);
    
    // Initialize emergency memory optimization  
    setTimeout(async () => {
      try {
        const { EmergencyMemoryOptimizer } = await import('./utils/emergencyMemoryOptimizer');
        await EmergencyMemoryOptimizer.forceEmergencyCleanup();
        EmergencyMemoryOptimizer.startEmergencyMonitoring();
      } catch (error) {
        console.error('Failed to start emergency memory optimizer:', error);
      }
    }, 1000);
    
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

    // Emergency memory cleanup - every 2 minutes during high usage
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memMB = Math.round(memUsage.rss / 1024 / 1024);
      
      if (memMB > 150 && global.gc) { // More aggressive threshold at 150MB
        global.gc();
        const afterGC = process.memoryUsage();
        const afterMB = Math.round(afterGC.rss / 1024 / 1024);
        console.log(`MEMORY OPTIMIZATION: ${memMB}MB → ${afterMB}MB (freed ${memMB - afterMB}MB)`);
      }
    }, 2 * 60 * 1000); // Every 2 minutes for more aggressive cleanup
  });
})();
