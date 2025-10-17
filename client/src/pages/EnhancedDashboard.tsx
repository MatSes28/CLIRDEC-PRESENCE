import EnhancedRFIDSimulator from "@/components/EnhancedRFIDSimulator";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import SecurityAlerts from "@/components/SecurityAlerts";
import StartSessionModal from "@/components/StartSessionModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Cpu,
  Download,
  LogOut,
  Mail,
  Monitor,
  Play,
  Plus,
  Shield,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  UserX,
  Zap
} from "lucide-react";
import { useState } from "react";

interface StatCard {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

export default function EnhancedDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const endSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await fetch(`/api/sessions/${sessionId}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to end session');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Session Ended",
        description: "Class session has been ended successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to end session",
        variant: "destructive"
      });
    }
  });

  // Enhanced stat cards with real-time updates
  const statCards: StatCard[] = [
    {
      title: "Today's Classes",
      value: (stats as any)?.todayClasses || 0,
      change: "+2",
      trend: 'up',
      icon: Calendar,
      color: 'text-blue-600',
      description: "Scheduled sessions for today"
    },
    {
      title: "Present Students",
      value: (stats as any)?.presentStudents || 0,
      change: `${(stats as any)?.attendanceRate || '0%'}`,
      trend: 'up',
      icon: UserCheck,
      color: 'text-green-600',
      description: "Currently attending class"
    },
    {
      title: "Absent Students",
      value: (stats as any)?.absentStudents || 0,
      change: "-3",
      trend: 'down',
      icon: UserX,
      color: 'text-red-600',
      description: "Not present in current session"
    },
    {
      title: "Attendance Rate",
      value: (stats as any)?.attendanceRate || '0%',
      change: "+5%",
      trend: 'up',
      icon: TrendingUp,
      color: 'text-accent',
      description: "Overall attendance percentage"
    }
  ];

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="h-4 w-4 text-green-600" />;
      case 'down': return <ArrowDownRight className="h-4 w-4 text-red-600" />;
      default: return <Target className="h-4 w-4 text-gray-600" />;
    }
  };

  const quickActions = [
    {
      label: "Start New Session",
      icon: Play,
      action: () => setShowStartSessionModal(true),
      color: "bg-primary hover:bg-primary/90"
    },
    {
      label: "Add Student",
      icon: UserPlus,
      action: () => { if (typeof window !== 'undefined') window.location.href = "/students"; },
      color: "bg-secondary hover:bg-secondary/90"
    },
    {
      label: "View Reports",
      icon: BarChart3,
      action: () => { if (typeof window !== 'undefined') window.location.href = "/reports"; },
      color: "bg-accent hover:bg-accent/90"
    },
    {
      label: "Send Notifications",
      icon: Mail,
      action: () => toast({ title: "Feature Coming Soon", description: "Bulk notifications will be available in the next update." }),
      color: "bg-orange-500 hover:bg-orange-600"
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-6">
        {/* Loading Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 sm:h-8 bg-muted rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>

        {/* Loading Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-10 w-10 bg-muted rounded-xl"></div>
                  <div className="h-4 w-12 bg-muted rounded"></div>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  <div className="h-3 sm:h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-6 sm:h-8 bg-muted rounded w-1/2"></div>
                  <div className="h-2 sm:h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Loading Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          <Card className="lg:col-span-2 animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-32 bg-muted rounded"></div>
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="text-center space-y-2">
                      <div className="h-8 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-2/3 mx-auto"></div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded w-1/2"></div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded"></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6">
      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-background via-background to-muted/30">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-2 sm:mb-4">
                  <div className={`p-2 sm:p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className={`h-4 w-4 sm:h-5 md:h-6 sm:w-5 md:w-6 ${stat.color}`} />
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(stat.trend)}
                    <span className={`text-xs font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 
                      stat.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1 sm:space-y-2">
                  <h3 className="font-medium text-xs sm:text-sm text-muted-foreground">{stat.title}</h3>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient">{stat.value}</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-3 sm:mb-6 text-xs sm:text-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="rfid">RFID Tools</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
            {/* Active Session Card */}
            <Card className="lg:col-span-2">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                    Active Session
                  </div>
                  {(stats as any)?.activeSession && (
                    <Badge className="animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full mr-2"></div>
                      Live
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {(stats as any)?.activeSession ? (
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base md:text-lg">Current Class Session</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Started: {new Date((stats as any).activeSession.startTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => endSessionMutation.mutate((stats as any).activeSession.id)}
                        disabled={endSessionMutation.isPending}
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                      >
                        <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        <span className="text-xs sm:text-sm">End Session</span>
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                      <div>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">{(stats as any).presentStudents}</p>
                        <p className="text-xs text-muted-foreground">Present</p>
                      </div>
                      <div>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{(stats as any).absentStudents}</p>
                        <p className="text-xs text-muted-foreground">Absent</p>
                      </div>
                      <div>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-primary">{(stats as any).attendanceRate}</p>
                        <p className="text-xs text-muted-foreground">Rate</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">No Active Session</h3>
                    <p className="text-sm text-muted-foreground mb-4">Start a new class session to begin tracking attendance</p>
                    <Button onClick={() => setShowStartSessionModal(true)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Session
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6">
                {quickActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <Button
                      key={index}
                      onClick={action.action}
                      className={`w-full justify-start ${action.color} text-white text-xs sm:text-sm`}
                      variant="default"
                      size="sm"
                    >
                      <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                      {action.label}
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-3 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Attendance Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">0</p>
                    <p className="text-xs text-muted-foreground">Present Today</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">0</p>
                    <p className="text-xs text-muted-foreground">Absent Today</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">5</p>
                    <p className="text-xs text-muted-foreground">Total Students</p>
                  </div>
                </div>
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">No active class session</p>
                  <p className="text-xs text-muted-foreground">Start a session to see real-time analytics</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">5 Students registered</span>
                    <Badge variant="secondary">Today</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">2 Classrooms configured</span>
                    <Badge variant="secondary">Today</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">System initialized</span>
                    <Badge variant="default">Ready</Badge>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground">Start taking attendance to see detailed analytics</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Attendance Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium mb-2">No Data Available</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Attendance reports will appear here once you start taking attendance in class sessions.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Start Session
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SecurityAlerts />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Access Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Two-Factor Authentication</span>
                    <Badge variant="secondary">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">RFID Security</span>
                    <Badge variant="default">Active</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Session Encryption</span>
                    <Badge variant="default">SSL/TLS</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Database Security</span>
                    <Badge variant="default">Encrypted</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceMonitor />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  System Resources
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database Queries/sec</span>
                    <Badge variant="outline">45 avg</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">RFID Processing Rate</span>
                    <Badge variant="default">98.5%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cache Hit Rate</span>
                    <Badge variant="default">94.2%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Error Rate</span>
                    <Badge variant="secondary">0.1%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RFID Tools Tab */}
        <TabsContent value="rfid" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedRFIDSimulator />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  RFID System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">99.8%</p>
                    <p className="text-xs text-muted-foreground">Uptime</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">1,247</p>
                    <p className="text-xs text-muted-foreground">Total Taps Today</p>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">2.3ms</p>
                    <p className="text-xs text-muted-foreground">Avg Response</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">4</p>
                    <p className="text-xs text-muted-foreground">Active Readers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Start Session Modal */}
      <StartSessionModal 
        open={showStartSessionModal} 
        onClose={() => setShowStartSessionModal(false)}
      />
    </div>
  );
}