import { storage } from "../storage";

export interface AutoStartResult {
  sessionsStarted: number;
  schedulesChecked: number;
  errors: string[];
}

export async function checkAutoStartSessions(): Promise<AutoStartResult> {
  const result: AutoStartResult = {
    sessionsStarted: 0,
    schedulesChecked: 0,
    errors: []
  };

  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
    
    // Get all schedules that have auto-start enabled
    const schedules = await storage.getSchedules();
    const autoStartSchedules = schedules.filter(s => s.autoStart && s.isActive);
    
    result.schedulesChecked = autoStartSchedules.length;

    for (const schedule of autoStartSchedules) {
      try {
        // Check if this schedule should start now (within 5-minute buffer)
        if (shouldStartSession(schedule, currentDay, currentTime)) {
          // Check if session already exists for today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const existingSessions = await storage.getClassSessionsByDate(today);
          const sessionExists = existingSessions.some(session => 
            session.scheduleId === schedule.id && 
            session.date.toDateString() === now.toDateString()
          );

          if (!sessionExists) {
            // Create new class session
            await storage.createClassSession({
              scheduleId: schedule.id,
              date: now,
              startTime: now,
              status: 'active',
              professorId: schedule.professorId
            });

            result.sessionsStarted++;
            console.log(`Auto-started session for schedule ${schedule.id}`);
          }
        }
      } catch (error) {
        const errorMsg = `Failed to process schedule ${schedule.id}: ${error}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

  } catch (error) {
    const errorMsg = `Error in checkAutoStartSessions: ${error}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);
  }

  return result;
}

function shouldStartSession(schedule: any, currentDay: number, currentTime: string): boolean {
  // Convert Sunday = 0 to Sunday = 7 for database compatibility
  const scheduleDay = currentDay === 0 ? 7 : currentDay;
  
  if (schedule.dayOfWeek !== scheduleDay) {
    return false;
  }

  // Get auto-start buffer from settings (default 5 minutes)
  const bufferMinutes = 5;
  const scheduleStartTime = timeStringToMinutes(schedule.startTime);
  const currentTimeMinutes = timeStringToMinutes(currentTime);
  const bufferStartTime = scheduleStartTime - bufferMinutes;

  // Start session if current time is within buffer before start time
  return currentTimeMinutes >= bufferStartTime && currentTimeMinutes <= scheduleStartTime;
}

function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

export async function endExpiredSessions(): Promise<number> {
  let endedSessions = 0;

  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = await storage.getClassSessionsByDate(today);
    const activeSessions = todaySessions.filter(session => session.status === 'active');

    for (const session of activeSessions) {
      try {
        // Get schedule to check end time
        const schedules = await storage.getSchedules();
        const schedule = schedules.find(s => s.id === session.scheduleId);
        
        if (schedule) {
          const endTimeMinutes = timeStringToMinutes(schedule.endTime);
          const currentTimeMinutes = timeStringToMinutes(
            `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
          );

          // End session if current time is past scheduled end time
          if (currentTimeMinutes > endTimeMinutes) {
            await storage.updateClassSession(session.id, {
              status: 'completed',
              endTime: now
            });
            endedSessions++;
            console.log(`Auto-ended session ${session.id}`);
          }
        }
      } catch (error) {
        console.error(`Error ending session ${session.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in endExpiredSessions:', error);
  }

  return endedSessions;
}

// Check for attendance issues and send notifications
export async function checkAttendanceAlerts(): Promise<void> {
  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaySessions = await storage.getClassSessionsByDate(today);
    const activeSessions = todaySessions.filter(session => session.status === 'active');

    for (const session of activeSessions) {
      const attendanceRecords = await storage.getAttendanceBySession(session.id);
      
      for (const record of attendanceRecords) {
        // Check for late arrivals (15+ minutes after start)
        if (record.checkInTime && session.startTime) {
          const timeDiff = (record.checkInTime.getTime() - session.startTime.getTime()) / (1000 * 60);
          
          if (timeDiff > 15 && record.status !== 'late') {
            // Update status to late and send notification
            await storage.updateAttendance(record.id, { status: 'late' });
            
            // Queue late arrival notification
            const { sendEmailNotification } = await import('./emailService');
            await sendEmailNotification(record.studentId, 'late_arrival');
          }
        }
        
        // Check for absences after grace period
        if (!record.checkInTime && session.startTime) {
          const timeDiff = (now.getTime() - session.startTime.getTime()) / (1000 * 60);
          
          if (timeDiff > 30 && record.status === 'absent') {
            // Send absence notification
            const { sendEmailNotification } = await import('./emailService');
            await sendEmailNotification(record.studentId, 'absence_alert');
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking attendance alerts:', error);
  }
}

// Run schedule checks every minute
setInterval(async () => {
  try {
    await checkAutoStartSessions();
    await endExpiredSessions();
    await checkAttendanceAlerts();
  } catch (error) {
    console.error('Error in scheduled tasks:', error);
  }
}, 60 * 1000); // Run every minute
