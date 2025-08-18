import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Wifi, 
  WifiOff, 
  Smartphone, 
  Activity, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Thermometer,
  Battery,
  Signal
} from "lucide-react";

interface IoTDevice {
  deviceId: string;
  classroomId: number;
  type: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: string;
  ipAddress?: string;
  macAddress?: string;
  firmwareVersion?: string;
  capabilities: string[];
  batteryLevel?: number;
  temperature?: number;
  humidity?: number;
}

interface IoTDevicesResponse {
  devices: IoTDevice[];
  total: number;
  online: number;
  offline: number;
}

export function IoTDeviceManager() {
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['/api/iot/devices'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: setupGuide } = useQuery({
    queryKey: ['/api/iot/setup-guide'],
  });

  const devices = (devicesData as IoTDevicesResponse)?.devices || [];
  const stats = devicesData as IoTDevicesResponse;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            IoT Device Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading devices...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          IoT Device Manager
        </CardTitle>
        {stats && (
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Online: {stats.online}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm">Offline: {stats.offline}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm">Total: {stats.total}</span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="devices" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="devices">Connected Devices</TabsTrigger>
            <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-4">
            {devices.length === 0 ? (
              <div className="text-center py-8">
                <Smartphone className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">No IoT Devices Connected</h3>
                <p className="text-muted-foreground">
                  Connect your ESP32 devices to start monitoring attendance
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {devices.map((device) => (
                    <DeviceCard 
                      key={device.deviceId} 
                      device={device}
                      isSelected={selectedDevice === device.deviceId}
                      onSelect={() => setSelectedDevice(device.deviceId)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="setup" className="space-y-4">
            {setupGuide && <SetupGuide guide={setupGuide as any} />}
          </TabsContent>

          <TabsContent value="diagnostics" className="space-y-4">
            <div className="text-center py-8">
              <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Device Diagnostics</h3>
              <p className="text-muted-foreground mb-4">
                Select a device to view detailed diagnostics
              </p>
              {selectedDevice && (
                <Button>
                  Request Diagnostics for {selectedDevice}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function DeviceCard({ 
  device, 
  isSelected, 
  onSelect 
}: { 
  device: IoTDevice;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const getStatusIcon = () => {
    switch (device.status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (device.status) {
      case 'online': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'offline': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
    }
  };

  return (
    <div 
      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">{device.deviceId}</span>
        </div>
        <Badge className={getStatusColor()}>
          {device.status}
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
        <div>
          <span className="font-medium">Classroom:</span> Lab {device.classroomId}
        </div>
        <div>
          <span className="font-medium">Type:</span> {device.type}
        </div>
        
        {device.batteryLevel && (
          <div className="flex items-center gap-1">
            <Battery className="h-3 w-3" />
            {device.batteryLevel}%
          </div>
        )}
        
        {device.temperature && (
          <div className="flex items-center gap-1">
            <Thermometer className="h-3 w-3" />
            {device.temperature}°C
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(device.lastSeen).toLocaleTimeString()}
        </div>
        
        {device.ipAddress && (
          <div className="flex items-center gap-1">
            <Signal className="h-3 w-3" />
            {device.ipAddress}
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1 mt-2">
        {device.capabilities.map((cap) => (
          <Badge key={cap} variant="outline" className="text-xs">
            {cap.replace('_', ' ')}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function SetupGuide({ guide }: { guide: any }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-3">Hardware Requirements</h3>
        <ul className="list-disc pl-6 space-y-1">
          {guide.hardwareRequirements?.map((item: string, index: number) => (
            <li key={index} className="text-sm">{item}</li>
          ))}
        </ul>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Wiring Diagram</h3>
        <div className="grid gap-4">
          {Object.entries(guide.wiring || {}).map(([component, connections]) => (
            <Card key={component}>
              <CardHeader>
                <CardTitle className="text-sm">{component}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(connections as Record<string, string>).map(([pin, connection]) => (
                    <div key={pin} className="flex justify-between">
                      <span className="font-mono text-xs">{pin}</span>
                      <span className="text-muted-foreground">{connection}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-3">Setup Steps</h3>
        <ol className="list-decimal pl-6 space-y-2">
          {guide.steps?.map((step: string, index: number) => (
            <li key={index} className="text-sm">{step}</li>
          ))}
        </ol>
      </div>
      
      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-medium mb-2">Configuration</h4>
        <div className="space-y-2 text-sm font-mono">
          <div>Server: {guide.configuration?.serverHost}</div>
          <div>Port: {guide.configuration?.serverPort}</div>
          <div>Path: {guide.configuration?.serverPath}</div>
        </div>
      </div>
    </div>
  );
}