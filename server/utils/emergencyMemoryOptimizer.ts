// Emergency memory optimization for high memory usage scenarios
export class EmergencyMemoryOptimizer {
  private static readonly MAX_MEMORY_MB = 200;
  private static readonly CRITICAL_MEMORY_MB = 300;
  private static isOptimizing = false;

  static async forceEmergencyCleanup() {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    console.log('🚨 EMERGENCY MEMORY CLEANUP INITIATED');
    
    try {
      // Force multiple garbage collection cycles
      if (global.gc) {
        const before = process.memoryUsage();
        
        // Multiple GC passes for thorough cleanup
        for (let i = 0; i < 3; i++) {
          global.gc();
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        const after = process.memoryUsage();
        const freedMB = Math.round((before.rss - after.rss) / 1024 / 1024);
        
        console.log(`✅ Emergency cleanup completed: freed ${freedMB}MB`);
        console.log(`📊 Memory: ${Math.round(before.rss / 1024 / 1024)}MB → ${Math.round(after.rss / 1024 / 1024)}MB`);
      }
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  static startEmergencyMonitoring() {
    console.log('🔋 Starting emergency memory monitoring (250MB threshold)');
    
    setInterval(async () => {
      const memUsage = process.memoryUsage();
      const memMB = Math.round(memUsage.rss / 1024 / 1024);
      
      if (memMB > this.MAX_MEMORY_MB) {
        console.log(`⚠️  High memory usage detected: ${memMB}MB`);
        await this.forceEmergencyCleanup();
      }
      
      if (memMB > this.CRITICAL_MEMORY_MB) {
        console.log(`🚨 CRITICAL memory usage: ${memMB}MB - Multiple cleanup cycles`);
        await this.forceEmergencyCleanup();
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.forceEmergencyCleanup();
      }
    }, 60 * 1000); // Check every minute
  }

  static getMemoryReport() {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      status: usage.rss > this.CRITICAL_MEMORY_MB * 1024 * 1024 ? 'CRITICAL' : 
              usage.rss > this.MAX_MEMORY_MB * 1024 * 1024 ? 'HIGH' : 'NORMAL'
    };
  }
}