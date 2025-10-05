import { storage } from '../storage';
import { sendEmailNotification } from './emailService';

// Attendance behavior thresholds
const ATTENDANCE_THRESHOLDS = {
  EXCELLENT: 95,    // 95% and above
  GOOD: 85,         // 85-94%
  AVERAGE: 75,      // 75-84%
  CONCERNING: 60,   // 60-74%
  CRITICAL: 50      // Below 60%
};

const ALERT_RULES = {
  // Consecutive absences that trigger alerts
  CONSECUTIVE_ABSENCES: 3,
  
  // Number of late arrivals in a week that triggers alert
  LATE_ARRIVALS_WEEKLY: 3,
  
  // Minimum days to calculate attendance rate
  MIN_DAYS_FOR_CALCULATION: 5,
  
  // Days to wait before sending follow-up alerts
  ALERT_COOLDOWN_DAYS: 7
};

export interface AttendanceBehavior {
  studentId: number;
  attendanceRate: number;
  consecutiveAbsences: number;
  lateArrivalsThisWeek: number;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  behaviorLevel: 'excellent' | 'good' | 'average' | 'concerning' | 'critical';
  requiresAlert: boolean;
  alertReason: string[];
}

export async function analyzeStudentAttendanceBehavior(studentId: number): Promise<AttendanceBehavior> {
  // Get student's attendance records for the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // For now, we'll use mock data - in production this would query actual attendance records
  const attendanceRecords = await getStudentAttendanceRecords(studentId, thirtyDaysAgo);
  
  const totalClasses = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r: any) => r.status === 'present').length;
  const absentCount = attendanceRecords.filter((r: any) => r.status === 'absent').length;
  const lateCount = attendanceRecords.filter((r: any) => r.status === 'late').length;
  
  const attendanceRate = totalClasses > 0 ? (presentCount + lateCount) / totalClasses * 100 : 100;
  
  // Calculate consecutive absences
  const consecutiveAbsences = calculateConsecutiveAbsences(attendanceRecords);
  
  // Calculate late arrivals this week
  const lateArrivalsThisWeek = calculateLateArrivalsThisWeek(attendanceRecords);
  
  // Determine behavior level
  const behaviorLevel = determineBehaviorLevel(attendanceRate);
  
  // Check if alerts are required
  const alertReasons: string[] = [];
  let requiresAlert = false;
  
  if (totalClasses >= ALERT_RULES.MIN_DAYS_FOR_CALCULATION) {
    // Check attendance rate
    if (attendanceRate < ATTENDANCE_THRESHOLDS.CONCERNING) {
      alertReasons.push(`Low attendance rate: ${attendanceRate.toFixed(1)}%`);
      requiresAlert = true;
    }
    
    // Check consecutive absences
    if (consecutiveAbsences >= ALERT_RULES.CONSECUTIVE_ABSENCES) {
      alertReasons.push(`${consecutiveAbsences} consecutive absences`);
      requiresAlert = true;
    }
    
    // Check late arrivals
    if (lateArrivalsThisWeek >= ALERT_RULES.LATE_ARRIVALS_WEEKLY) {
      alertReasons.push(`${lateArrivalsThisWeek} late arrivals this week`);
      requiresAlert = true;
    }
  }
  
  return {
    studentId,
    attendanceRate,
    consecutiveAbsences,
    lateArrivalsThisWeek,
    totalClasses,
    presentCount,
    absentCount,
    lateCount,
    behaviorLevel,
    requiresAlert,
    alertReason: alertReasons
  };
}

async function getStudentAttendanceRecords(studentId: number, since: Date) {
  // Fetch actual attendance records from the database
  try {
    // Get all attendance records for this student
    const allRecords = await storage.getAttendanceByStudent(studentId);
    
    // Get all class sessions to map attendance records to dates
    const sessions = await storage.getAllClassSessions();
    const sessionMap = new Map(sessions.map(s => [s.id, s]));
    
    // Map records to include actual session dates
    const recordsWithDates = allRecords
      .map((record: any) => {
        const session = record.sessionId ? sessionMap.get(record.sessionId) : null;
        const sessionDate = session?.date || session?.createdAt || record.createdAt || new Date();
        
        return {
          date: sessionDate,
          status: record.status || 'absent',
          checkInTime: record.checkInTime,
          checkOutTime: record.checkOutTime,
          sessionId: record.sessionId
        };
      })
      .filter((record: any) => record.date); // Remove records without valid dates
    
    // If no records found, return empty array (student hasn't attended any classes yet)
    if (recordsWithDates.length === 0) {
      return [];
    }
    
    // Filter by date range
    const filteredRecords = recordsWithDates.filter((record: any) => {
      const recordDate = new Date(record.date);
      return recordDate >= since;
    });
    
    // Sort by date descending (most recent first)
    return filteredRecords.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error(`Error fetching attendance records for student ${studentId}:`, error);
    // Return empty array if error occurs
    return [];
  }
}

function calculateConsecutiveAbsences(records: any[]): number {
  let consecutive = 0;
  
  // Sort by date descending (most recent first)
  const sortedRecords = records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  for (const record of sortedRecords) {
    if (record.status === 'absent') {
      consecutive++;
    } else {
      break;
    }
  }
  
  return consecutive;
}

function calculateLateArrivalsThisWeek(records: any[]): number {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  return records.filter(record => {
    const recordDate = new Date(record.date);
    return recordDate >= oneWeekAgo && record.status === 'late';
  }).length;
}

function determineBehaviorLevel(attendanceRate: number): AttendanceBehavior['behaviorLevel'] {
  if (attendanceRate >= ATTENDANCE_THRESHOLDS.EXCELLENT) return 'excellent';
  if (attendanceRate >= ATTENDANCE_THRESHOLDS.GOOD) return 'good';
  if (attendanceRate >= ATTENDANCE_THRESHOLDS.AVERAGE) return 'average';
  if (attendanceRate >= ATTENDANCE_THRESHOLDS.CONCERNING) return 'concerning';
  return 'critical';
}

export async function checkAllStudentsAttendanceBehavior(): Promise<{studentsAnalyzed: number; alertsSent: number}> {
  console.log('Starting automated attendance behavior monitoring...');
  
  try {
    // Get all students
    const students = await storage.getStudents();
    let alertsSent = 0;
    
    // Process students in smaller batches to reduce memory usage
    const batchSize = 3; // Reduced batch size for better memory management
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      
      for (const student of batch) {
        try {
          // Analyze each student's behavior
          const behavior = await analyzeStudentAttendanceBehavior(student.id);
          
          if (behavior.requiresAlert) {
            // Check if we've sent an alert recently to avoid spam
            const recentAlert = await checkRecentAlert(student.id);
            
            if (!recentAlert) {
              await sendAttendanceAlert(student, behavior);
              alertsSent++;
            }
          }
          
          // Force garbage collection after each student to prevent memory buildup
          if (global.gc && i % 2 === 0) {
            global.gc();
          }
          
        } catch (error) {
          console.error(`Error analyzing behavior for student ${student.id}:`, error);
        }
      }
      
      // Longer delay between batches to prevent memory spikes and allow cleanup
      if (i + batchSize < students.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`Attendance monitoring completed. ${alertsSent} alerts sent.`);
    return { studentsAnalyzed: students.length, alertsSent };
  } catch (error) {
    console.error('Error in attendance behavior monitoring:', error);
    return { studentsAnalyzed: 0, alertsSent: 0 };
  }
}

async function checkRecentAlert(studentId: number): Promise<boolean> {
  // Check if we've sent an attendance alert to this student in the last week
  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - ALERT_RULES.ALERT_COOLDOWN_DAYS);
  
  // In production, this would query the email_notifications table
  // For now, we'll return false to allow alerts
  return false;
}

async function sendAttendanceAlert(student: any, behavior: AttendanceBehavior): Promise<void> {
  const alertLevel = behavior.behaviorLevel === 'critical' ? 'URGENT' : 'CONCERNING';
  
  const subject = `${alertLevel}: Attendance Alert for ${student.firstName} ${student.lastName} - ${student.studentId}`;
  
  const message = generateAttendanceAlertMessage(student, behavior);
  
  try {
    // Send email to parent if parent email exists
    if (student.parentEmail) {
      await storage.createEmailNotification({
        studentId: student.id,
        recipientEmail: student.parentEmail,
        recipientName: student.parentName || 'Parent/Guardian',
        subject,
        message,
        priority: behavior.behaviorLevel === 'critical' ? 'urgent' : 'high',
        type: 'attendance_alert',
        status: 'pending',
        sentBy: 'system'
      });
      
      console.log(`Attendance alert queued for ${student.firstName} ${student.lastName} - Parent: ${student.parentEmail}`);
    }
    
    // Also send to student if email exists
    if (student.email) {
      await storage.createEmailNotification({
        studentId: student.id,
        recipientEmail: student.email,
        recipientName: `${student.firstName} ${student.lastName}`,
        subject: `Attendance Notice - ${student.studentId}`,
        message: generateStudentAttendanceMessage(student, behavior),
        priority: 'normal',
        type: 'attendance_notice',
        status: 'pending',
        sentBy: 'system'
      });
    }
    
  } catch (error) {
    console.error(`Failed to create attendance alert for student ${student.id}:`, error);
  }
}

function generateAttendanceAlertMessage(student: any, behavior: AttendanceBehavior): string {
  const alertLevel = behavior.behaviorLevel === 'critical' ? 'URGENT ATTENTION REQUIRED' : 'ATTENTION REQUIRED';
  
  return `Dear ${student.parentName || 'Parent/Guardian'},

${alertLevel}: We are writing to inform you about ${student.firstName} ${student.lastName}'s recent attendance pattern that requires your immediate attention.

ATTENDANCE SUMMARY:
• Student ID: ${student.studentId}
• Current Attendance Rate: ${behavior.attendanceRate.toFixed(1)}%
• Total Classes: ${behavior.totalClasses}
• Present: ${behavior.presentCount} classes
• Absent: ${behavior.absentCount} classes
• Late Arrivals: ${behavior.lateCount} classes

SPECIFIC CONCERNS:
${behavior.alertReason.map(reason => `• ${reason}`).join('\n')}

RECOMMENDED ACTIONS:
1. Please discuss with ${student.firstName} the importance of regular class attendance
2. If there are health or family issues affecting attendance, please contact us immediately
3. We recommend scheduling a meeting to discuss support strategies
4. Monitor ${student.firstName}'s daily school attendance closely

Regular attendance is crucial for academic success. Students with attendance rates below 75% are at significant risk of academic failure and may face administrative consequences.

If you have any concerns or need support, please don't hesitate to contact us:
• Email: ${student.email || 'info@clsu.edu.ph'}
• Phone: (044) 456-0279

We are here to work together to ensure ${student.firstName}'s academic success.

Best regards,
CLSU Information Technology Department
Automated Attendance Monitoring System

---
This is an automated alert. If you received this in error, please contact the IT department immediately.`;
}

function generateStudentAttendanceMessage(student: any, behavior: AttendanceBehavior): string {
  return `Dear ${student.firstName},

This is a notice regarding your recent attendance pattern that requires your attention.

ATTENDANCE SUMMARY:
• Current Attendance Rate: ${behavior.attendanceRate.toFixed(1)}%
• Total Classes: ${behavior.totalClasses}
• Absences: ${behavior.absentCount} classes
• Late Arrivals: ${behavior.lateCount} classes

AREAS OF CONCERN:
${behavior.alertReason.map(reason => `• ${reason}`).join('\n')}

NEXT STEPS:
1. Improve your daily attendance and punctuality
2. If you're facing challenges, please reach out to your professors or counselors
3. Remember that attendance directly impacts your academic performance
4. A copy of this notice has been sent to your parent/guardian

Regular attendance is essential for your academic success. Let's work together to improve your attendance record.

Best regards,
CLSU Information Technology Department

Student Portal: https://student.clsu.edu.ph
Academic Calendar: https://clsu.edu.ph/calendar`;
}

// Function to be called periodically (e.g., daily via cron job)
// DISABLED: Automatic monitoring causes spam when email service is not configured
export async function startAttendanceMonitoring(): Promise<void> {
  console.log('⚠️ Automated attendance monitoring is disabled by default');
  console.log('💡 To manually trigger monitoring, use the API endpoint: POST /api/attendance/trigger-monitoring');
  console.log('📧 Email notifications will be queued and can be sent manually via: POST /api/email/process-queue');
  
  // Automatic monitoring disabled to prevent spam
  // await checkAllStudentsAttendanceBehavior();
  
  // setInterval(async () => {
  //   if (global.gc) {
  //     global.gc();
  //     await new Promise(resolve => setTimeout(resolve, 500));
  //   }
  //   
  //   try {
  //     const { EmergencyMemoryOptimizer } = await import('../utils/emergencyMemoryOptimizer');
  //     await EmergencyMemoryOptimizer.forceEmergencyCleanup();
  //   } catch (error) {
  //     console.log('Emergency optimizer not available');
  //   }
  //   
  //   await checkAllStudentsAttendanceBehavior();
  //   
  //   if (global.gc) {
  //     global.gc();
  //   }
  // }, 24 * 60 * 60 * 1000);
}

// Manual trigger for attendance monitoring (called via API)
export async function triggerAttendanceMonitoring(): Promise<{success: boolean; studentsAnalyzed: number; alertsQueued: number}> {
  console.log('📊 Manual attendance monitoring triggered');
  
  try {
    const result = await checkAllStudentsAttendanceBehavior();
    
    return {
      success: true,
      studentsAnalyzed: result.studentsAnalyzed || 0,
      alertsQueued: result.alertsSent || 0
    };
  } catch (error) {
    console.error('Error in manual attendance monitoring:', error);
    return {
      success: false,
      studentsAnalyzed: 0,
      alertsQueued: 0
    };
  }
}