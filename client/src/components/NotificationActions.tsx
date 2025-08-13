import { useState } from 'react';
import { Mail, Phone, Eye, UserCheck, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface NotificationActionsProps {
  studentId: string;
  studentName: string;
  behaviorLevel: 'critical' | 'concerning' | 'warning';
  parentEmail: string;
  onActionComplete?: () => void;
}

export default function NotificationActions({
  studentId,
  studentName,
  behaviorLevel,
  parentEmail,
  onActionComplete
}: NotificationActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isActioning, setIsActioning] = useState(false);

  const sendEmailMutation = useMutation({
    mutationFn: async (type: 'warning' | 'urgent') => {
      const response = await fetch('/api/notifications/send-parent-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          parentEmail,
          type,
          behaviorLevel
        })
      });
      if (!response.ok) throw new Error('Failed to send email');
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Email Sent Successfully",
        description: `${variables === 'urgent' ? 'Urgent' : 'Warning'} notification sent to parent`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/behavior-analysis'] });
      onActionComplete?.();
    },
    onError: () => {
      toast({
        title: "Failed to Send Email",
        description: "Please try again or contact system administrator",
        variant: "destructive"
      });
    }
  });

  const markInterventionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/attendance/mark-intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId })
      });
      if (!response.ok) throw new Error('Failed to mark intervention');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Intervention Recorded",
        description: "Student intervention has been documented",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/behavior-analysis'] });
      onActionComplete?.();
    },
    onError: () => {
      toast({
        title: "Failed to Record Intervention",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  });

  const getActionButtons = () => {
    const buttons = [];

    if (behaviorLevel === 'critical') {
      buttons.push(
        <Button
          key="urgent-email"
          variant="destructive"
          size="sm"
          onClick={() => sendEmailMutation.mutate('urgent')}
          disabled={sendEmailMutation.isPending}
          className="flex items-center space-x-1"
        >
          <Mail className="h-3 w-3" />
          <span>Send Urgent Email</span>
        </Button>
      );
    }

    if (behaviorLevel === 'concerning' || behaviorLevel === 'critical') {
      buttons.push(
        <Button
          key="warning-email"
          variant="outline"
          size="sm"
          onClick={() => sendEmailMutation.mutate('warning')}
          disabled={sendEmailMutation.isPending}
          className="flex items-center space-x-1"
        >
          <Mail className="h-3 w-3" />
          <span>Send Warning</span>
        </Button>
      );
    }

    buttons.push(
      <Button
        key="mark-intervention"
        variant="secondary"
        size="sm"
        onClick={() => markInterventionMutation.mutate()}
        disabled={markInterventionMutation.isPending}
        className="flex items-center space-x-1"
      >
        <UserCheck className="h-3 w-3" />
        <span>Mark Intervention</span>
      </Button>
    );

    return buttons;
  };

  return (
    <Card className="border-l-4 border-l-primary bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <span>Action Required: {studentName}</span>
          </div>
          <Badge 
            variant={behaviorLevel === 'critical' ? 'destructive' : 'secondary'}
            className="text-xs"
          >
            {behaviorLevel.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-3 w-3" />
            <span>Immediate attention required for attendance issues</span>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-3 w-3" />
            <span>Parent contact: {parentEmail}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {getActionButtons()}
        </div>
        
        {(sendEmailMutation.isPending || markInterventionMutation.isPending) && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
            <span>Processing action...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}