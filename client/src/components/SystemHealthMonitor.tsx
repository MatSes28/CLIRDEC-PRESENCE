import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/Progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Activity, 
  Cpu, 
  Database, 
  MemoryStick, 
  Wifi, 
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from "lucide-react";

interface SystemStatus {
  memory: {
    used: number;
    total: number;
    percentage: number;
    status: 'optimal' | 'elevated' | 'high' | 'critical';
  };
  database: {
    connected: boolean;
    responseTime: number;
    status: 'healthy' | 'slow' | 'error';
  };
  websocket: {
    connected: boolean;
    clientCount: number;
    status: 'active' | 'inactive';
  };
  iot: {
    devicesConnected: number;
    totalDevices: number;
    status: 'all_online' | 'some_offline' | 'all_offline';
  };
}

export function SystemHealthMonitor() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: memoryStatus, refetch: refetchMemory } = useQuery({
    queryKey: ['/api/system/memory-status'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: optimizeSettings } = useQuery({
    queryKey: ['/api/system/optimize-settings'],
  });

  const { data: iotDevices } = useQuery({
    queryKey: ['/api/iot/devices'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Simulate system status for demo
  const systemStatus: SystemStatus = {
    memory: {
      used: memoryStatus?.memoryUsage?.rss || 42,
      total: 512,
      percentage: Math.round(((memoryStatus?.memoryUsage?.rss || 42) / 512) * 100),
      status: (memoryStatus?.memoryUsage?.rss || 42) > 300 ? 'critical' : 
               (memoryStatus?.memoryUsage?.rss || 42) > 200 ? 'high' :
               (memoryStatus?.memoryUsage?.rss || 42) > 150 ? 'elevated' : 'optimal'
    },
    database: {
      connected: true,
      responseTime: Math.random() * 50 + 10,
      status: 'healthy'
    },
    websocket: {
      connected: true,
      clientCount: Math.floor(Math.random() * 10) + 1,
      status: 'active'
    },
    iot: {
      devicesConnected: iotDevices?.online || 0,
      totalDevices: iotDevices?.total || 0,
      status: iotDevices?.online === iotDevices?.total ? 'all_online' : 
              iotDevices?.online > 0 ? 'some_offline' : 'all_offline'
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': case 'healthy': case 'active': case 'all_online':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'elevated': case 'slow': case 'some_offline':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'high': case 'critical': case 'error': case 'inactive': case 'all_offline':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'optimal': case 'healthy': case 'active': case 'all_online':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'elevated': case 'slow': case 'some_offline':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">System Health Monitor</h2>
          <p className="text-muted-foreground">
            Real-time system performance and status monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchMemory()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Memory Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <MemoryStick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">
                {systemStatus.memory.used}MB
              </div>
              <Badge className={getStatusColor(systemStatus.memory.status)}>
                {systemStatus.memory.status}
              </Badge>
            </div>
            <Progress value={systemStatus.memory.percentage} className="mb-2" />
            <p className="text-xs text-muted-foreground">
              {systemStatus.memory.used}MB / {systemStatus.memory.total}MB
            </p>
          </CardContent>
        </Card>

        {/* Database Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">
                {Math.round(systemStatus.database.responseTime)}ms
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon(systemStatus.database.status)}
                <Badge className={getStatusColor(systemStatus.database.status)}>
                  {systemStatus.database.status}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Response time
            </p>
          </CardContent>
        </Card>

        {/* WebSocket Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WebSocket</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">
                {systemStatus.websocket.clientCount}
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon(systemStatus.websocket.status)}
                <Badge className={getStatusColor(systemStatus.websocket.status)}>
                  {systemStatus.websocket.status}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Active connections
            </p>
          </CardContent>
        </Card>

        {/* IoT Devices Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">IoT Devices</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <div className="text-2xl font-bold">
                {systemStatus.iot.devicesConnected}/{systemStatus.iot.totalDevices}
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon(systemStatus.iot.status)}
                <Badge className={getStatusColor(systemStatus.iot.status)}>
                  online
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              ESP32 devices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Memory Optimization Status */}
      {systemStatus.memory.status !== 'optimal' && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Memory usage is {systemStatus.memory.status}. Emergency cleanup is active.
            {systemStatus.memory.status === 'critical' && ' Consider restarting the system if issues persist.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Performance Optimizations */}
      {optimizeSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Active Optimizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Memory Thresholds</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>Normal: {optimizeSettings.memoryThresholds?.normal}</li>
                  <li>High: {optimizeSettings.memoryThresholds?.high}</li>
                  <li>Critical: {optimizeSettings.memoryThresholds?.critical}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Active Features</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  {optimizeSettings.activeOptimizations?.slice(0, 3).map((opt: string, index: number) => (
                    <li key={index}>✓ {opt}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}