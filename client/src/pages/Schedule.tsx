import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Upload, 
  CloudUpload,
  Calendar,
  Clock,
  MapPin,
  BookOpen
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AddScheduleModal from "@/components/AddScheduleModal";
import FileUpload from "@/components/FileUpload";

export default function Schedule() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: schedules, isLoading } = useQuery({
    queryKey: ['/api/schedules'],
  });

  const { data: subjects } = useQuery({
    queryKey: ['/api/subjects'],
  });

  const { data: classrooms } = useQuery({
    queryKey: ['/api/classrooms'],
  });

  // Process real schedule data for visualization
  const scheduleBlocks = schedules?.map((schedule: any) => {
    const subject = subjects?.find((s: any) => s.id === schedule.subjectId);
    const classroom = classrooms?.find((c: any) => c.id === schedule.classroomId);
    
    // Convert day number to day name (0 = Sunday, 1 = Monday, etc.)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[schedule.dayOfWeek];
    
    // Format time from 24-hour to 12-hour format
    const formatTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };
    
    const timeRange = `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`;
    
    // Assign colors based on schedule id for variety
    const colors = ['primary', 'secondary', 'accent'];
    const color = colors[schedule.id % colors.length];
    
    return {
      id: schedule.id,
      subject: subject?.name || 'Unknown Subject',
      time: timeRange,
      room: classroom?.name || 'Unknown Room',
      day: dayName,
      autoStart: schedule.autoStart,
      color: color
    };
  }) || [];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'primary':
        return 'bg-primary/10 border-primary/20 text-primary';
      case 'secondary':
        return 'bg-secondary/10 border-secondary/20 text-secondary';
      case 'accent':
        return 'bg-accent/10 border-accent/20 text-accent';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-7 gap-4">
            {[...Array(21)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Class Schedule Management</h1>
          <p className="text-muted-foreground">Manage your class schedules and automated session triggers</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Schedule
        </Button>
      </div>

      {/* Schedule Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Schedule</CardTitle>
          <p className="text-muted-foreground">Upload your class schedule file (CSV/Excel format)</p>
        </CardHeader>
        <CardContent>
          <FileUpload 
            onFileUpload={(file) => {
              toast({
                title: "File Upload Started",
                description: `Processing ${file.name}...`
              });
              queryClient.invalidateQueries({ queryKey: ['/api/schedules'] });
            }}
          />
        </CardContent>
      </Card>

      {/* Current Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Current Week Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-4">
            {/* Days Header */}
            {days.map((day) => (
              <div key={day} className="text-center font-semibold text-muted-foreground p-3">
                {day.slice(0, 3)}
              </div>
            ))}
            
            {/* Schedule Blocks */}
            {days.map((day) => (
              <div key={day} className="space-y-2">
                {scheduleBlocks
                  .filter(block => block.day === day)
                  .map((block) => (
                    <div
                      key={block.id}
                      className={`border rounded-lg p-3 ${getColorClasses(block.color)}`}
                    >
                      <div className="font-medium text-sm mb-1">{block.subject}</div>
                      <div className="text-xs mb-1">{block.time}</div>
                      <div className="text-xs text-muted-foreground mb-2">{block.room}</div>
                      <div>
                        <Badge 
                          variant={block.autoStart ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {block.autoStart ? 'Auto-Start' : 'Manual'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                
                {/* Add Class Slot */}
                <button className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 text-center text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground transition-colors">
                  <Plus className="h-4 w-4 mx-auto mb-1" />
                  <div className="text-xs">Add Class</div>
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Schedule Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
                <p className="text-2xl font-bold">{scheduleBlocks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-secondary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Auto-Start</p>
                <p className="text-2xl font-bold">{scheduleBlocks.filter(b => b.autoStart).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <MapPin className="h-8 w-8 text-accent" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Rooms</p>
                <p className="text-2xl font-bold">
                  {new Set(scheduleBlocks.map(b => b.room)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Subjects</p>
                <p className="text-2xl font-bold">
                  {new Set(scheduleBlocks.map(b => b.subject)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Schedule Modal */}
      <AddScheduleModal 
        open={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </div>
  );
}
