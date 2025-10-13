import { useState, useMemo } from "react";
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
  UserPlus,
  Trash2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertComputerSchema, type Computer, type Student, type Classroom } from "@shared/schema";
import { z } from "zod";

type AddComputerForm = z.infer<typeof insertComputerSchema> & {
  name: string;
  classroomId: number;
};

export default function Computers() {
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedComputer, setSelectedComputer] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: classrooms } = useQuery<Classroom[]>({
    queryKey: ['/api/classrooms'],
  });
  
  const addComputerFormSchema = useMemo(() => {
    return z.object({
      name: z.string().min(1, "Computer name is required"),
      classroomId: z.number().min(1, "Please select a classroom"),
      status: z.string().optional(),
    });
  }, [classrooms]);

  const form = useForm<AddComputerForm>({
    resolver: zodResolver(addComputerFormSchema),
    defaultValues: {
      name: "",
      status: "available",
      classroomId: 0,
    },
  });

  const { data: students } = useQuery<Student[]>({
    queryKey: ['/api/students'],
  });

  const { data: computers, isLoading, refetch } = useQuery<Computer[]>({
    queryKey: ['/api/computers', selectedClassroom],
    queryFn: async () => {
      const url = selectedClassroom 
        ? `/api/computers?classroomId=${selectedClassroom}`
        : '/api/computers';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch computers');
      return res.json();
    },
    enabled: !!selectedClassroom,
  });

  const addComputerMutation = useMutation({
    mutationFn: async (data: AddComputerForm) => {
      const response = await apiRequest('POST', '/api/computers', data);
      return response;
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
    onError: async (error: any) => {
      let errorMessage = "There was an error adding the computer";
      try {
        const errorText = error.message || "";
        if (errorText.includes("already exists")) {
          errorMessage = errorText.split(": ")[1] || errorMessage;
        }
      } catch (e) {
        // Use default error message
      }
      toast({
        title: "Failed to Add Computer",
        description: errorMessage,
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

  const deleteComputerMutation = useMutation({
    mutationFn: async (computerId: number) => {
      await apiRequest('DELETE', `/api/computers/${computerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/computers'] });
      toast({
        title: "Computer Deleted",
        description: "Computer has been successfully removed",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete computer",
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Lab Computer Management</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Assign computers to students and monitor usage</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} data-testid="button-add-computer" size="sm" className="w-full sm:w-auto">
          <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="text-xs sm:text-sm">Add Computer</span>
        </Button>
      </div>

      {/* Lab Room Selection */}
      <Card>
        <CardContent className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-xs sm:text-sm font-medium">Select Laboratory:</label>
            <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
              <SelectTrigger className="w-full sm:w-64 text-xs sm:text-sm" data-testid="select-classroom">
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-8">
                  {displayComputers.map((computer) => (
                    <div
                      key={computer.id}
                      className={`border-2 rounded-lg p-2 sm:p-3 md:p-4 text-center relative ${getStatusColor(computer.status || 'available')}`}
                      data-testid={`computer-${computer.id}`}
                    >
                      <div className="absolute top-2 right-2 flex gap-1">
                        <div className={`w-3 h-3 rounded-full ${getStatusIndicator(computer.status || 'available')}`}></div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Delete ${computer.name}?`)) {
                              deleteComputerMutation.mutate(computer.id);
                            }
                          }}
                          data-testid={`button-delete-${computer.id}`}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
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
                <div className="bg-muted/50 rounded-lg p-3 sm:p-6">
                  <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Quick Assignment</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
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
