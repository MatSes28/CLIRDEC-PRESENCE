import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Calendar,
  FileSpreadsheet,
  Filter
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [selectedRange, setSelectedRange] = useState("today");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const { toast } = useToast();

  const { data: subjects } = useQuery({
    queryKey: ['/api/subjects'],
  });

  // Fetch real report data
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['/api/reports/generate', selectedRange, selectedSubject, selectedSection],
    queryFn: async () => {
      const params = new URLSearchParams({
        range: selectedRange,
        subject: selectedSubject,
        section: selectedSection
      });
      const response = await fetch(`/api/reports/generate?${params}`);
      if (!response.ok) throw new Error('Failed to fetch report data');
      return response.json();
    },
    retry: 1,
    refetchInterval: false
  });

  const attendanceRecords = reportData?.records || [];
  const summary = reportData?.summary || { present: 0, late: 0, absent: 0, total: 0 };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-secondary text-secondary-foreground">Present</Badge>;
      case 'late':
        return <Badge className="bg-accent text-accent-foreground">Late</Badge>;
      case 'absent':
        return <Badge className="bg-destructive text-destructive-foreground">Absent</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const exportCSV = async () => {
    try {
      const response = await fetch(`/api/reports/export?range=${selectedRange}&subject=${selectedSubject}&section=${selectedSection}&format=csv`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-report-${selectedRange}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Successful",
          description: "Report exported as CSV",
        });
      } else {
        throw new Error('Failed to export report');
      }
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export report",
        variant: "destructive"
      });
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Attendance Reports</h1>
            <p className="text-muted-foreground">View and export attendance data</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-muted-foreground">Loading attendance reports...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Attendance Reports</h1>
            <p className="text-muted-foreground">View and export attendance data</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-destructive/10 rounded-full flex items-center justify-center">
                <FileSpreadsheet className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-semibold mb-2">Failed to Load Reports</h3>
              <p className="text-muted-foreground mb-4">Unable to fetch attendance data. Please try again.</p>
              <Button onClick={() => window.location.reload()}>Refresh Page</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Attendance Reports</h1>
          <p className="text-muted-foreground">View and export attendance data</p>
        </div>
        <Button onClick={exportCSV} className="w-full sm:w-auto" data-testid="button-export-csv">
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-base sm:text-lg">
            <Filter className="mr-2 h-5 w-5" />
            Filter Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <Select value={selectedRange} onValueChange={setSelectedRange}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger data-testid="select-subject">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects?.map((subject: any) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger data-testid="select-section">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  <SelectItem value="3IT-A">3IT-A</SelectItem>
                  <SelectItem value="3IT-B">3IT-B</SelectItem>
                  <SelectItem value="3IT-C">3IT-C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold" data-testid="text-total-records">{summary.total}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Records</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-secondary" data-testid="text-present-count">
                {summary.present}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Present</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-accent" data-testid="text-late-count">
                {summary.late}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Late</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-destructive" data-testid="text-absent-count">
                {summary.absent}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Absent</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Attendance Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="grid grid-cols-6 gap-4 py-3 px-6 bg-muted/50 text-sm font-medium text-muted-foreground">
                <div>Student</div>
                <div>Student ID</div>
                <div>Check-in</div>
                <div>Check-out</div>
                <div>Duration</div>
                <div>Status</div>
              </div>
              
              <div className="divide-y divide-border">
                {attendanceRecords.length === 0 ? (
                  <div className="py-12 px-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-muted/20 rounded-full flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold mb-2">No Attendance Records</h3>
                    <p className="text-muted-foreground">No attendance data found for the selected criteria. Try adjusting your filters.</p>
                  </div>
                ) : (
                  attendanceRecords.map((record: any) => (
                    <div key={record.id} className="grid grid-cols-6 gap-4 py-4 px-6 items-center" data-testid={`row-attendance-${record.id}`}>
                      <div className="font-medium">{record.studentName}</div>
                      <div className="font-mono text-sm">{record.studentId}</div>
                      <div className="font-mono text-sm">{record.checkIn}</div>
                      <div className="font-mono text-sm">{record.checkOut}</div>
                      <div className="font-mono text-sm">{record.duration}</div>
                      <div>{getStatusBadge(record.status)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
