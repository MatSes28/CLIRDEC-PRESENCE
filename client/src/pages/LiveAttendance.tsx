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
  IdCard,
  FileText
} from "lucide-react";
import RFIDSimulator from "@/components/RFIDSimulator";
import { MarkExcusedModal } from "@/components/MarkExcusedModal";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function LiveAttendance() {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [excuseModalOpen, setExcuseModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activeSession } = useQuery({
    queryKey: ['/api/sessions/active'],
  });

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ['/api/attendance', (activeSession as any)?.id],
    enabled: !!(activeSession as any)?.id,
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
        sessionId: (activeSession as any).id
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

  const markExcusedMutation = useMutation({
    mutationFn: async (data: { attendanceId: number; excuseReason: string; excuseNotes: string }) => {
      const response = await apiRequest('PUT', `/api/attendance/${data.attendanceId}/excuse`, {
        excuseReason: data.excuseReason,
        excuseNotes: data.excuseNotes
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Marked as Excused",
        description: "The student's absence has been marked as excused.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      setExcuseModalOpen(false);
      setSelectedRecord(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance as excused",
        variant: "destructive",
      });
    }
  });

  const handleMarkExcused = (data: { excuseReason: string; excuseNotes: string }) => {
    if (selectedRecord) {
      markExcusedMutation.mutate({
        attendanceId: selectedRecord.id,
        excuseReason: data.excuseReason,
        excuseNotes: data.excuseNotes
      });
    }
  };

  const openExcuseModal = (record: any) => {
    setSelectedRecord(record);
    setExcuseModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-secondary text-secondary-foreground';
      case 'late': return 'bg-accent text-accent-foreground';
      case 'absent': return 'bg-destructive text-destructive-foreground';
      case 'excused': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Use real attendance data from API or display empty state
  const displayStudents = Array.isArray(attendance) && attendance.length > 0 ? attendance : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* RFID Scanner Status */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-lg sm:text-xl">Live Attendance Monitoring</CardTitle>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-secondary/10 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 bg-secondary rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm font-medium text-secondary">RFID Scanner Active</span>
              </div>
              <Button 
                onClick={() => refreshMutation.mutate()}
                disabled={refreshMutation.isPending}
                size="sm"
                className="shrink-0"
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
                  (displayStudents as any[]).map((record: any) => (
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
                        ) : record.status === 'absent' ? (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openExcuseModal(record)}
                            >
                              <FileText className="mr-1 h-3 w-3" />
                              Excuse
                            </Button>
                            <Button size="sm" variant="outline">
                              <Phone className="mr-1 h-3 w-3" />
                              Contact
                            </Button>
                          </>
                        ) : record.status === 'excused' ? (
                          <Badge variant="outline" className="text-xs">
                            {record.excuseReason?.replace('_', ' ') || 'Excused'}
                          </Badge>
                        ) : null}
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

      {/* Mark Excused Modal */}
      <MarkExcusedModal
        open={excuseModalOpen}
        onOpenChange={setExcuseModalOpen}
        attendanceRecord={selectedRecord}
        onMarkExcused={handleMarkExcused}
        isLoading={markExcusedMutation.isPending}
      />
    </div>
  );
}
