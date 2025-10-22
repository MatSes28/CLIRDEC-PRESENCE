-- Migration to add excuse tracking fields to attendance table
-- This allows faculty to mark students as excused with medical certificates or valid reasons

-- Add excuse reason field (medical, family_emergency, school_event, other)
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS excuse_reason VARCHAR;

-- Add excuse notes field for additional details
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS excuse_notes TEXT;

-- Add excused_by field to track which professor marked it as excused
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS excused_by VARCHAR REFERENCES users(id);

-- Add excused_at timestamp to track when it was marked as excused
ALTER TABLE attendance 
ADD COLUMN IF NOT EXISTS excused_at TIMESTAMP;

-- Add comment to document the new status option
COMMENT ON COLUMN attendance.status IS 'Attendance status: present, late, absent, excused';
COMMENT ON COLUMN attendance.excuse_reason IS 'Reason for excused absence: medical, family_emergency, school_event, other';
COMMENT ON COLUMN attendance.excuse_notes IS 'Additional details about the excuse (e.g., medical certificate details)';
COMMENT ON COLUMN attendance.excused_by IS 'Professor ID who marked the student as excused';
COMMENT ON COLUMN attendance.excused_at IS 'Timestamp when the absence was marked as excused';
