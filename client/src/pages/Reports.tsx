import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  FileText, 
  Calendar,
  CalendarDays,
  BarChart3,
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

  // Mock report data
  const mockReportData = [
    {
      id: 1,
      studentName: 'Maria Santos',
      studentId: '2021-IT-001',
      checkIn: '10:02 AM',
      checkOut: '11:58 AM',
      duration: '1h 56m',
      status: 'present'
    },
    {
      id: 2,
      studentName: 'Juan Dela Cruz',
      studentId: '2021-IT-002',
      checkIn: '10:15 AM',
      checkOut: '12:00 PM',
      duration: '1h 45m',
      status: 'late'
    },
    {
      id: 3,
      studentName: 'Anna Rodriguez',
      studentId: '2021-IT-003',
      checkIn: '--',
      checkOut: '--',
      duration: '--',
      status: 'absent'
    },
    {
      id: 4,
      studentName: 'Carlos Mendez',
      studentId: '2021-IT-004',
      checkIn: '10:05 AM',
      checkOut: '11:55 AM',
      duration: '1h 50m',
      status: 'present'
    }
  ];

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

  const generateReport = async () => {
    try {
      const response = await fetch(`/api/reports/generate?range=${selectedRange}&subject=${selectedSubject}&section=${selectedSection}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Report Generated",
          description: `Generated report for ${selectedRange} range with ${data.records} records`,
        });
      } else {
        throw new Error('Failed to generate report');
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate report",
        variant: "destructive"
      });
    }
  };

  const exportReport = async (format: 'excel' | 'pdf') => {
    try {
      const response = await fetch(`/api/reports/export?range=${selectedRange}&subject=${selectedSubject}&section=${selectedSection}&format=${format}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-report-${selectedRange}-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Successful",
          description: `Report exported as ${format.toUpperCase()}`,
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Attendance Reports</h1>
          <p className="text-muted-foreground">Generate and download comprehensive attendance reports</p>
        </div>
      </div>

      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date Range</label>
              <Select value={selectedRange} onValueChange={setSelectedRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  <SelectItem value="database">Database Systems</SelectItem>
                  <SelectItem value="programming">Programming Logic</SelectItem>
                  <SelectItem value="structures">Data Structures</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Class Section</label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
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
            <div className="flex items-end">
              <Button className="w-full" onClick={generateReport}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => exportReport('pdf')}>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-primary/10 rounded-lg mr-4">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Daily Report</h3>
                <p className="text-sm text-muted-foreground">Today's attendance summary</p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Daily Report
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => exportReport('excel')}>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-secondary/10 rounded-lg mr-4">
                <CalendarDays className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold">Weekly Report</h3>
                <p className="text-sm text-muted-foreground">This week's attendance trends</p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Weekly Report
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => exportReport('pdf')}>
          <CardContent className="p-6">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-accent/10 rounded-lg mr-4">
                <BarChart3 className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold">Analytics Report</h3>
                <p className="text-sm text-muted-foreground">Detailed attendance analytics</p>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <Download className="mr-2 h-4 w-4" />
              Download Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Report Preview - Database Systems (Today)</CardTitle>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={() => exportReport('excel')}
                className="bg-secondary/10 hover:bg-secondary/20"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button 
                variant="outline" 
                onClick={() => exportReport('pdf')}
                className="bg-destructive/10 hover:bg-destructive/20"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
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
                {mockReportData.map((record) => (
                  <div key={record.id} className="grid grid-cols-6 gap-4 py-4 px-6 items-center">
                    <div className="font-medium">{record.studentName}</div>
                    <div className="font-mono text-sm">{record.studentId}</div>
                    <div className="font-mono text-sm">{record.checkIn}</div>
                    <div className="font-mono text-sm">{record.checkOut}</div>
                    <div className="font-mono text-sm">{record.duration}</div>
                    <div>{getStatusBadge(record.status)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{mockReportData.length}</p>
              <p className="text-sm text-muted-foreground">Total Records</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">
                {mockReportData.filter(r => r.status === 'present').length}
              </p>
              <p className="text-sm text-muted-foreground">Present</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">
                {mockReportData.filter(r => r.status === 'late').length}
              </p>
              <p className="text-sm text-muted-foreground">Late</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">
                {mockReportData.filter(r => r.status === 'absent').length}
              </p>
              <p className="text-sm text-muted-foreground">Absent</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
