import AddStudentModal from "@/components/AddStudentModal";
import ContactStudentModal from "@/components/ContactStudentModal";
import EditStudentModal from "@/components/EditStudentModal";
import { EmptyState } from "@/components/EmptyState";
import { GenderAvatar } from "@/components/GenderAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ViewStudentModal from "@/components/ViewStudentModal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Eye,
  FolderInput,
  GraduationCap,
  Mail,
  Search,
  UserPlus
} from "lucide-react";
import { useState } from "react";

export default function Students() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
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
  const studentsData = Array.isArray(students) ? students : [];

  const filteredStudents = studentsData.filter((student: any) => {
    const fullName = `${student.firstName} ${student.lastName}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === "all" || student.year.toString() === selectedYear;
    const matchesSection = selectedSection === "all" || student.section.toLowerCase().includes(selectedSection.toLowerCase());
    
    return matchesSearch && matchesYear && matchesSection;
  });

  // Get unique years and sections for filter options
  const availableYears = Array.from(new Set(studentsData.map((s: any) => s.year.toString()))).sort();
  const availableSections = Array.from(new Set(studentsData.map((s: any) => s.section))).sort();

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
    setAddModalOpen(false);
    setEditModalOpen(false);
    setViewModalOpen(false);
    setContactModalOpen(false);
    setSelectedStudent(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        {/* Loading Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div className="space-y-2">
            <div className="h-6 sm:h-8 bg-muted rounded w-48 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <div className="h-9 bg-muted rounded w-24 animate-pulse"></div>
            <div className="h-9 bg-muted rounded w-28 animate-pulse"></div>
          </div>
        </div>

        {/* Loading Search and Filters */}
        <div className="bg-card rounded-lg border p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 h-10 bg-muted rounded animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-full sm:w-32 animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-full sm:w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Loading Student Cards - Mobile */}
        <div className="block sm:hidden space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-4 animate-pulse">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="h-5 bg-muted rounded w-20"></div>
                  <div className="flex gap-1 mt-3">
                    <div className="h-8 bg-muted rounded flex-1"></div>
                    <div className="h-8 bg-muted rounded flex-1"></div>
                    <div className="h-8 bg-muted rounded flex-1"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading Table - Desktop */}
        <div className="hidden sm:block bg-card rounded-lg border animate-pulse">
          <div className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-muted rounded"></div>
                ))}
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-muted rounded-full"></div>
                    <div className="space-y-1">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-3 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-5 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="flex items-center space-x-2">
                    <div className="h-2 bg-muted rounded w-16"></div>
                    <div className="h-4 bg-muted rounded w-8"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-muted rounded w-16"></div>
                    <div className="h-8 bg-muted rounded w-20"></div>
                    <div className="h-8 bg-muted rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-6 animate-pulse">
              <div className="text-center space-y-2">
                <div className="h-8 bg-muted rounded w-12 mx-auto"></div>
                <div className="h-4 bg-muted rounded w-24 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show empty state if no students exist
  const hasNoStudents = studentsData.length === 0;
  const hasNoFilteredResults = filteredStudents.length === 0 && !hasNoStudents;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Student Management</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Manage student information and parent contact details</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            <FolderInput className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Import</span>
          </Button>
          <Button onClick={() => setAddModalOpen(true)} data-tour="add-student" size="sm" className="w-full sm:w-auto">
            <UserPlus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Add Student</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-3 sm:p-6" data-tour="search-filters">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 sm:pl-10 text-sm"
              />
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full sm:w-32 text-xs sm:text-sm">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.filter(year => year && year.trim() !== '').map(year => (
                  <SelectItem key={year} value={year}>
                    {year === "1" ? "1st" : year === "2" ? "2nd" : year === "3" ? "3rd" : year === "4" ? "4th" : `${year}`} Year
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-full sm:w-32 text-xs sm:text-sm">
                <SelectValue placeholder="All Sections" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {availableSections.filter(section => section && section.trim() !== '').map(section => (
                  <SelectItem key={section} value={section}>Section {section}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Empty State - No Students */}
      {hasNoStudents && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={GraduationCap}
              title="No Students Yet"
              description="Get started by adding your first student. You'll be able to track their attendance, manage RFID cards, and contact parents all in one place."
              actionLabel="Add Your First Student"
              onAction={() => setAddModalOpen(true)}
              secondaryActionLabel="View Help Guide"
              onSecondaryAction={() => window.location.href = '/help'}
            />
          </CardContent>
        </Card>
      )}

      {/* Empty State - No Filtered Results */}
      {hasNoFilteredResults && (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Search}
              title="No Students Found"
              description={`No students match your search criteria${searchTerm ? ` for "${searchTerm}"` : ''}. Try adjusting your filters or search term.`}
              actionLabel="Clear Filters"
              onAction={() => {
                setSearchTerm('');
                setSelectedYear('all');
                setSelectedSection('all');
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Students Table - Mobile Cards */}
      {!hasNoStudents && !hasNoFilteredResults && (
        <div className="block sm:hidden space-y-3">
          {filteredStudents.map((student) => (
          <Card key={student.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <GenderAvatar gender={student.gender} size="sm" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{student.firstName} {student.lastName}</h3>
                  <p className="text-xs text-muted-foreground">ID: {student.studentId}</p>
                  <p className="text-xs text-muted-foreground truncate">RFID: {student.rfidCard || 'Not Assigned'}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge className={`text-xs ${getAttendanceColor(student.attendanceRate || 0)}`}>
                      {student.attendanceRate || 0}% Attendance
                    </Badge>
                  </div>
                  <div className="mt-3 flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => handleViewStudent(student)} className="flex-1 text-xs h-8">
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleEditStudent(student)} className="flex-1 text-xs h-8">
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleContactStudent(student)} className="flex-1 text-xs h-8">
                      <Mail className="h-3 w-3 mr-1" /> Contact
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {/* Students Table - Desktop */}
      {!hasNoStudents && !hasNoFilteredResults && (
        <Card className="hidden sm:block">
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
                        data-tour="student-actions"
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
        </CardContent>
        </Card>
      )}

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
      <AddStudentModal
        open={addModalOpen}
        onClose={closeModals}
      />
      
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
