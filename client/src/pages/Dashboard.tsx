import { useQuery } from "@tanstack/react-query";
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
  Settings, 
  Mail,
  Plus,
  UserPlus,
  LogIn,
  AlertTriangle,
  LogOut,
  Clock
} from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const recentActivities = [
    {
      id: 1,
      type: 'check-in',
      student: 'Maria Santos',
      subject: 'Database Management Systems',
      time: '2 minutes ago',
      timestamp: '10:28 AM'
    },
    {
      id: 2,
      type: 'late',
      student: 'John Doe',
      subject: 'Programming Logic',
      time: '5 minutes ago',
      timestamp: '10:25 AM'
    },
    {
      id: 3,
      type: 'check-out',
      student: 'Anna Cruz',
      subject: 'Data Structures',
      time: '8 minutes ago',
      timestamp: '10:22 AM'
    }
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Classes</p>
                <p className="text-3xl font-bold">{stats?.todayClasses || 0}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Present Students</p>
                <p className="text-3xl font-bold text-secondary">{stats?.presentStudents || 0}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded-lg">
                <UserCheck className="h-6 w-6 text-secondary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Absent Students</p>
                <p className="text-3xl font-bold text-destructive">{stats?.absentStudents || 0}</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg">
                <UserX className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                <p className="text-3xl font-bold text-accent">{stats?.attendanceRate || '0%'}</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Class Status & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Class</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.activeSession ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-secondary/10 rounded-full mx-auto flex items-center justify-center">
                  <Play className="h-8 w-8 text-secondary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Database Management Systems</h3>
                  <p className="text-muted-foreground mb-4">Room: Lab 204 | Time: 10:00 AM - 12:00 PM</p>
                  
                  <div className="bg-secondary/5 rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Session Duration</span>
                      <Badge variant="secondary">32 minutes</Badge>
                    </div>
                    <div className="w-full bg-secondary/20 rounded-full h-2">
                      <div className="bg-secondary h-2 rounded-full w-1/3"></div>
                    </div>
                  </div>
                  
                  <Button variant="destructive" className="w-full">
                    <Play className="mr-2 h-4 w-4" />
                    End Class Session
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Session</h3>
                <p className="text-muted-foreground mb-4">Start a new class session when ready</p>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Start New Class Session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Start New Class Session
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Download className="mr-2 h-4 w-4" />
                Export Today's Reports
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Hardware Settings
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Mail className="mr-2 h-4 w-4" />
                Send Parent Notifications
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activity.type === 'check-in' ? 'bg-secondary/10' : 
                  activity.type === 'late' ? 'bg-accent/10' : 'bg-destructive/10'
                }`}>
                  {activity.type === 'check-in' && <LogIn className="h-5 w-5 text-secondary" />}
                  {activity.type === 'late' && <AlertTriangle className="h-5 w-5 text-accent" />}
                  {activity.type === 'check-out' && <LogOut className="h-5 w-5 text-destructive" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium">
                    {activity.type === 'check-in' && `${activity.student} checked in`}
                    {activity.type === 'late' && `Late arrival detected`}
                    {activity.type === 'check-out' && `${activity.student} checked out`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.subject} - {activity.time}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
