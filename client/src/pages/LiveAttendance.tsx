import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  RefreshCw, 
  Wifi, 
  Users, 
  Monitor,
  Phone,
  IdCard
} from "lucide-react";
import RFIDSimulator from "@/components/RFIDSimulator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function LiveAttendance() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activeSession } = useQuery({
    queryKey: ['/api/sessions/active'],
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['/api/attendance', activeSession?.id],
    enabled: !!activeSession?.id,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('GET', '/api/sessions/active');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      toast({
        title: "Refreshed",
        description: "Attendance data has been updated",
      });
    },
  });

  const handleRFIDTap = async (rfidCardId: string) => {
    if (!activeSession) {
      toast({
        title: "No Active Session",
        description: "Please start a class session first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest('POST', '/api/rfid/simulate', {
        rfidCardId,
        sessionId: activeSession.id
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "RFID Tap Processed",
          description: result.message,
        });
        
        // Refresh attendance data
        queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      } else {
        toast({
          title: "RFID Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process RFID tap",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-secondary text-secondary-foreground';
      case 'late': return 'bg-accent text-accent-foreground';
      case 'absent': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Mock student data for current session
  const mockStudents = [
    {
      id: 1,
      name: 'Maria Santos',
      studentId: '2021-IT-001',
      year: '3rd Year IT',
      status: 'present',
      checkInTime: '10:02 AM',
      computer: 'PC-12',
      profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b68fad91?w=100&h=100&fit=crop&crop=face'
    },
    {
      id: 2,
      name: 'Juan Dela Cruz',
      studentId: '2021-IT-002',
      year: '3rd Year IT',
      status: 'late',
      checkInTime: '10:15 AM',
      computer: 'PC-08',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face'
    },
    {
      id: 3,
      name: 'Anna Rodriguez',
      studentId: '2021-IT-003',
      year: '3rd Year IT',
      status: 'absent',
      checkInTime: '--',
      computer: '--',
      profileImage: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* RFID Scanner Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live Attendance Monitoring</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-secondary/10 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-secondary">RFID Scanner Active</span>
              </div>
              <Button 
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                size="sm"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* RFID Scanner Simulation */}
          <RFIDSimulator onRFIDTap={handleRFIDTap} />
        </CardContent>
      </Card>

      {/* Live Attendance Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Session: Database Management Systems</CardTitle>
              <div className="flex items-center space-x-4 mt-2">
                <span className="text-sm text-muted-foreground">Room: Lab 204</span>
                <Badge className="bg-secondary text-secondary-foreground">Active</Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="grid grid-cols-6 gap-4 py-3 px-6 bg-muted/50 rounded-t-lg text-sm font-medium text-muted-foreground">
                <div>Student</div>
                <div>Student ID</div>
                <div>Status</div>
                <div>Check-in Time</div>
                <div>Computer</div>
                <div>Actions</div>
              </div>
              
              <div className="divide-y divide-border">
                {mockStudents.map((student) => (
                  <div key={student.id} className="grid grid-cols-6 gap-4 py-4 px-6 items-center">
                    <div className="flex items-center space-x-3">
                      <img 
                        src={student.profileImage} 
                        alt={student.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium">{student.name}</div>
                        <div className="text-sm text-muted-foreground">{student.year}</div>
                      </div>
                    </div>
                    
                    <div className="font-mono text-sm">{student.studentId}</div>
                    
                    <div>
                      <Badge className={getStatusColor(student.status)}>
                        {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="font-mono text-sm">{student.checkInTime}</div>
                    <div className="font-mono text-sm">{student.computer}</div>
                    
                    <div className="flex space-x-2">
                      {student.status === 'present' || student.status === 'late' ? (
                        <Button size="sm" variant="outline">
                          <Monitor className="mr-1 h-3 w-3" />
                          Monitor
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline">
                          <Phone className="mr-1 h-3 w-3" />
                          Contact
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
