import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Mail, 
  CreditCard, 
  Calendar, 
  MapPin, 
  Phone,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface ViewStudentModalProps {
  open: boolean;
  onClose: () => void;
  student: any;
}

export default function ViewStudentModal({ open, onClose, student }: ViewStudentModalProps) {
  const [attendanceData, setAttendanceData] = useState([]);
  
  // Get student attendance history
  const { data: attendanceHistory } = useQuery({
    queryKey: ['/api/students', student?.id, 'attendance'],
    enabled: !!student?.id
  });

  // Mock attendance data for demonstration
  const mockAttendanceHistory = [
    {
      id: 1,
      date: '2025-01-27',
      subject: 'Database Management Systems',
      status: 'present',
      checkIn: '10:02 AM',
      checkOut: '11:58 AM',
      classroom: 'Lab 204'
    },
    {
      id: 2,
      date: '2025-01-26',
      subject: 'Programming Logic',
      status: 'late',
      checkIn: '10:15 AM',
      checkOut: '12:00 PM',
      classroom: 'Room 301'
    },
    {
      id: 3,
      date: '2025-01-25',
      subject: 'Data Structures',
      status: 'absent',
      checkIn: null,
      checkOut: null,
      classroom: 'Lab 205'
    },
    {
      id: 4,
      date: '2025-01-24',
      subject: 'Web Development',
      status: 'present',
      checkIn: '09:58 AM',
      checkOut: '11:55 AM',
      classroom: 'Lab 206'
    },
    {
      id: 5,
      date: '2025-01-23',
      subject: 'Mobile Programming',
      status: 'present',
      checkIn: '02:05 PM',
      checkOut: '03:58 PM',
      classroom: 'Lab 207'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-secondary" />;
      case 'late':
        return <AlertCircle className="h-4 w-4 text-accent" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      present: 'bg-secondary text-secondary-foreground',
      late: 'bg-accent text-accent-foreground',
      absent: 'bg-destructive text-destructive-foreground'
    };
    
    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-muted'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!student) return null;

  const attendanceStats = {
    total: mockAttendanceHistory.length,
    present: mockAttendanceHistory.filter(a => a.status === 'present').length,
    late: mockAttendanceHistory.filter(a => a.status === 'late').length,
    absent: mockAttendanceHistory.filter(a => a.status === 'absent').length
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Student Profile
          </DialogTitle>
          <DialogDescription>
            Complete student information and attendance history
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Student Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-4">
                <img 
                  src={student.profileImage} 
                  alt={student.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-secondary"
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{student.name}</h2>
                  <p className="text-muted-foreground">{student.studentId}</p>
                  <p className="text-sm text-muted-foreground">{student.year} - {student.section}</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{student.attendanceRate}% Attendance</span>
                    </div>
                    {student.rfidCard && (
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="secondary" className="font-mono text-xs">
                          {student.rfidCard}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Personal Details</TabsTrigger>
              <TabsTrigger value="attendance">Attendance History</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Student Email</p>
                        <p className="text-sm text-muted-foreground">{student.email || 'Not provided'}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Parent Email</p>
                        <p className="text-sm text-muted-foreground">{student.parentEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Parent/Guardian</p>
                        <p className="text-sm text-muted-foreground">{student.parentName || 'Not provided'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Academic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Student ID</p>
                        <p className="text-sm text-muted-foreground font-mono">{student.studentId}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Year & Section</p>
                        <p className="text-sm text-muted-foreground">{student.year} - {student.section}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">RFID Card</p>
                        <p className="text-sm text-muted-foreground">
                          {student.rfidCard ? (
                            <Badge variant="secondary" className="font-mono text-xs">
                              {student.rfidCard}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              Not Assigned
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="attendance" className="space-y-4">
              <div className="space-y-3">
                {mockAttendanceHistory.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(record.status)}
                          <div>
                            <p className="font-medium">{record.subject}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(record.date).toLocaleDateString()} • {record.classroom}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right text-sm">
                            {record.checkIn && (
                              <p>
                                <span className="text-muted-foreground">In:</span> {record.checkIn}
                              </p>
                            )}
                            {record.checkOut && (
                              <p>
                                <span className="text-muted-foreground">Out:</span> {record.checkOut}
                              </p>
                            )}
                            {!record.checkIn && !record.checkOut && (
                              <p className="text-muted-foreground">No record</p>
                            )}
                          </div>
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{attendanceStats.total}</p>
                    <p className="text-sm text-muted-foreground">Total Classes</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-secondary">{attendanceStats.present}</p>
                    <p className="text-sm text-muted-foreground">Present</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-accent">{attendanceStats.late}</p>
                    <p className="text-sm text-muted-foreground">Late</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">{attendanceStats.absent}</p>
                    <p className="text-sm text-muted-foreground">Absent</p>
                  </CardContent>
                </Card>
              </div>

              {/* Attendance Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Attendance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Overall Attendance Rate</span>
                      <span className="font-medium">{student.attendanceRate}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div 
                        className="bg-secondary h-3 rounded-full transition-all duration-300"
                        style={{ width: `${student.attendanceRate}%` }}
                      ></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      <div>
                        <p className="text-secondary font-medium">{Math.round((attendanceStats.present / attendanceStats.total) * 100)}%</p>
                        <p className="text-muted-foreground">Present</p>
                      </div>
                      <div>
                        <p className="text-accent font-medium">{Math.round((attendanceStats.late / attendanceStats.total) * 100)}%</p>
                        <p className="text-muted-foreground">Late</p>
                      </div>
                      <div>
                        <p className="text-destructive font-medium">{Math.round((attendanceStats.absent / attendanceStats.total) * 100)}%</p>
                        <p className="text-muted-foreground">Absent</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}