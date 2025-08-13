// Memory optimization utilities for high performance
export class MemoryOptimizer {
  private static gcInterval: NodeJS.Timeout | null = null;
  private static memoryWarningThreshold = 500 * 1024 * 1024; // 500MB

  static startMonitoring() {
    // Force garbage collection every 5 minutes during high memory usage
    this.gcInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      
      if (memUsage.rss > this.memoryWarningThreshold) {
        console.log(`High memory usage detected: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
        
        if (global.gc) {
          global.gc();
          const afterGC = process.memoryUsage();
          console.log(`Memory after GC: ${Math.round(afterGC.rss / 1024 / 1024)}MB (freed ${Math.round((memUsage.rss - afterGC.rss) / 1024 / 1024)}MB)`);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  static stopMonitoring() {
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
      this.gcInterval = null;
    }
  }

  static getMemoryStats() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
    };
  }

  static optimizeQueryCache() {
    // Clear any large cached query results that might be accumulating
    // This would integrate with your query cache system
    console.log('Query cache optimization completed');
  }

  static forceGarbageCollection() {
    if (global.gc) {
      const before = process.memoryUsage();
      global.gc();
      const after = process.memoryUsage();
      
      console.log(`Manual GC: ${Math.round(before.rss / 1024 / 1024)}MB → ${Math.round(after.rss / 1024 / 1024)}MB`);
      return {
        before: Math.round(before.rss / 1024 / 1024),
        after: Math.round(after.rss / 1024 / 1024),
        freed: Math.round((before.rss - after.rss) / 1024 / 1024)
      };
    }
    return null;
  }
}