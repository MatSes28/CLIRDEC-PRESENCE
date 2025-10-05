import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Plus, 
  RefreshCw,
  Monitor,
  UserPlus
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertComputerSchema, type Computer, type Student, type Classroom } from "@shared/schema";
import { z } from "zod";

const addComputerFormSchema = insertComputerSchema.extend({
  name: z.string().min(1, "Computer name is required"),
  ipAddress: z.string().min(1, "IP address is required"),
  classroomId: z.number().min(1, "Please select a classroom"),
});

type AddComputerForm = z.infer<typeof addComputerFormSchema>;

export default function Computers() {
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedComputer, setSelectedComputer] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddComputerForm>({
    resolver: zodResolver(addComputerFormSchema),
    defaultValues: {
      name: "",
      ipAddress: "",
      status: "available",
      classroomId: 0,
    },
  });

  const { data: classrooms } = useQuery<Classroom[]>({
    queryKey: ['/api/classrooms'],
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  const { data: computers, isLoading, refetch } = useQuery<Computer[]>({
    queryKey: ['/api/computers', selectedClassroom],
    enabled: !!selectedClassroom,
  });

  const addComputerMutation = useMutation({
    mutationFn: async (data: AddComputerForm) => {
      await apiRequest('POST', '/api/computers', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/computers'] });
      toast({
        title: "Computer Added",
        description: "Computer has been successfully added",
      });
      setIsAddDialogOpen(false);
      form.reset();
      refetch();
    },
    onError: () => {
      toast({
        title: "Failed to Add Computer",
        description: "There was an error adding the computer",
        variant: "destructive",
      });
    },
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
      refetch();
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
      refetch();
    },
    onError: () => {
      toast({
        title: "Release Failed",
        description: "Failed to release computer",
        variant: "destructive",
      });
    },
  });

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

  const onSubmit = (data: AddComputerForm) => {
    addComputerMutation.mutate(data);
  };

  const displayComputers = computers ?? [];
  const availableComputers = displayComputers.filter((c) => c.status === 'available');
  const classroomsList = classrooms ?? [];
  const studentsList = students ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Laboratory Computer Management</h1>
          <p className="text-muted-foreground">Assign computers to students and monitor usage</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-computer">
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
              <SelectTrigger className="w-64" data-testid="select-classroom">
                <SelectValue placeholder="Select a classroom" />
              </SelectTrigger>
              <SelectContent>
                {classroomsList.map((classroom) => (
                  <SelectItem key={classroom.id} value={classroom.id.toString()}>
                    {classroom.name} - {classroom.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Computer Layout Grid */}
      {selectedClassroom && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {classroomsList.find((c) => c.id.toString() === selectedClassroom)?.name || 'Computer Layout'}
              </CardTitle>
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
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading computers...</div>
            ) : displayComputers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No computers found. Click "Add Computer" to add one.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-5 gap-4 mb-8">
                  {displayComputers.map((computer) => (
                    <div
                      key={computer.id}
                      className={`border-2 rounded-lg p-4 text-center relative ${getStatusColor(computer.status || 'available')}`}
                      data-testid={`computer-${computer.id}`}
                    >
                      <div className="absolute top-2 right-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusIndicator(computer.status || 'available')}`}></div>
                      </div>
                      <Monitor className={`text-2xl mb-2 mx-auto h-8 w-8 ${
                        computer.status === 'occupied' ? 'text-secondary' :
                        computer.status === 'maintenance' ? 'text-destructive' : 'text-muted-foreground'
                      }`} />
                      <div className="text-sm font-medium mb-1">{computer.name}</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        {(computer as any).assignedStudentName || 'Available'}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-2 py-1 h-auto"
                        onClick={() => {
                          if (computer.status === 'occupied') {
                            releaseComputerMutation.mutate(computer.id);
                          } else if (computer.status === 'maintenance') {
                            toast({
                              title: "Maintenance",
                              description: `${computer.name} is scheduled for repair`,
                            });
                          } else {
                            setSelectedComputer(computer.id.toString());
                          }
                        }}
                        data-testid={`button-${computer.status}-${computer.id}`}
                      >
                        {computer.status === 'occupied' && 'Release'}
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
                        <SelectTrigger data-testid="select-student">
                          <SelectValue placeholder="Select Student" />
                        </SelectTrigger>
                        <SelectContent>
                          {studentsList.map((student) => (
                            <SelectItem key={student.id} value={student.id.toString()}>
                              {student.firstName} {student.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Computer</label>
                      <Select value={selectedComputer} onValueChange={setSelectedComputer}>
                        <SelectTrigger data-testid="select-computer">
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
                        data-testid="button-assign-computer"
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
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Computer Statistics */}
      {selectedClassroom && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{displayComputers.length}</p>
                <p className="text-sm text-muted-foreground">Total Computers</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary">
                  {displayComputers.filter((c) => c.status === 'occupied').length}
                </p>
                <p className="text-sm text-muted-foreground">Occupied</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {displayComputers.filter((c) => c.status === 'available').length}
                </p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">
                  {displayComputers.filter((c) => c.status === 'maintenance').length}
                </p>
                <p className="text-sm text-muted-foreground">Maintenance</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Computer Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Computer</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Computer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PC-001" {...field} data-testid="input-computer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 192.168.1.101" {...field} data-testid="input-ip-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="classroomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Classroom</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-computer-classroom">
                          <SelectValue placeholder="Select a classroom" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classroomsList.map((classroom) => (
                          <SelectItem key={classroom.id} value={classroom.id.toString()}>
                            {classroom.name} - {classroom.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addComputerMutation.isPending}
                  data-testid="button-submit-computer"
                >
                  {addComputerMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Computer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
