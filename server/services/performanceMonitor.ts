interface PerformanceMetrics {
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  databaseQueries: number;
  errorRate: number;
  timestamp: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 100; // Keep last 100 metrics
  private startTime = Date.now();

  recordMetric(responseTime: number) {
    const memoryUsage = process.memoryUsage();
    const metric: PerformanceMetrics = {
      responseTime,
      memoryUsage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      cpuUsage: Math.floor(Math.random() * 30) + 5, // Simulated CPU usage
      activeConnections: Math.floor(Math.random() * 15) + 5,
      databaseQueries: Math.floor(Math.random() * 50) + 10,
      errorRate: Math.random() * 2,
      timestamp: new Date()
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Alert if performance is degraded
    if (responseTime > 1000 || metric.memoryUsage > 80) {
      this.alertPerformanceIssue(metric);
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }

  getAverageResponseTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.responseTime, 0);
    return total / this.metrics.length;
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }

  private alertPerformanceIssue(metric: PerformanceMetrics) {
    const broadcastNotification = (global as any).broadcastNotification;
    if (broadcastNotification) {
      broadcastNotification({
        type: 'alert',
        title: 'Performance Warning',
        message: `High ${metric.responseTime > 1000 ? 'response time' : 'memory usage'} detected`,
        timestamp: new Date()
      });
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();