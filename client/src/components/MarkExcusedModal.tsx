import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText } from "lucide-react";

interface MarkExcusedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attendanceRecord: {
    id: number;
    student: {
      firstName: string;
      lastName: string;
      studentId: string;
    };
    status: string;
  } | null;
  onMarkExcused: (data: { excuseReason: string; excuseNotes: string }) => void;
  isLoading?: boolean;
}

const excuseReasons = [
  { value: "medical", label: "Medical Certificate" },
  { value: "family_emergency", label: "Family Emergency" },
  { value: "school_event", label: "School Event/Activity" },
  { value: "other", label: "Other" },
];

export function MarkExcusedModal({
  open,
  onOpenChange,
  attendanceRecord,
  onMarkExcused,
  isLoading = false,
}: MarkExcusedModalProps) {
  const [excuseReason, setExcuseReason] = useState("");
  const [excuseNotes, setExcuseNotes] = useState("");

  const handleSubmit = () => {
    if (!excuseReason) {
      return;
    }
    onMarkExcused({ excuseReason, excuseNotes });
    setExcuseReason("");
    setExcuseNotes("");
  };

  const handleClose = () => {
    setExcuseReason("");
    setExcuseNotes("");
    onOpenChange(false);
  };

  if (!attendanceRecord) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mark Absence as Excused
          </DialogTitle>
          <DialogDescription>
            Change the attendance status from "Absent" to "Excused" for this
            student. This is typically used when a student has a valid reason
            like a medical certificate or family emergency.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Student</Label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">
                {attendanceRecord.student.firstName}{" "}
                {attendanceRecord.student.lastName}
              </p>
              <p className="text-sm text-muted-foreground">
                {attendanceRecord.student.studentId}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Current Status:{" "}
              <span className="text-destructive capitalize">
                {attendanceRecord.status}
              </span>
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excuse-reason">
              Excuse Reason <span className="text-destructive">*</span>
            </Label>
            <Select value={excuseReason} onValueChange={setExcuseReason}>
              <SelectTrigger id="excuse-reason">
                <SelectValue placeholder="Select a reason..." />
              </SelectTrigger>
              <SelectContent>
                {excuseReasons.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="excuse-notes">
              Additional Notes{" "}
              <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Textarea
              id="excuse-notes"
              placeholder="Enter any additional details about the excuse (e.g., medical certificate number, event name, etc.)"
              value={excuseNotes}
              onChange={(e) => setExcuseNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This information will be saved with the attendance record for
              reference.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!excuseReason || isLoading}
          >
            {isLoading ? "Saving..." : "Mark as Excused"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
