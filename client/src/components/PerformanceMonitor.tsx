import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Cpu, Database, Globe, Zap, TrendingUp } from "lucide-react";

interface PerformanceMetrics {
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  databaseConnections: number;
  activeSessions: number;
  rfidProcessingRate: number;
  uptime: number;
}

export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    responseTime: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    databaseConnections: 0,
    activeSessions: 0,
    rfidProcessingRate: 0,
    uptime: 0
  });

  const [isOnline, setIsOnline] = useState(true);

  // Simulate performance monitoring
  useEffect(() => {
    const updateMetrics = () => {
      setMetrics({
        responseTime: Math.floor(Math.random() * 50) + 10, // 10-60ms
        cpuUsage: Math.floor(Math.random() * 30) + 5, // 5-35%
        memoryUsage: Math.floor(Math.random() * 40) + 30, // 30-70%
        databaseConnections: Math.floor(Math.random() * 8) + 2, // 2-10
        activeSessions: Math.floor(Math.random() * 15) + 5, // 5-20
        rfidProcessingRate: Math.floor(Math.random() * 20) + 80, // 80-100%
        uptime: Math.floor(Date.now() / 1000) // Seconds since epoch
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 2000);

    // Network status monitoring
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'text-green-600';
    if (value < thresholds[1]) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'bg-green-500';
    if (value < thresholds[1]) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            System Performance
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Response Time</span>
              </div>
              <span className={`text-sm font-semibold ${getStatusColor(metrics.responseTime, [30, 50])}`}>
                {metrics.responseTime}ms
              </span>
            </div>
            <Progress 
              value={Math.min(metrics.responseTime, 100)} 
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">CPU Usage</span>
              </div>
              <span className={`text-sm font-semibold ${getStatusColor(metrics.cpuUsage, [50, 80])}`}>
                {metrics.cpuUsage}%
              </span>
            </div>
            <Progress 
              value={metrics.cpuUsage} 
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <span className={`text-sm font-semibold ${getStatusColor(metrics.memoryUsage, [60, 80])}`}>
                {metrics.memoryUsage}%
              </span>
            </div>
            <Progress 
              value={metrics.memoryUsage} 
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">RFID Processing</span>
              </div>
              <span className={`text-sm font-semibold ${getStatusColor(100 - metrics.rfidProcessingRate, [20, 40])}`}>
                {metrics.rfidProcessingRate}%
              </span>
            </div>
            <Progress 
              value={metrics.rfidProcessingRate} 
              className="h-2"
            />
          </div>
        </div>

        {/* Connection Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-lg font-semibold">{metrics.activeSessions}</p>
            <p className="text-xs text-muted-foreground">Active Sessions</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{metrics.databaseConnections}</p>
            <p className="text-xs text-muted-foreground">DB Connections</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold">{formatUptime(Math.floor(Date.now() / 1000) % 86400)}</p>
            <p className="text-xs text-muted-foreground">Uptime</p>
          </div>
        </div>

        {/* Network Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Network Status</span>
          </div>
          <Badge variant={isOnline ? "default" : "destructive"}>
            {isOnline ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>

        {/* Performance Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Health</span>
            <Badge
              variant={
                metrics.cpuUsage < 50 && metrics.memoryUsage < 60 && metrics.responseTime < 30
                  ? "default"
                  : metrics.cpuUsage < 80 && metrics.memoryUsage < 80 && metrics.responseTime < 50
                  ? "secondary"
                  : "destructive"
              }
            >
              {metrics.cpuUsage < 50 && metrics.memoryUsage < 60 && metrics.responseTime < 30
                ? "Excellent"
                : metrics.cpuUsage < 80 && metrics.memoryUsage < 80 && metrics.responseTime < 50
                ? "Good"
                : "Degraded"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}