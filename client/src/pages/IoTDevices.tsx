import { IoTDeviceManager } from "@/components/IoTDeviceManager";

export default function IoTDevicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">IoT Device Management</h1>
        <p className="text-muted-foreground">
          Monitor and manage ESP32 devices for real-time attendance tracking
        </p>
      </div>
      
      <IoTDeviceManager />
    </div>
  );
}