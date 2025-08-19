import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserPlus, 
  FolderInput, 
  Search,
  Mail,
  Edit,
  Eye,
  AlertTriangle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GenderAvatar } from "@/components/GenderAvatar";
import EditStudentModal from "@/components/EditStudentModal";
import ViewStudentModal from "@/components/ViewStudentModal";
import ContactStudentModal from "@/components/ContactStudentModal";

export default function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactType, setContactType] = useState<'contact' | 'alert'>('contact');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students, isLoading } = useQuery({
    queryKey: ['/api/students'],
  });

  // Use actual student data from API
  const studentsData = students || [];

  const filteredStudents = studentsData.filter((student: any) => {
    const fullName = `${student.firstName} ${student.lastName}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === "all" || student.year.toString() === selectedYear;
    const matchesSection = selectedSection === "all" || student.section === selectedSection;
    
    return matchesSearch && matchesYear && matchesSection;
  });

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'bg-secondary';
    if (rate >= 60) return 'bg-accent';
    return 'bg-destructive';
  };

  const sendEmailNotification = useMutation({
    mutationFn: async (studentId: number) => {
      await apiRequest('POST', '/api/notifications/send', {
        studentId,
        type: 'absence_alert'
      });
    },
    onSuccess: () => {
      toast({
        title: "Notification Sent",
        description: "Parent notification has been queued for delivery",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send notification",
        variant: "destructive",
      });
    },
  });

  // Modal handlers
  const handleEditStudent = (student: any) => {
    setSelectedStudent(student);
    setEditModalOpen(true);
  };

  const handleViewStudent = (student: any) => {
    setSelectedStudent(student);
    setViewModalOpen(true);
  };

  const handleContactStudent = (student: any) => {
    setSelectedStudent(student);
    setContactType(student.attendanceRate < 60 ? 'alert' : 'contact');
    setContactModalOpen(true);
  };

  const closeModals = () => {
    setEditModalOpen(false);
    setViewModalOpen(false);
    setContactModalOpen(false);
    setSelectedStudent(null);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Student Management</h1>
          <p className="text-muted-foreground">Manage student information and parent contact details</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <FolderInput className="mr-2 h-4 w-4" />
            Import Students
          </Button>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                <SelectItem value="1st">1st Year</SelectItem>
                <SelectItem value="2nd">2nd Year</SelectItem>
                <SelectItem value="3rd">3rd Year</SelectItem>
                <SelectItem value="4th">4th Year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                <SelectItem value="A">Section A</SelectItem>
                <SelectItem value="B">Section B</SelectItem>
                <SelectItem value="C">Section C</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="grid grid-cols-6 gap-4 py-3 px-6 bg-muted/50 text-sm font-medium text-muted-foreground">
                <div>Student</div>
                <div>Student ID</div>
                <div>RFID Card</div>
                <div>Parent Email</div>
                <div>Attendance Rate</div>
                <div>Actions</div>
              </div>
              
              <div className="divide-y divide-border">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="grid grid-cols-6 gap-4 py-4 px-6 items-center">
                    <div className="flex items-center space-x-3">
                      <GenderAvatar 
                        gender={student.gender || 'male'} 
                        size="md" 
                      />
                      <div>
                        <div className="font-medium">{`${student.firstName} ${student.lastName}`}</div>
                        <div className="text-sm text-muted-foreground">Year {student.year} - {student.section}</div>
                      </div>
                    </div>
                    
                    <div className="font-mono text-sm">{student.studentId}</div>
                    
                    <div>
                      {student.rfidCardId ? (
                        <Badge variant="secondary" className="font-mono text-xs">
                          {student.rfidCardId}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Not Assigned
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm">{student.parentEmail}</div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-16 bg-muted rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-green-500"
                          style={{ width: '85%' }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium">85%</span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditStudent(student)}
                      >
                        <Edit className="mr-1 h-3 w-3" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleContactStudent(student)}
                      >
                        <Mail className="mr-1 h-3 w-3" />
                        Contact
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewStudent(student)}
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No students found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{studentsData.length}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {studentsData.filter((s: any) => s.isActive).length}
              </p>
              <p className="text-sm text-muted-foreground">Active Students</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {studentsData.filter((s: any) => s.rfidCardId).length}
              </p>
              <p className="text-sm text-muted-foreground">With RFID Cards</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {studentsData.filter((s: any) => !s.rfidCardId).length}
              </p>
              <p className="text-sm text-muted-foreground">No RFID Card</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <EditStudentModal
        open={editModalOpen}
        onClose={closeModals}
        student={selectedStudent}
      />
      
      <ViewStudentModal
        open={viewModalOpen}
        onClose={closeModals}
        student={selectedStudent}
      />
      
      <ContactStudentModal
        open={contactModalOpen}
        onClose={closeModals}
        student={selectedStudent}
        type={contactType}
      />
    </div>
  );
}
