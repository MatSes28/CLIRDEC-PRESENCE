import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Activity, 
  Settings, 
  Code, 
  Download,
  CheckCircle,
  AlertCircle,
  Zap,
  Thermometer,
  Battery,
  MapPin,
  Clock,
  Wrench
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface IoTDevice {
  deviceId: string;
  deviceType: string;
  location: string;
  status: 'online' | 'offline';
  lastSeen: string;
  capabilities: string[];
  batteryLevel?: number;
  temperature?: number;
  wifiSignal?: number;
  firmwareVersion: string;
  ipAddress: string;
  macAddress?: string;
  uptime?: number;
  responseTime?: number;
  reconnectionCount?: number;
}

interface DeviceStats {
  total: number;
  online: number;
  offline: number;
}

interface ConnectionEvent {
  id: string;
  deviceId: string;
  event: 'connected' | 'disconnected' | 'registered' | 'heartbeat' | 'error';
  timestamp: string;
  message: string;
}

interface SetupGuide {
  hardwareRequirements?: string[];
  wiring?: {
    'RFID RC522'?: Record<string, string>;
    'PIR HC-SR501'?: Record<string, string>;
  };
  steps?: string[];
  configuration?: {
    serverHost?: string;
  };
}

interface DevicesResponse {
  devices?: IoTDevice[];
  total?: number;
  online?: number;
  offline?: number;
}

export default function IoTDevicesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [configMessage, setConfigMessage] = useState("");
  
  // Fetch IoT devices
  const { data: deviceData, isLoading } = useQuery<IoTDevice[] | DevicesResponse>({
    queryKey: ['/api/iot/devices'],
    refetchInterval: 5000 // Refresh every 5 seconds
  });

  const devices: IoTDevice[] = Array.isArray(deviceData) ? deviceData : (deviceData as DevicesResponse)?.devices || [];
  const stats: DeviceStats = deviceData && typeof deviceData === 'object' && 'total' in deviceData
    ? deviceData as DeviceStats
    : { total: devices.length, online: devices.filter(d => d.status === 'online').length, offline: devices.filter(d => d.status === 'offline').length };

  // Device configuration mutation
  const configMutation = useMutation({
    mutationFn: async ({ deviceId, config }: { deviceId: string; config: any }) => {
      return await apiRequest('POST', `/api/iot/devices/${deviceId}/config`, config);
    },
    onSuccess: () => {
      toast({
        title: "Configuration Updated",
        description: "Device configuration has been sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/iot/devices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Configuration Failed",
        description: error.message || "Failed to update device configuration",
        variant: "destructive"
      });
    }
  });

  // Request diagnostics mutation
  const diagnosticsMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      return await apiRequest('POST', `/api/iot/devices/${deviceId}/diagnostics`, {});
    },
    onSuccess: () => {
      toast({
        title: "Diagnostics Requested",
        description: "Device diagnostics request has been sent",
      });
    }
  });

  // Broadcast message mutation
  const broadcastMutation = useMutation({
    mutationFn: async (message: any) => {
      return await apiRequest('POST', '/api/iot/broadcast', message);
    },
    onSuccess: () => {
      toast({
        title: "Message Broadcasted",
        description: "Message has been sent to all connected devices",
      });
      setConfigMessage("");
    }
  });

  // Setup guide query
  const { data: setupGuide } = useQuery<SetupGuide>({
    queryKey: ['/api/iot/setup-guide']
  });

  // Connection events query  
  const { data: connectionEvents = [] } = useQuery<ConnectionEvent[]>({
    queryKey: ['/api/iot/connection-events'],
    refetchInterval: 3000 // Refresh every 3 seconds
  });

  const handleConfigUpdate = (deviceId: string) => {
    try {
      const config = JSON.parse(configMessage);
      configMutation.mutate({ deviceId, config });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON configuration",
        variant: "destructive"
      });
    }
  };

  const handleBroadcast = () => {
    try {
      const message = JSON.parse(configMessage);
      broadcastMutation.mutate(message);
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON message",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSignalStrength = (rssi?: number) => {
    if (!rssi) return 'Unknown';
    if (rssi > -50) return 'Excellent';
    if (rssi > -60) return 'Good';
    if (rssi > -70) return 'Fair';
    return 'Poor';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">IoT Device Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <h1 className="text-2xl font-bold">IoT Device Management</h1>
        </div>
      </div>

      {/* Device Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Devices</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wifi className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.online}</div>
                <div className="text-sm text-gray-600">Online</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <WifiOff className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.offline}</div>
                <div className="text-sm text-gray-600">Offline</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="devices">Connected Devices</TabsTrigger>
          <TabsTrigger value="events">Connection Events</TabsTrigger>
          <TabsTrigger value="setup">Hardware Setup</TabsTrigger>
          <TabsTrigger value="testing">Device Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="space-y-6">
          {/* Device List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {devices.map((device) => (
              <Card key={device.deviceId} className="border-2 hover:border-blue-200 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Smartphone className="w-5 h-5" />
                      <span>{device.deviceId}</span>
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      {device.status === 'online' && (
                        <div className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </div>
                      )}
                      <Badge className={`${getStatusColor(device.status)} text-white`}>
                        {device.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{device.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Code className="w-4 h-4 text-gray-500" />
                      <span>v{device.firmwareVersion}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Wifi className="w-4 h-4 text-gray-500" />
                      <span>{getSignalStrength(device.wifiSignal)} ({device.wifiSignal}dBm)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>{new Date(device.lastSeen).toLocaleString()}</span>
                    </div>
                    {device.temperature && (
                      <div className="flex items-center space-x-2">
                        <Thermometer className="w-4 h-4 text-gray-500" />
                        <span>{device.temperature}°C</span>
                      </div>
                    )}
                    {device.batteryLevel && (
                      <div className="flex items-center space-x-2">
                        <Battery className="w-4 h-4 text-gray-500" />
                        <span>{device.batteryLevel}%</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Capabilities:</Label>
                    <div className="flex flex-wrap gap-2">
                      {device.capabilities.map((capability) => (
                        <Badge key={capability} variant="secondary" className="text-xs">
                          {capability.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => diagnosticsMutation.mutate(device.deviceId)}
                      disabled={device.status === 'offline' || diagnosticsMutation.isPending}
                    >
                      <Wrench className="w-4 h-4 mr-2" />
                      Diagnostics
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedDevice(device.deviceId)}
                      disabled={device.status === 'offline'}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Configure
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {devices.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Devices Connected</h3>
                <p className="text-gray-600 mb-4">
                  Connect your ESP32 devices to start monitoring attendance
                </p>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Arduino Code
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Device Configuration Panel */}
          {selectedDevice && (
            <Card>
              <CardHeader>
                <CardTitle>Configure Device: {selectedDevice}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="config">Configuration (JSON)</Label>
                  <Textarea
                    id="config"
                    placeholder={JSON.stringify({
                      pirEnabled: true,
                      rfidEnabled: true,
                      location: "Lab 204",
                      scanInterval: 1000
                    }, null, 2)}
                    value={configMessage}
                    onChange={(e) => setConfigMessage(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => handleConfigUpdate(selectedDevice)}
                    disabled={configMutation.isPending}
                  >
                    {configMutation.isPending ? "Sending..." : "Send Configuration"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDevice(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Broadcast Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Broadcast to All Devices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="broadcast">Message (JSON)</Label>
                <Textarea
                  id="broadcast"
                  placeholder={JSON.stringify({
                    type: "announcement",
                    message: "System maintenance in 5 minutes"
                  }, null, 2)}
                  value={configMessage}
                  onChange={(e) => setConfigMessage(e.target.value)}
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>
              <Button
                onClick={handleBroadcast}
                disabled={broadcastMutation.isPending}
              >
                <Zap className="w-4 h-4 mr-2" />
                {broadcastMutation.isPending ? "Broadcasting..." : "Broadcast Message"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          {/* Real-time Connection Events Log */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span>Real-Time Connection Events</span>
                </CardTitle>
                <Badge variant="secondary" className="animate-pulse">
                  Live Updates
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  Monitor device connections, disconnections, and communication events in real-time. Events auto-refresh every 3 seconds.
                </AlertDescription>
              </Alert>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {connectionEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No connection events yet</p>
                    <p className="text-sm">Events will appear here when devices connect or communicate</p>
                  </div>
                ) : (
                  connectionEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        event.event === 'connected' || event.event === 'registered'
                          ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                          : event.event === 'disconnected'
                          ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                          : event.event === 'error'
                          ? 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800'
                          : 'bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`p-1 rounded-full ${
                            event.event === 'connected' || event.event === 'registered'
                              ? 'bg-green-500'
                              : event.event === 'disconnected'
                              ? 'bg-red-500'
                              : event.event === 'error'
                              ? 'bg-orange-500'
                              : 'bg-blue-500'
                          }`}>
                            {event.event === 'connected' || event.event === 'registered' ? (
                              <CheckCircle className="w-3 h-3 text-white" />
                            ) : event.event === 'disconnected' ? (
                              <WifiOff className="w-3 h-3 text-white" />
                            ) : event.event === 'error' ? (
                              <AlertCircle className="w-3 h-3 text-white" />
                            ) : (
                              <Activity className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm font-medium">{event.deviceId}</span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {event.event.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{event.message}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Connection Health Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wrench className="w-5 h-5" />
                <span>Connection Troubleshooting Guide</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium text-green-700 dark:text-green-400">✓ Device Successfully Connected</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your ESP32 is online and communicating. Look for the green pulse indicator and "online" badge.
                  </p>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium text-orange-700 dark:text-orange-400">⚠ Device Shows Offline</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>Check WiFi connection - ensure ESP32 is connected to your network</li>
                    <li>Verify server URL in ESP32 code matches your deployment URL</li>
                    <li>Check if WebSocket path is set to "/iot"</li>
                    <li>Ensure firewall/security settings allow WebSocket connections</li>
                  </ul>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-medium text-red-700 dark:text-red-400">✗ Device Not Appearing</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li>Verify ESP32 firmware is uploaded and running</li>
                    <li>Check serial monitor for connection errors</li>
                    <li>Ensure WiFi credentials in code are correct</li>
                    <li>Try power cycling the ESP32 device</li>
                  </ul>
                </div>

                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-blue-700 dark:text-blue-400">📡 Connection Health Indicators</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                    <li><strong>Green Pulse:</strong> Device is actively connected and sending heartbeats</li>
                    <li><strong>WiFi Signal:</strong> Excellent (-50dBm), Good (-60dBm), Fair (-70dBm), Poor (&lt;-70dBm)</li>
                    <li><strong>Last Seen:</strong> Shows when device last communicated (should update every 30 seconds)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="space-y-6">
          {/* Hardware Setup Guide */}
          {setupGuide && typeof setupGuide === 'object' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Code className="w-5 h-5" />
                    <span>Hardware Requirements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {setupGuide?.hardwareRequirements && Array.isArray(setupGuide.hardwareRequirements) && setupGuide.hardwareRequirements.map((item: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Wiring Diagram</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">RC522 RFID Module</h4>
                      <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-1">
                        {setupGuide?.wiring?.['RFID RC522'] && Object.entries(setupGuide.wiring['RFID RC522']).map(([pin, connection]) => (
                          <div key={pin} className="flex justify-between">
                            <span className="text-blue-600">{pin}:</span>
                            <span>{connection}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">PIR Motion Sensor</h4>
                      <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm space-y-1">
                        {setupGuide?.wiring?.['PIR HC-SR501'] && Object.entries(setupGuide.wiring['PIR HC-SR501']).map(([pin, connection]) => (
                          <div key={pin} className="flex justify-between">
                            <span className="text-green-600">{pin}:</span>
                            <span>{connection}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Setup Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-3">
                    {setupGuide?.steps && Array.isArray(setupGuide.steps) && setupGuide.steps.map((step: string, index: number) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full text-xs flex items-center justify-center font-medium">
                          {index + 1}
                        </span>
                        <span className="text-sm">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Make sure to update the WiFi credentials and server URL in the Arduino code before uploading to your ESP32 device.
                  Your server URL is: <code className="bg-gray-100 px-2 py-1 rounded">{setupGuide?.configuration?.serverHost || 'Not configured'}</code>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          {/* Device Testing Interface */}
          <Card>
            <CardHeader>
              <CardTitle>Device Testing & Simulation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  Use this interface to test IoT device communication and simulate various scenarios.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Test RFID Scan</Label>
                  <div className="flex space-x-2">
                    <Input placeholder="Enter card UID (e.g., A1B2C3D4)" />
                    <Button variant="outline">Simulate Scan</Button>
                  </div>
                </div>
                <div>
                  <Label>Test Motion Detection</Label>
                  <Button variant="outline" className="w-full">
                    Simulate Motion Event
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}