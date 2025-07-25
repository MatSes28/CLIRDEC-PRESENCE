import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserCheck, 
  UserX, 
  TrendingUp, 
  Play, 
  Download, 
  Mail,
  Plus,
  UserPlus,
  LogIn,
  AlertTriangle,
  LogOut,
  Clock,
  Activity,
  Zap,
  BarChart3,
  Calendar,
  Monitor,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Star,
  Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StartSessionModal from "@/components/StartSessionModal";

interface StatCard {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  
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

  const exportReports = async () => {
    try {
      const response = await fetch('/api/reports/export?range=today', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Report Downloaded",
          description: "Today's attendance report has been downloaded."
        });
      } else {
        throw new Error('Failed to export report');
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export reports",
        variant: "destructive"
      });
    }
  };

  const sendNotifications = async () => {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        toast({
          title: "Notifications Sent",
          description: "Parent notifications have been queued for sending."
        });
      } else {
        throw new Error('Failed to send notifications');
      }
    } catch (error: any) {
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send notifications",
        variant: "destructive"
      });
    }
  };

  // Mock data for demonstration
  const mockStats = {
    todayClasses: stats?.todayClasses || 8,
    presentStudents: stats?.presentStudents || 142,
    absentStudents: stats?.absentStudents || 18,
    attendanceRate: stats?.attendanceRate || 88.7,
    activeSessions: stats?.activeSessions || 3,
    totalStudents: stats?.totalStudents || 160,
    avgSessionTime: stats?.avgSessionTime || '2.3h',
    systemUptime: stats?.systemUptime || '99.8%'
  };

  const statCards: StatCard[] = [
    {
      title: "Active Sessions",
      value: mockStats.activeSessions,
      change: "+2 from yesterday",
      trend: "up",
      icon: Activity,
      color: "primary",
      description: "Currently running classes"
    },
    {
      title: "Present Students", 
      value: mockStats.presentStudents,
      change: `+${((mockStats.presentStudents / mockStats.totalStudents) * 100).toFixed(1)}%`,
      trend: "up",
      icon: UserCheck,
      color: "success",
      description: "Students checked in today"
    },
    {
      title: "Attendance Rate",
      value: `${mockStats.attendanceRate}%`,
      change: "+2.3% vs last week",
      trend: "up", 
      icon: Target,
      color: "accent",
      description: "Overall attendance performance"
    },
    {
      title: "System Status",
      value: mockStats.systemUptime,
      change: "All systems operational",
      trend: "neutral",
      icon: Zap,
      color: "warning",
      description: "Network uptime"
    }
  ];

  const recentActivities = [
    {
      id: 1,
      type: 'check-in',
      student: 'Maria Santos',
      subject: 'Database Management Systems',
      time: '2 minutes ago',
      timestamp: '10:28 AM',
      computer: 'PC-04'
    },
    {
      id: 2,
      type: 'late',
      student: 'John Doe', 
      subject: 'Programming Logic',
      time: '5 minutes ago',
      timestamp: '10:25 AM',
      computer: 'PC-12'
    },
    {
      id: 3,
      type: 'check-out',
      student: 'Anna Cruz',
      subject: 'Data Structures',
      time: '8 minutes ago',
      timestamp: '10:22 AM',
      computer: 'PC-08'
    },
    {
      id: 4,
      type: 'check-in',
      student: 'Carlos Reyes',
      subject: 'Web Development',
      time: '12 minutes ago',
      timestamp: '10:18 AM',
      computer: 'PC-15'
    }
  ];

  const quickActions = [
    {
      title: "Start Session",
      description: "Begin new class session",
      icon: Play,
      action: () => setShowStartSessionModal(true),
      color: "primary"
    },
    {
      title: "Export Reports",
      description: "Download today's data",
      icon: Download,
      action: exportReports,
      color: "accent"
    },
    {
      title: "Send Alerts",
      description: "Notify parents",
      icon: Mail,
      action: sendNotifications,
      color: "warning"
    }
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card-modern p-6 animate-pulse">
              <div className="h-20 bg-muted/50 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl gradient-primary p-8 text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-white/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Good Morning! 👋</h1>
              <p className="text-white/80 text-lg">Here's what's happening in your attendance system today</p>
            </div>
            <div className="text-right">
              <div className="text-white/60 text-sm mono uppercase tracking-wider">Live Status</div>
              <div className="text-2xl font-bold">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div 
              key={card.title} 
              className={`card-elevated p-6 group animate-fade-in-up stagger-${index + 1}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl transition-all duration-300 group-hover:scale-110 ${
                  card.color === 'primary' ? 'bg-primary/10' :
                  card.color === 'success' ? 'bg-success/10' :
                  card.color === 'accent' ? 'bg-accent/10' :
                  card.color === 'warning' ? 'bg-warning/10' : 'bg-muted'
                }`}>
                  <Icon className={`h-6 w-6 ${
                    card.color === 'primary' ? 'text-primary' :
                    card.color === 'success' ? 'text-success' :
                    card.color === 'accent' ? 'text-accent' :
                    card.color === 'warning' ? 'text-warning' : 'text-muted-foreground'
                  }`} />
                </div>
                <div className="flex items-center space-x-1">
                  {card.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-success" />}
                  {card.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-destructive" />}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <p className="text-3xl font-bold text-foreground">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className={`text-xs font-medium ${
                  card.trend === 'up' ? 'text-success' :
                  card.trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
                }`}>
                  {card.change}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card-elevated p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Quick Actions</h2>
          </div>
          <div className="space-y-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  onClick={action.action}
                  className="w-full p-4 rounded-2xl border border-border/50 hover:border-primary/50 transition-all duration-200 group hover:scale-[1.02] text-left"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${
                      action.color === 'primary' ? 'bg-primary/10 group-hover:bg-primary/20' :
                      action.color === 'accent' ? 'bg-accent/10 group-hover:bg-accent/20' :
                      action.color === 'warning' ? 'bg-warning/10 group-hover:bg-warning/20' : 'bg-muted'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        action.color === 'primary' ? 'text-primary' :
                        action.color === 'accent' ? 'text-accent' :
                        action.color === 'warning' ? 'text-warning' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{action.title}</div>
                      <div className="text-sm text-muted-foreground">{action.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 card-elevated p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-accent/10">
                <Clock className="h-5 w-5 text-accent" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Live Activity Feed</h2>
            </div>
            <Badge className="status-indicator status-online">Live</Badge>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div 
                key={activity.id} 
                className={`flex items-center space-x-4 p-4 rounded-2xl border border-border/30 hover:border-border/60 transition-all duration-200 animate-fade-in-up stagger-${index + 1}`}
              >
                <div className={`p-2 rounded-xl ${
                  activity.type === 'check-in' ? 'bg-success/10' :
                  activity.type === 'check-out' ? 'bg-accent/10' :
                  activity.type === 'late' ? 'bg-warning/10' : 'bg-muted'
                }`}>
                  {activity.type === 'check-in' && <LogIn className="h-4 w-4 text-success" />}
                  {activity.type === 'check-out' && <LogOut className="h-4 w-4 text-accent" />}
                  {activity.type === 'late' && <AlertTriangle className="h-4 w-4 text-warning" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{activity.student}</p>
                  <p className="text-sm text-muted-foreground truncate">{activity.subject}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{activity.timestamp}</p>
                  <p className="text-xs text-muted-foreground mono">{activity.computer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showStartSessionModal && (
        <StartSessionModal
          open={showStartSessionModal}
          onClose={() => setShowStartSessionModal(false)}
        />
      )}
    </div>
  );
}