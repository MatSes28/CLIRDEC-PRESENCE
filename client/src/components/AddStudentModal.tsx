import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AddStudentModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddStudentModal({ open, onClose }: AddStudentModalProps) {
  const [formData, setFormData] = useState({
    studentId: '',
    firstName: '',
    lastName: '',
    email: '',
    gender: 'male',
    year: 1,
    section: '',
    rfidCardId: '',
    parentEmail: '',
    parentName: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createStudentMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create student');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Student added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/students'] });
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add student",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      studentId: '',
      firstName: '',
      lastName: '',
      email: '',
      gender: 'male',
      year: 1,
      section: '',
      rfidCardId: '',
      parentEmail: '',
      parentName: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.firstName || !formData.lastName || !formData.parentEmail || !formData.parentName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createStudentMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Fill in the student information below to add them to the system.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="studentId">Student ID *</Label>
              <Input
                id="studentId"
                value={formData.studentId}
                onChange={(e) => handleInputChange('studentId', e.target.value)}
                placeholder="2024-IT-001"
                required
              />
            </div>
            <div>
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                value={formData.section}
                onChange={(e) => handleInputChange('section', e.target.value)}
                placeholder="A"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Juan"
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Dela Cruz"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => handleInputChange('gender', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="year">Year Level</Label>
              <Select
                value={formData.year.toString()}
                onValueChange={(value) => handleInputChange('year', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Year</SelectItem>
                  <SelectItem value="2">2nd Year</SelectItem>
                  <SelectItem value="3">3rd Year</SelectItem>
                  <SelectItem value="4">4th Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="student@clsu.edu.ph"
            />
          </div>

          <div>
            <Label htmlFor="rfidCardId">RFID Card ID</Label>
            <Input
              id="rfidCardId"
              value={formData.rfidCardId}
              onChange={(e) => handleInputChange('rfidCardId', e.target.value)}
              placeholder="RFID123456"
            />
          </div>

          <div>
            <Label htmlFor="parentName">Parent/Guardian Name *</Label>
            <Input
              id="parentName"
              value={formData.parentName}
              onChange={(e) => handleInputChange('parentName', e.target.value)}
              placeholder="Maria Dela Cruz"
              required
            />
          </div>

          <div>
            <Label htmlFor="parentEmail">Parent/Guardian Email *</Label>
            <Input
              id="parentEmail"
              type="email"
              value={formData.parentEmail}
              onChange={(e) => handleInputChange('parentEmail', e.target.value)}
              placeholder="parent@email.com"
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createStudentMutation.isPending}>
              {createStudentMutation.isPending ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}