import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  AlertTriangle, 
  Send, 
  User,
  Calendar,
  Clock
} from "lucide-react";

interface ContactStudentModalProps {
  open: boolean;
  onClose: () => void;
  student: any;
  type: 'contact' | 'alert';
}

export default function ContactStudentModal({ open, onClose, student, type }: ContactStudentModalProps) {
  const { toast } = useToast();
  
  const [emailData, setEmailData] = useState({
    recipientType: 'parent',
    subject: '',
    message: '',
    priority: 'normal'
  });

  const isAlert = type === 'alert';

  const sendEmailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/notifications/send-email', {
        method: 'POST',
        body: JSON.stringify({
          studentId: student.id,
          recipientType: data.recipientType,
          subject: data.subject,
          message: data.message,
          priority: data.priority,
          type: isAlert ? 'attendance_alert' : 'general_communication'
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to send email');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email Sent",
        description: `${isAlert ? 'Alert' : 'Message'} has been sent successfully.`,
      });
      onClose();
      setEmailData({
        recipientType: 'parent',
        subject: '',
        message: '',
        priority: 'normal'
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Failed to send email",
        variant: "destructive"
      });
    }
  });

  const getDefaultSubject = () => {
    const studentName = `${student.firstName} ${student.lastName}`;
    const attendanceRate = 85; // Default value since not calculated yet
    if (isAlert && attendanceRate < 60) {
      return `Attendance Alert for ${studentName} - ${student.studentId}`;
    } else if (isAlert) {
      return `Attendance Notification for ${studentName} - ${student.studentId}`;
    }
    return `Message regarding ${studentName} - ${student.studentId}`;
  };

  const getDefaultMessage = () => {
    const studentName = `${student.firstName} ${student.lastName}`;
    const attendanceRate = 85; // Default value since not calculated yet
    if (isAlert && attendanceRate < 60) {
      return `Dear Parent/Guardian,

We would like to inform you that ${studentName} (${student.studentId}) has been showing concerning attendance patterns.

Current Attendance Rate: ${attendanceRate}%

We encourage you to discuss with your child the importance of regular class attendance. If there are any circumstances affecting attendance, please don't hesitate to contact us.

Best regards,
CLSU Information Technology Department`;
    } else if (isAlert) {
      return `Dear Parent/Guardian,

This is a notification regarding ${student.name}'s (${student.studentId}) attendance.

Current Attendance Rate: ${student.attendanceRate}%

Thank you for supporting your child's education.

Best regards,
CLSU Information Technology Department`;
    }
    
    return `Dear Parent/Guardian,

We hope this message finds you well. We are writing regarding ${student.name} (${student.studentId}).

Please feel free to contact us if you have any questions or concerns.

Best regards,
CLSU Information Technology Department`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailData.subject || !emailData.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in both subject and message",
        variant: "destructive"
      });
      return;
    }

    sendEmailMutation.mutate(emailData);
  };

  const handleUseTemplate = () => {
    setEmailData({
      ...emailData,
      subject: getDefaultSubject(),
      message: getDefaultMessage()
    });
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAlert ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Mail className="h-5 w-5" />
            )}
            {isAlert ? 'Send Attendance Alert' : 'Contact Parent/Guardian'}
          </DialogTitle>
          <DialogDescription>
            {isAlert 
              ? `Send an attendance alert for ${student.name}` 
              : `Send a message regarding ${student.name}`
            }
          </DialogDescription>
        </DialogHeader>
        
        {/* Student Info */}
        <div className="bg-muted/50 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-3">
            <img 
              src={student.profileImage} 
              alt={student.name}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h3 className="font-medium">{student.name}</h3>
              <p className="text-sm text-muted-foreground">{student.studentId} • {student.year} - {student.section}</p>
              <p className="text-sm text-muted-foreground">
                Attendance: {student.attendanceRate}% 
                {student.attendanceRate < 60 && (
                  <span className="text-destructive ml-1">(Below threshold)</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="recipientType">Send To</Label>
              <Select 
                value={emailData.recipientType} 
                onValueChange={(value) => setEmailData({...emailData, recipientType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Parent ({student.parentEmail})</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="student">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Student ({student.email || 'No email'})</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="both">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Both Parent & Student</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={emailData.priority} 
                onValueChange={(value) => setEmailData({...emailData, priority: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="subject">Subject *</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={handleUseTemplate}
              >
                Use Template
              </Button>
            </div>
            <Input
              id="subject"
              value={emailData.subject}
              onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
              placeholder="Enter email subject"
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={emailData.message}
              onChange={(e) => setEmailData({...emailData, message: e.target.value})}
              placeholder="Enter your message"
              rows={8}
              className="resize-none"
            />
          </div>

          {/* Email Preview Info */}
          <div className="bg-muted/30 rounded-lg p-3 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1 mb-1">
              <Calendar className="h-3 w-3" />
              <span>Will be sent on: {new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>Time: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={sendEmailMutation.isPending}
              className={isAlert ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90"}
            >
              <Send className="mr-2 h-4 w-4" />
              {sendEmailMutation.isPending 
                ? "Sending..." 
                : isAlert 
                  ? "Send Alert" 
                  : "Send Message"
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}