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

  // Use real attendance data from API or display empty state
  const displayStudents = attendance?.length > 0 ? attendance : [];

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
                {displayStudents.length > 0 ? (
                  displayStudents.map((record: any) => (
                    <div key={record.id} className="grid grid-cols-6 gap-4 py-4 px-6 items-center">
                      <div>
                        <div className="font-medium">{record.student?.firstName} {record.student?.lastName}</div>
                        <div className="text-sm text-muted-foreground">Year {record.student?.year} - {record.student?.section}</div>
                      </div>
                      
                      <div className="font-mono text-sm">{record.student?.studentId}</div>
                      
                      <div>
                        <Badge className={getStatusColor(record.status || 'absent')}>
                          {(record.status || 'absent').charAt(0).toUpperCase() + (record.status || 'absent').slice(1)}
                        </Badge>
                      </div>
                      
                      <div className="font-mono text-sm">
                        {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--'}
                      </div>
                      <div className="font-mono text-sm">{record.computerId ? `PC-${record.computerId}` : '--'}</div>
                      
                      <div className="flex space-x-2">
                        {record.status === 'present' || record.status === 'late' ? (
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
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="text-muted-foreground">
                      {!activeSession ? 'No active class session' : 'No attendance records yet'}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {!activeSession ? 'Start a class session to begin monitoring attendance' : 'Students will appear here when they tap their RFID cards'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
