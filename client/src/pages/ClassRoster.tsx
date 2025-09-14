import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  Search,
  BookOpen,
  UserPlus,
  UserMinus,
  Mail,
  GraduationCap
} from "lucide-react";
import { GenderAvatar } from "@/components/GenderAvatar";

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  studentId: string;
  email: string;
  year: number;
  section: string;
  gender: string;
  contactNumber: string;
  parentEmail: string;
  parentContactNumber: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  description: string;
  professorId: number;
}

interface Enrollment {
  id: number;
  studentId: number;
  subjectId: number;
  academicYear: string;
  semester: string;
  status: string;
  enrolledAt: string;
  droppedAt?: string;
  isActive: boolean;
}

export default function ClassRoster() {
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ['/api/subjects'],
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['/api/enrollments'],
  });

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['/api/students'],
  });

  const isLoading = subjectsLoading || enrollmentsLoading || studentsLoading;

  // Process data to get students by subject
  const getStudentsInSubject = (subjectId: number) => {
    if (!enrollments || !students) return [];
    
    const enrollmentsArray = Array.isArray(enrollments) ? enrollments : [];
    const studentsArray = Array.isArray(students) ? students : [];
    
    const subjectEnrollments = enrollmentsArray.filter((enrollment: Enrollment) => 
      enrollment.subjectId === subjectId && enrollment.isActive
    );
    
    return subjectEnrollments.map((enrollment: Enrollment) => {
      const student = studentsArray.find((s: Student) => s.id === enrollment.studentId);
      return student ? { ...student, enrollment } : null;
    }).filter(Boolean);
  };

  // Get enrolled students for selected subject
  const enrolledStudents = selectedSubject === "all" 
    ? [] 
    : getStudentsInSubject(parseInt(selectedSubject));

  // Filter students based on search and filters
  const filteredStudents = enrolledStudents.filter((student: any) => {
    const fullName = `${student.firstName} ${student.lastName}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === "all" || student.year.toString() === selectedYear;
    const matchesSection = selectedSection === "all" || student.section.toLowerCase().includes(selectedSection.toLowerCase());
    
    return matchesSearch && matchesYear && matchesSection;
  });

  // Get unique years and sections for filter options
  const availableYears = Array.from(new Set(enrolledStudents.map((s: any) => s.year.toString()))).sort();
  const availableSections = Array.from(new Set(enrolledStudents.map((s: any) => s.section))).sort();

  // Get subject stats
  const getSubjectStats = () => {
    if (!subjects || !enrollments) return [];
    
    const subjectsArray = Array.isArray(subjects) ? subjects : [];
    const enrollmentsArray = Array.isArray(enrollments) ? enrollments : [];
    
    return subjectsArray.map((subject: Subject) => {
      const subjectEnrollments = enrollmentsArray.filter((enrollment: Enrollment) => 
        enrollment.subjectId === subject.id && enrollment.isActive
      );
      return {
        ...subject,
        enrolledCount: subjectEnrollments.length
      };
    });
  };

  const subjectStats = getSubjectStats();
  const subjectsArray = Array.isArray(subjects) ? subjects : [];
  const selectedSubjectData = subjectsArray.find((s: Subject) => s.id === parseInt(selectedSubject));

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="class-roster-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Class Roster</h1>
          <p className="text-muted-foreground">View and manage student enrollments by class</p>
        </div>
        <Button data-testid="button-manage-enrollments">
          <UserPlus className="mr-2 h-4 w-4" />
          Manage Enrollments
        </Button>
      </div>

      {/* Subject Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GraduationCap className="mr-2 h-5 w-5" />
            Select Subject
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger data-testid="select-subject">
              <SelectValue placeholder="Choose a subject to view its roster" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects Overview</SelectItem>
              {subjectsArray.map((subject: Subject) => (
                <SelectItem key={subject.id} value={subject.id.toString()}>
                  {subject.code} - {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Subject Overview */}
      {selectedSubject === "all" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjectStats.map((subject: any) => (
            <Card key={subject.id} className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedSubject(subject.id.toString())}
                  data-testid={`card-subject-${subject.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{subject.code}</CardTitle>
                  <Badge variant="secondary" data-testid={`badge-enrollment-count-${subject.id}`}>
                    <Users className="mr-1 h-3 w-3" />
                    {subject.enrolledCount}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{subject.name}</p>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {subject.description || "No description available"}
                </p>
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  <BookOpen className="mr-2 h-4 w-4" />
                  View Roster
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Selected Subject Roster */}
      {selectedSubject !== "all" && selectedSubjectData && (
        <div className="space-y-6">
          {/* Subject Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <BookOpen className="mr-2 h-5 w-5" />
                    {selectedSubjectData.code} - {selectedSubjectData.name}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">{selectedSubjectData.description}</p>
                </div>
                <Badge variant="outline" data-testid="badge-total-enrolled">
                  <Users className="mr-1 h-3 w-3" />
                  {enrolledStudents.length} Students Enrolled
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-students"
                    />
                  </div>
                </div>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full md:w-32" data-testid="select-year-filter">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year}>Year {year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedSection} onValueChange={setSelectedSection}>
                  <SelectTrigger className="w-full md:w-40" data-testid="select-section-filter">
                    <SelectValue placeholder="Section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sections</SelectItem>
                    {availableSections.map((section) => (
                      <SelectItem key={section} value={section}>{section}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Students List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Students Found</h3>
                  <p className="text-muted-foreground">
                    {enrolledStudents.length === 0 
                      ? "No students are enrolled in this subject yet."
                      : "No students match your current filters."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredStudents.map((student: any) => (
                <Card key={student.id} data-testid={`card-student-${student.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start space-x-3">
                      <GenderAvatar 
                        gender={student.gender} 
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate" data-testid={`text-student-name-${student.id}`}>
                          {student.firstName} {student.lastName}
                        </h3>
                        <p className="text-xs text-muted-foreground" data-testid={`text-student-id-${student.id}`}>
                          {student.studentId}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            Year {student.year}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {student.section}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-3">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-7 flex-1"
                            data-testid={`button-contact-${student.id}`}
                          >
                            <Mail className="mr-1 h-3 w-3" />
                            Contact
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-xs h-7 text-destructive hover:text-destructive"
                            data-testid={`button-drop-${student.id}`}
                          >
                            <UserMinus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}