import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  Settings as SettingsIcon,
  Wifi,
  Mail,
  Clock,
  Activity,
  RefreshCw,
  Save,
  RotateCcw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [settings, setSettings] = useState({
    rfidPort: 'COM3',
    proximityThreshold: 5,
    dualValidation: true,
    autoReconnect: true,
    smtpServer: 'smtp.gmail.com',
    senderEmail: 'clirdec.presence@clsu.edu.ph',
    absenceThreshold: '3-consecutive',
    dailySummary: true,
    lateNotifications: true,
    autoStartBuffer: 5,
    lateThreshold: 15,
    autoEndSessions: true,
    requireProfessorTap: false
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: typeof settings) => {
      // Save each setting individually
      const promises = Object.entries(settingsData).map(([key, value]) => 
        apiRequest('PUT', `/api/settings/${key}`, { 
          value: value.toString(),
          description: `System setting for ${key}`
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "System settings have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Save Failed",
        description: "Failed to save system settings",
        variant: "destructive",
      });
    },
  });

  const resetToDefaults = () => {
    setSettings({
      rfidPort: 'COM3',
      proximityThreshold: 5,
      dualValidation: true,
      autoReconnect: true,
      smtpServer: 'smtp.gmail.com',
      senderEmail: 'clirdec.presence@clsu.edu.ph',
      absenceThreshold: '3-consecutive',
      dailySummary: true,
      lateNotifications: true,
      autoStartBuffer: 5,
      lateThreshold: 15,
      autoEndSessions: true,
      requireProfessorTap: false
    });
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values",
    });
  };

  // Mock system status
  const systemStatus = {
    database: { status: 'connected', color: 'bg-secondary' },
    rfidScanner: { status: 'active', color: 'bg-secondary' },
    proximitySensors: { status: '2/3 active', color: 'bg-accent' },
    emailService: { status: 'operational', color: 'bg-secondary' }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Settings</h1>
          <p className="text-muted-foreground">Configure PRESENCE system parameters and notifications</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hardware Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <SettingsIcon className="mr-2 h-5 w-5" />
              Hardware Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="rfidPort">RFID Scanner Port</Label>
              <Input
                id="rfidPort"
                value={settings.rfidPort}
                onChange={(e) => updateSetting('rfidPort', e.target.value)}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Proximity Sensor Threshold</Label>
              <div className="mt-2 space-y-2">
                <Slider
                  value={[settings.proximityThreshold]}
                  onValueChange={(value) => updateSetting('proximityThreshold', value[0])}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Low</span>
                  <span>Current: {settings.proximityThreshold}</span>
                  <span>High</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="dualValidation">Enable dual validation (RFID + Proximity)</Label>
              <Switch
                id="dualValidation"
                checked={settings.dualValidation}
                onCheckedChange={(checked) => updateSetting('dualValidation', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="autoReconnect">Auto-reconnect on hardware failure</Label>
              <Switch
                id="autoReconnect"
                checked={settings.autoReconnect}
                onCheckedChange={(checked) => updateSetting('autoReconnect', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="smtpServer">SMTP Server</Label>
              <Input
                id="smtpServer"
                value={settings.smtpServer}
                onChange={(e) => updateSetting('smtpServer', e.target.value)}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label htmlFor="senderEmail">Sender Email</Label>
              <Input
                id="senderEmail"
                type="email"
                value={settings.senderEmail}
                onChange={(e) => updateSetting('senderEmail', e.target.value)}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Absence Threshold (for parent alerts)</Label>
              <Select 
                value={settings.absenceThreshold} 
                onValueChange={(value) => updateSetting('absenceThreshold', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3-consecutive">3 consecutive absences</SelectItem>
                  <SelectItem value="5-consecutive">5 consecutive absences</SelectItem>
                  <SelectItem value="3-week">3 absences in a week</SelectItem>
                  <SelectItem value="5-week">5 absences in a week</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="dailySummary">Send daily summary to parents</Label>
              <Switch
                id="dailySummary"
                checked={settings.dailySummary}
                onCheckedChange={(checked) => updateSetting('dailySummary', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="lateNotifications">Send late arrival notifications</Label>
              <Switch
                id="lateNotifications"
                checked={settings.lateNotifications}
                onCheckedChange={(checked) => updateSetting('lateNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Class Session Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Class Session Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="autoStartBuffer">Auto-start buffer time (minutes)</Label>
              <Input
                id="autoStartBuffer"
                type="number"
                min="0"
                max="30"
                value={settings.autoStartBuffer}
                onChange={(e) => updateSetting('autoStartBuffer', parseInt(e.target.value))}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                System will auto-start class this many minutes before scheduled time
              </p>
            </div>
            
            <div>
              <Label htmlFor="lateThreshold">Late threshold (minutes)</Label>
              <Input
                id="lateThreshold"
                type="number"
                min="5"
                max="60"
                value={settings.lateThreshold}
                onChange={(e) => updateSetting('lateThreshold', parseInt(e.target.value))}
                className="mt-2"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="autoEndSessions">Auto-end sessions after scheduled time</Label>
              <Switch
                id="autoEndSessions"
                checked={settings.autoEndSessions}
                onCheckedChange={(checked) => updateSetting('autoEndSessions', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="requireProfessorTap">Require professor card tap to activate</Label>
              <Switch
                id="requireProfessorTap"
                checked={settings.requireProfessorTap}
                onCheckedChange={(checked) => updateSetting('requireProfessorTap', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Monitoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(systemStatus).map(([key, status]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${status.color}`}></div>
                  <span className="font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </div>
                <span className={`font-medium ${
                  status.color === 'bg-secondary' ? 'text-secondary' :
                  status.color === 'bg-accent' ? 'text-accent' : 'text-muted-foreground'
                }`}>
                  {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                </span>
              </div>
            ))}
            
            <Button variant="outline" className="w-full mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh System Status
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Save Settings */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={resetToDefaults}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button 
          onClick={() => saveSettingsMutation.mutate(settings)}
          disabled={saveSettingsMutation.isPending}
        >
          {saveSettingsMutation.isPending ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
