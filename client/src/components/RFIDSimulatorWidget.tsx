import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Users,
  Play
} from "lucide-react";

export function RFIDSimulatorWidget() {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [customRfid, setCustomRfid] = useState("");
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: students } = useQuery({
    queryKey: ['/api/students'],
  });

  const { data: activeSessions } = useQuery({
    queryKey: ['/api/sessions/active'],
    refetchInterval: 30000,
  });

  const simulateRfidMutation = useMutation({
    mutationFn: async (rfidData: { rfidCardId: string; studentId?: number; timestamp?: string }) => {
      const response = await fetch('/api/rfid/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rfidData),
      });
      if (!response.ok) throw new Error('Failed to simulate RFID tap');
      return response.json();
    },
    onSuccess: (data) => {
      setLastScanResult(data);
      toast({
        title: "RFID Simulation Complete",
        description: data.message || "RFID card scanned successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard-stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "RFID Simulation Failed", 
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSimulateRfid = () => {
    if (selectedStudent && students) {
      const student = students.find((s: any) => s.id === parseInt(selectedStudent));
      if (student) {
        simulateRfidMutation.mutate({
          rfidCardId: student.rfidCardId,
          studentId: student.id,
          timestamp: new Date().toISOString(),
        });
      }
    } else if (customRfid) {
      simulateRfidMutation.mutate({
        rfidCardId: customRfid.toUpperCase(),
        timestamp: new Date().toISOString(),
      });
    }
  };

  const getResultStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in': case 'checked_out': case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'checked_in_late': case 'late':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      case 'unknown_card': case 'no_active_session': case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
    }
  };

  const getResultIcon = (status: string) => {
    switch (status) {
      case 'checked_in': case 'checked_out': case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'unknown_card': case 'no_active_session': case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          RFID Scanner Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Sessions Status */}
        {activeSessions && (
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              {activeSessions.length > 0 
                ? `${activeSessions.length} active class session(s) - ready for attendance`
                : "No active class sessions - start a class to enable attendance tracking"
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Student Selection */}
        <div className="space-y-2">
          <Label>Select Student</Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a student to simulate..." />
            </SelectTrigger>
            <SelectContent>
              {students?.map((student: any) => (
                <SelectItem key={student.id} value={student.id.toString()}>
                  {student.firstName} {student.lastName} ({student.studentId})
                  {student.rfidCardId && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      RFID: {student.rfidCardId}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom RFID Input */}
        <div className="space-y-2">
          <Label>Or Enter Custom RFID</Label>
          <Input
            placeholder="e.g., A1B2C3D4"
            value={customRfid}
            onChange={(e) => setCustomRfid(e.target.value.toUpperCase())}
            maxLength={8}
          />
        </div>

        {/* Simulate Button */}
        <Button 
          onClick={handleSimulateRfid}
          disabled={(!selectedStudent && !customRfid) || simulateRfidMutation.isPending}
          className="w-full"
          size="lg"
        >
          <Play className="h-4 w-4 mr-2" />
          {simulateRfidMutation.isPending ? "Simulating..." : "Simulate RFID Tap"}
        </Button>

        {/* Last Scan Result */}
        {lastScanResult && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Last Scan Result</h4>
              <div className="flex items-center gap-1">
                {getResultIcon(lastScanResult.status)}
                <Badge className={getResultStatusColor(lastScanResult.status)}>
                  {lastScanResult.status}
                </Badge>
              </div>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {lastScanResult.student && (
                <div>Student: {lastScanResult.student.name}</div>
              )}
              {lastScanResult.rfidCardId && (
                <div>RFID: {lastScanResult.rfidCardId}</div>
              )}
              <div>Message: {lastScanResult.message}</div>
              <div>Time: {new Date(lastScanResult.timestamp).toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStudent("");
              setCustomRfid("");
              setLastScanResult(null);
            }}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/sessions/active'] })}
          >
            Refresh Sessions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}