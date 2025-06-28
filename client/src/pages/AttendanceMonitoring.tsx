import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertTriangle, 
  TrendingDown, 
  Mail, 
  Settings,
  PlayCircle,
  Shield,
  Clock,
  Users,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AttendanceBehavior {
  studentId: number;
  attendanceRate: number;
  consecutiveAbsences: number;
  lateArrivalsThisWeek: number;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  behaviorLevel: 'excellent' | 'good' | 'average' | 'concerning' | 'critical';
  requiresAlert: boolean;
  alertReason: string[];
  student: {
    id: number;
    name: string;
    studentId: string;
    parentEmail: string;
    email: string;
  };
}

export default function AttendanceMonitoring() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState({
    enabled: true,
    thresholds: {
      critical: 50,
      concerning: 60,
      consecutiveAbsences: 3,
      lateArrivalsWeekly: 3
    },
    notifications: {
      cooldownDays: 7,
      checkInterval: 6
    }
  });

  // Get attendance behavior analysis
  const { data: behaviorAnalysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ['/api/attendance/behavior-analysis'],
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  // Get alerts
  const { data: alerts } = useQuery({
    queryKey: ['/api/attendance/alerts']
  });

  // Get monitoring settings
  const { data: monitoringSettings } = useQuery({
    queryKey: ['/api/settings/attendance-monitoring'],
    onSuccess: (data) => {
      if (data) {
        setSettings({
          enabled: data.enabled?.value === 'true',
          thresholds: {
            critical: parseInt(data.thresholds.critical?.value || '50'),
            concerning: parseInt(data.thresholds.concerning?.value || '60'),
            consecutiveAbsences: parseInt(data.thresholds.consecutiveAbsences?.value || '3'),
            lateArrivalsWeekly: parseInt(data.thresholds.lateArrivalsWeekly?.value || '3')
          },
          notifications: {
            cooldownDays: parseInt(data.notifications.cooldownDays?.value || '7'),
            checkInterval: parseInt(data.notifications.checkInterval?.value || '6')
          }
        });
      }
    }
  });

  // Trigger manual monitoring
  const triggerMonitoringMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/attendance/trigger-monitoring');
    },
    onSuccess: () => {
      toast({
        title: "Monitoring Triggered",
        description: "Automated attendance monitoring has been executed successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/behavior-analysis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/alerts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed",
        description: error.message || "Failed to trigger monitoring",
        variant: "destructive"
      });
    }
  });

  // Update settings
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      await apiRequest('PUT', '/api/settings/attendance-monitoring', newSettings);
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Monitoring settings have been saved successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings/attendance-monitoring'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed",
        description: error.message || "Failed to update settings",
        variant: "destructive"
      });
    }
  });

  const getBehaviorBadge = (level: string) => {
    const variants = {
      excellent: 'bg-secondary text-secondary-foreground',
      good: 'bg-blue-100 text-blue-800',
      average: 'bg-yellow-100 text-yellow-800',
      concerning: 'bg-orange-100 text-orange-800',
      critical: 'bg-destructive text-destructive-foreground'
    };
    
    return (
      <Badge className={variants[level as keyof typeof variants] || 'bg-muted'}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </Badge>
    );
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  const criticalStudents = behaviorAnalysis?.filter((b: AttendanceBehavior) => b.behaviorLevel === 'critical') || [];
  const concerningStudents = behaviorAnalysis?.filter((b: AttendanceBehavior) => b.behaviorLevel === 'concerning') || [];
  const studentsRequiringAlerts = behaviorAnalysis?.filter((b: AttendanceBehavior) => b.requiresAlert) || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Automated Attendance Monitoring</h1>
          <p className="text-muted-foreground">Monitor student attendance patterns and send automated alerts</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={() => triggerMonitoringMutation.mutate()}
            disabled={triggerMonitoringMutation.isPending}
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {triggerMonitoringMutation.isPending ? "Running..." : "Run Check"}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Cases</p>
                <p className="text-2xl font-bold text-destructive">{criticalStudents.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Concerning</p>
                <p className="text-2xl font-bold text-orange-600">{concerningStudents.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alerts Required</p>
                <p className="text-2xl font-bold text-accent">{studentsRequiringAlerts.length}</p>
              </div>
              <Mail className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl font-bold">{behaviorAnalysis?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analysis">Behavior Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Alert History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Student Attendance Behavior Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAnalysis ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse flex space-x-4">
                      <div className="rounded-full bg-muted h-12 w-12"></div>
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-4 bg-muted rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {behaviorAnalysis?.map((behavior: AttendanceBehavior) => (
                    <div key={behavior.studentId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h3 className="font-medium">{behavior.student.name}</h3>
                            <p className="text-sm text-muted-foreground">{behavior.student.studentId}</p>
                          </div>
                          {getBehaviorBadge(behavior.behaviorLevel)}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold">{behavior.attendanceRate.toFixed(1)}%</p>
                          <p className="text-sm text-muted-foreground">Attendance Rate</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div className="text-center">
                          <p className="text-lg font-semibold">{behavior.totalClasses}</p>
                          <p className="text-xs text-muted-foreground">Total Classes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-secondary">{behavior.presentCount}</p>
                          <p className="text-xs text-muted-foreground">Present</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-destructive">{behavior.absentCount}</p>
                          <p className="text-xs text-muted-foreground">Absent</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-accent">{behavior.lateCount}</p>
                          <p className="text-xs text-muted-foreground">Late</p>
                        </div>
                      </div>

                      {behavior.requiresAlert && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="text-sm font-medium text-destructive">Alert Required</span>
                          </div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {behavior.alertReason.map((reason, index) => (
                              <li key={index}>• {reason}</li>
                            ))}
                          </ul>
                          <div className="mt-2 text-xs text-muted-foreground">
                            Parent: {behavior.student.parentEmail}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Alert History & Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Pending Alerts</p>
                    <p className="text-sm text-muted-foreground">{alerts?.pending?.length || 0} alerts queued for sending</p>
                  </div>
                  <Badge variant="outline">{alerts?.pending?.length || 0}</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Sent Alerts</p>
                    <p className="text-sm text-muted-foreground">{alerts?.sent?.length || 0} alerts sent successfully</p>
                  </div>
                  <Badge variant="secondary">{alerts?.sent?.length || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Monitoring Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Automated Monitoring</Label>
                  <p className="text-sm text-muted-foreground">Enable automatic attendance behavior monitoring</p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({...settings, enabled: checked})}
                />
              </div>

              {/* Thresholds */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Alert Thresholds</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Critical Attendance Rate (%)</Label>
                    <Input
                      type="number"
                      value={settings.thresholds.critical}
                      onChange={(e) => setSettings({
                        ...settings,
                        thresholds: {...settings.thresholds, critical: parseInt(e.target.value)}
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Concerning Attendance Rate (%)</Label>
                    <Input
                      type="number"
                      value={settings.thresholds.concerning}
                      onChange={(e) => setSettings({
                        ...settings,
                        thresholds: {...settings.thresholds, concerning: parseInt(e.target.value)}
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Consecutive Absences</Label>
                    <Input
                      type="number"
                      value={settings.thresholds.consecutiveAbsences}
                      onChange={(e) => setSettings({
                        ...settings,
                        thresholds: {...settings.thresholds, consecutiveAbsences: parseInt(e.target.value)}
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Late Arrivals per Week</Label>
                    <Input
                      type="number"
                      value={settings.thresholds.lateArrivalsWeekly}
                      onChange={(e) => setSettings({
                        ...settings,
                        thresholds: {...settings.thresholds, lateArrivalsWeekly: parseInt(e.target.value)}
                      })}
                    />
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Alert Cooldown (Days)</Label>
                    <Input
                      type="number"
                      value={settings.notifications.cooldownDays}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {...settings.notifications, cooldownDays: parseInt(e.target.value)}
                      })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Check Interval (Hours)</Label>
                    <Input
                      type="number"
                      value={settings.notifications.checkInterval}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: {...settings.notifications, checkInterval: parseInt(e.target.value)}
                      })}
                    />
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleSaveSettings}
                disabled={updateSettingsMutation.isPending}
                className="w-full"
              >
                {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}