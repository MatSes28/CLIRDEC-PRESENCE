import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Play, MapPin, BookOpen, Users, Clock } from "lucide-react";

interface StartSessionModalProps {
  open: boolean;
  onClose: () => void;
}

export default function StartSessionModal({ open, onClose }: StartSessionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [manualData, setManualData] = useState({
    subjectId: '',
    classroomId: '',
    duration: '120' // default 2 hours in minutes
  });

  const { data: schedules } = useQuery({
    queryKey: ['/api/schedules'],
  });

  const { data: subjects } = useQuery({
    queryKey: ['/api/subjects'],
  });

  const { data: classrooms } = useQuery({
    queryKey: ['/api/classrooms'],
  });

  const startSessionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to start session');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Class Session Started",
        description: "Attendance monitoring is now active. Students can begin checking in."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start class session",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setSelectedScheduleId('');
    setManualMode(false);
    setManualData({
      subjectId: '',
      classroomId: '',
      duration: '120'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (manualMode) {
      if (!manualData.subjectId || !manualData.classroomId) {
        toast({
          title: "Validation Error",
          description: "Please select both subject and classroom",
          variant: "destructive"
        });
        return;
      }
      
      startSessionMutation.mutate({
        subjectId: parseInt(manualData.subjectId),
        classroomId: parseInt(manualData.classroomId),
        duration: parseInt(manualData.duration),
        type: 'manual'
      });
    } else {
      if (!selectedScheduleId) {
        toast({
          title: "Validation Error",
          description: "Please select a schedule",
          variant: "destructive"
        });
        return;
      }
      
      startSessionMutation.mutate({
        scheduleId: parseInt(selectedScheduleId),
        type: 'scheduled'
      });
    }
  };

  const getScheduleInfo = (scheduleId: string) => {
    const schedule = schedules?.find((s: any) => s.id.toString() === scheduleId);
    if (!schedule) return null;
    
    const subject = subjects?.find((s: any) => s.id === schedule.subjectId);
    const classroom = classrooms?.find((c: any) => c.id === schedule.classroomId);
    
    return { schedule, subject, classroom };
  };

  const selectedScheduleInfo = selectedScheduleId ? getScheduleInfo(selectedScheduleId) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Start Class Session
          </DialogTitle>
          <DialogDescription>
            Begin attendance monitoring for a class session
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="manual-mode"
              checked={manualMode}
              onCheckedChange={setManualMode}
            />
            <Label htmlFor="manual-mode">Manual session (not from schedule)</Label>
          </div>

          {!manualMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schedule">Select Schedule</Label>
                <Select value={selectedScheduleId} onValueChange={setSelectedScheduleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a scheduled class" />
                  </SelectTrigger>
                  <SelectContent>
                    {schedules?.map((schedule: any) => {
                      const subject = subjects?.find((s: any) => s.id === schedule.subjectId);
                      const classroom = classrooms?.find((c: any) => c.id === schedule.classroomId);
                      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                      
                      return (
                        <SelectItem key={schedule.id} value={schedule.id.toString()}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            <span>
                              {subject?.name} - {classroom?.name} 
                              ({dayNames[schedule.dayOfWeek]} {schedule.startTime}-{schedule.endTime})
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {selectedScheduleInfo && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-medium">{selectedScheduleInfo.subject?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{selectedScheduleInfo.classroom?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {selectedScheduleInfo.schedule.startTime} - {selectedScheduleInfo.schedule.endTime}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select 
                    value={manualData.subjectId} 
                    onValueChange={(value) => setManualData({...manualData, subjectId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject: any) => (
                        <SelectItem key={subject.id} value={subject.id.toString()}>
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {subject.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classroom">Classroom</Label>
                  <Select 
                    value={manualData.classroomId} 
                    onValueChange={(value) => setManualData({...manualData, classroomId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select classroom" />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms?.map((classroom: any) => (
                        <SelectItem key={classroom.id} value={classroom.id.toString()}>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {classroom.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Select 
                  value={manualData.duration} 
                  onValueChange={(value) => setManualData({...manualData, duration: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="150">2.5 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={startSessionMutation.isPending}
              className="bg-secondary hover:bg-secondary/90"
            >
              {startSessionMutation.isPending ? "Starting..." : "Start Session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}