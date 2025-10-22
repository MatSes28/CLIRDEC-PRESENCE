import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Settings as SettingsIcon,
  Mail,
  Clock,
  Save,
  RotateCcw
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const [settings, setSettings] = useState({
    senderEmail: 'clirdec.presence@clsu.edu.ph',
    dailySummary: true,
    lateNotifications: true,
    lateThreshold: 15,
    absenceAlerts: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Faculty can only view settings, not modify them
  const isReadOnly = user?.role === 'faculty';

  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: typeof settings) => {
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
      senderEmail: 'clirdec.presence@clsu.edu.ph',
      dailySummary: true,
      lateNotifications: true,
      lateThreshold: 15,
      absenceAlerts: true
    });
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default values",
    });
  };

  const updateSetting = (key: string, value: any) => {
    if (!isReadOnly) {
      setSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleSave = () => {
    if (!isReadOnly) {
      saveSettingsMutation.mutate(settings);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">
            {isReadOnly ? 'System Settings' : 'System Configuration'}
          </h1>
          <p className="text-muted-foreground">
            {isReadOnly 
              ? 'View PRESENCE system settings' 
              : 'Configure PRESENCE system parameters and notifications'}
          </p>
        </div>
        {!isReadOnly && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={resetToDefaults}
              disabled={saveSettingsMutation.isPending}
              data-testid="button-reset-settings"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="mr-2 h-4 w-4" />
              {saveSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Mail className="mr-2 h-5 w-5" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="senderEmail">Sender Email Address</Label>
              <Input
                id="senderEmail"
                type="email"
                value={settings.senderEmail}
                onChange={(e) => updateSetting('senderEmail', e.target.value)}
                className="mt-2"
                placeholder="clirdec.presence@clsu.edu.ph"
                disabled={isReadOnly}
                data-testid="input-sender-email"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Email address used to send parent notifications
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="absenceAlerts">Absence Alerts to Parents</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send alerts when students are absent
                </p>
              </div>
              <Switch
                id="absenceAlerts"
                checked={settings.absenceAlerts}
                onCheckedChange={(checked) => updateSetting('absenceAlerts', checked)}
                disabled={isReadOnly}
                data-testid="switch-absence-alerts"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="lateNotifications">Late Arrival Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Notify parents when students arrive late
                </p>
              </div>
              <Switch
                id="lateNotifications"
                checked={settings.lateNotifications}
                onCheckedChange={(checked) => updateSetting('lateNotifications', checked)}
                disabled={isReadOnly}
                data-testid="switch-late-notifications"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dailySummary">Daily Summary Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Send daily attendance summaries
                </p>
              </div>
              <Switch
                id="dailySummary"
                checked={settings.dailySummary}
                onCheckedChange={(checked) => updateSetting('dailySummary', checked)}
                disabled={isReadOnly}
                data-testid="switch-daily-summary"
              />
            </div>
          </CardContent>
        </Card>

        {/* Session Timing Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Clock className="mr-2 h-5 w-5" />
              Session Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="lateThreshold">Late Arrival Threshold (minutes)</Label>
              <Input
                id="lateThreshold"
                type="number"
                min="5"
                max="30"
                value={settings.lateThreshold}
                onChange={(e) => updateSetting('lateThreshold', parseInt(e.target.value) || 15)}
                className="mt-2"
                disabled={isReadOnly}
                data-testid="input-late-threshold"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Minutes after class start time to mark student as late
              </p>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-2">CLIRDEC Deployment</h3>
              <p className="text-sm text-muted-foreground">
                This system is deployed for CLIRDEC building with support for:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>2 Lecture Classrooms</li>
                <li>2 Laboratory Classrooms</li>
                <li>RFID-based attendance tracking</li>
                <li>Automated parent email notifications</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base sm:text-lg">
            <SettingsIcon className="mr-2 h-5 w-5" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">System Name</p>
              <p className="font-medium">CLIRDEC: PRESENCE</p>
            </div>
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium">Information Technology</p>
            </div>
            <div>
              <p className="text-muted-foreground">Building</p>
              <p className="font-medium">CLIRDEC</p>
            </div>
            <div>
              <p className="text-muted-foreground">Institution</p>
              <p className="font-medium">Central Luzon State University</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
