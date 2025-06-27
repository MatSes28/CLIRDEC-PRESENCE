import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  RefreshCw,
  Monitor,
  Settings,
  UserPlus,
  Wrench
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Computers() {
  const [selectedClassroom, setSelectedClassroom] = useState<string>("1");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedComputer, setSelectedComputer] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: classrooms } = useQuery({
    queryKey: ['/api/classrooms'],
  });

  const { data: students } = useQuery({
    queryKey: ['/api/students'],
  });

  const { data: computers, isLoading } = useQuery({
    queryKey: ['/api/computers', selectedClassroom],
    enabled: !!selectedClassroom,
  });

  const assignComputerMutation = useMutation({
    mutationFn: async ({ computerId, studentId }: { computerId: number; studentId: number }) => {
      await apiRequest('PUT', `/api/computers/${computerId}/assign`, { studentId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/computers'] });
      toast({
        title: "Computer Assigned",
        description: "Computer has been successfully assigned to student",
      });
      setSelectedStudent("");
      setSelectedComputer("");
    },
    onError: () => {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign computer to student",
        variant: "destructive",
      });
    },
  });

  const releaseComputerMutation = useMutation({
    mutationFn: async (computerId: number) => {
      await apiRequest('PUT', `/api/computers/${computerId}/release`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/computers'] });
      toast({
        title: "Computer Released",
        description: "Computer is now available for assignment",
      });
    },
    onError: () => {
      toast({
        title: "Release Failed",
        description: "Failed to release computer",
        variant: "destructive",
      });
    },
  });

  // Mock computer data for Lab 204
  const mockComputers = [
    { id: 1, name: 'PC-01', status: 'occupied', assignedStudent: 'Maria Santos', ipAddress: '192.168.1.101' },
    { id: 2, name: 'PC-02', status: 'available', assignedStudent: null, ipAddress: '192.168.1.102' },
    { id: 3, name: 'PC-03', status: 'maintenance', assignedStudent: null, ipAddress: '192.168.1.103' },
    { id: 4, name: 'PC-04', status: 'occupied', assignedStudent: 'Juan Cruz', ipAddress: '192.168.1.104' },
    { id: 5, name: 'PC-05', status: 'available', assignedStudent: null, ipAddress: '192.168.1.105' },
    { id: 6, name: 'PC-06', status: 'available', assignedStudent: null, ipAddress: '192.168.1.106' },
    { id: 7, name: 'PC-07', status: 'occupied', assignedStudent: 'Anna Lopez', ipAddress: '192.168.1.107' },
    { id: 8, name: 'PC-08', status: 'available', assignedStudent: null, ipAddress: '192.168.1.108' },
    { id: 9, name: 'PC-09', status: 'maintenance', assignedStudent: null, ipAddress: '192.168.1.109' },
    { id: 10, name: 'PC-10', status: 'available', assignedStudent: null, ipAddress: '192.168.1.110' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'bg-secondary/10 border-secondary/20 text-secondary';
      case 'available':
        return 'bg-muted border-border text-muted-foreground';
      case 'maintenance':
        return 'bg-destructive/10 border-destructive/20 text-destructive';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'bg-secondary';
      case 'available':
        return 'bg-muted-foreground';
      case 'maintenance':
        return 'bg-destructive';
      default:
        return 'bg-muted-foreground';
    }
  };

  const handleAssignment = () => {
    if (selectedStudent && selectedComputer) {
      assignComputerMutation.mutate({
        computerId: parseInt(selectedComputer),
        studentId: parseInt(selectedStudent)
      });
    }
  };

  const availableStudents = [
    { id: 1, name: 'Anna Rodriguez' },
    { id: 2, name: 'Carlos Mendez' },
    { id: 3, name: 'Diana Lopez' },
    { id: 4, name: 'Miguel Santos' },
  ];

  const availableComputers = mockComputers.filter(c => c.status === 'available');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Laboratory Computer Management</h1>
          <p className="text-muted-foreground">Assign computers to students and monitor usage</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Computer
        </Button>
      </div>

      {/* Lab Room Selection */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Select Laboratory:</label>
            <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Lab 204 - Database Systems</SelectItem>
                <SelectItem value="2">Lab 205 - Programming</SelectItem>
                <SelectItem value="3">Lab 206 - Networks</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Computer Layout Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lab 204 - Computer Layout</CardTitle>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-secondary rounded"></div>
                <span className="text-sm text-muted-foreground">Occupied</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-muted-foreground rounded"></div>
                <span className="text-sm text-muted-foreground">Available</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-destructive rounded"></div>
                <span className="text-sm text-muted-foreground">Maintenance</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Computer grid layout */}
          <div className="grid grid-cols-5 gap-4 mb-8">
            {mockComputers.map((computer) => (
              <div
                key={computer.id}
                className={`border-2 rounded-lg p-4 text-center relative ${getStatusColor(computer.status)}`}
              >
                <div className="absolute top-2 right-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusIndicator(computer.status)}`}></div>
                </div>
                <Monitor className={`text-2xl mb-2 mx-auto h-8 w-8 ${
                  computer.status === 'occupied' ? 'text-secondary' :
                  computer.status === 'maintenance' ? 'text-destructive' : 'text-muted-foreground'
                }`} />
                <div className="text-sm font-medium mb-1">{computer.name}</div>
                <div className="text-xs text-muted-foreground mb-2">
                  {computer.assignedStudent || 'Available'}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs px-2 py-1 h-auto"
                  onClick={() => {
                    if (computer.status === 'occupied') {
                      // Monitor functionality
                      toast({
                        title: "Monitoring",
                        description: `Monitoring ${computer.name} - ${computer.assignedStudent}`,
                      });
                    } else if (computer.status === 'maintenance') {
                      // Repair functionality
                      toast({
                        title: "Maintenance",
                        description: `${computer.name} is scheduled for repair`,
                      });
                    } else {
                      // Assign functionality
                      setSelectedComputer(computer.id.toString());
                    }
                  }}
                >
                  {computer.status === 'occupied' && 'Monitor'}
                  {computer.status === 'maintenance' && 'Repair'}
                  {computer.status === 'available' && 'Assign'}
                </Button>
              </div>
            ))}
          </div>

          {/* Assignment Panel */}
          <div className="bg-muted/50 rounded-lg p-6">
            <h4 className="text-lg font-semibold mb-4">Quick Assignment</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Student</label>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Student" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id.toString()}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Computer</label>
                <Select value={selectedComputer} onValueChange={setSelectedComputer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Computer" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableComputers.map((computer) => (
                      <SelectItem key={computer.id} value={computer.id.toString()}>
                        {computer.name} (Available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button 
                  className="w-full"
                  onClick={handleAssignment}
                  disabled={!selectedStudent || !selectedComputer || assignComputerMutation.isPending}
                >
                  {assignComputerMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Assign Computer
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Computer Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{mockComputers.length}</p>
              <p className="text-sm text-muted-foreground">Total Computers</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-secondary">
                {mockComputers.filter(c => c.status === 'occupied').length}
              </p>
              <p className="text-sm text-muted-foreground">Occupied</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">
                {mockComputers.filter(c => c.status === 'available').length}
              </p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-destructive">
                {mockComputers.filter(c => c.status === 'maintenance').length}
              </p>
              <p className="text-sm text-muted-foreground">Maintenance</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
