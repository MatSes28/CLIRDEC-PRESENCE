import { storage } from "../storage";

export async function generateAttendanceTrendData() {
  try {
    // Get attendance data for the last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const trendData = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const sessions = await storage.getClassSessionsByDate(new Date(d));
      
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalLate = 0;
      
      let totalExcused = 0;
      
      for (const session of sessions) {
        const attendance = await storage.getAttendanceBySession(session.id);
        totalPresent += attendance.filter(a => a.status === 'present').length;
        totalAbsent += attendance.filter(a => a.status === 'absent').length;
        totalLate += attendance.filter(a => a.status === 'late').length;
        totalExcused += attendance.filter(a => a.status === 'excused').length;
      }
      
      const total = totalPresent + totalAbsent + totalLate + totalExcused;
      // Excused absences should count as attendance
      const totalAttended = totalPresent + totalLate + totalExcused;
      const attendanceRate = total > 0 ? Math.round((totalAttended / total) * 100) : 0;
      
      trendData.push({
        date: new Date(d).toISOString().split('T')[0],
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        excused: totalExcused,
        attendanceRate
      });
    }
    
    return trendData;
  } catch (error) {
    console.error("Error generating attendance trend data:", error);
    return [];
  }
}

export async function generateStudentPerformanceData() {
  try {
    const students = await storage.getStudents();
    const performanceData = [];
    
    for (const student of students) {
      // Get all attendance records for this student
      const allSessions = await storage.getAllClassSessions();
      let totalClasses = 0;
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;
      
      for (const session of allSessions) {
        const attendance = await storage.getAttendanceBySession(session.id);
        const studentAttendance = attendance.find(a => a.studentId === student.id);
        
        if (studentAttendance) {
          totalClasses++;
          if (studentAttendance.status === 'present') presentCount++;
          else if (studentAttendance.status === 'absent') absentCount++;
          else if (studentAttendance.status === 'late') lateCount++;
          else if (studentAttendance.status === 'excused') excusedCount++;
        }
      }
      
      // Excused absences should count as attendance, not penalize the student
      const totalAttended = presentCount + lateCount + excusedCount;
      const attendanceRate = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
      
      performanceData.push({
        name: `${student.firstName} ${student.lastName}`,
        attendanceRate,
        totalClasses,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        excused: excusedCount
      });
    }
    
    return performanceData.sort((a, b) => b.attendanceRate - a.attendanceRate);
  } catch (error) {
    console.error("Error generating student performance data:", error);
    return [];
  }
}

export async function generateDailyReport(date: Date) {
  try {
    const sessions = await storage.getClassSessionsByDate(date);
    const report = {
      date: date.toISOString().split('T')[0],
      totalSessions: sessions.length,
      attendanceData: [] as any[]
    };
    
    for (const session of sessions) {
      const attendance = await storage.getAttendanceBySession(session.id);
      const present = attendance.filter(a => a.status === 'present' || a.status === 'late').length;
      const absent = attendance.filter(a => a.status === 'absent').length;
      const excused = attendance.filter(a => a.status === 'excused').length;
      
      // Excused absences count as attendance, not against the student
      const totalAttended = present + excused;
      
      report.attendanceData.push({
        sessionId: session.id,
        subject: `Session ${session.id}`,
        totalStudents: attendance.length,
        present,
        absent,
        excused,
        attendanceRate: attendance.length > 0 ? Math.round((totalAttended / attendance.length) * 100) : 0
      });
    }
    
    return report;
  } catch (error) {
    console.error("Error generating daily report:", error);
    return null;
  }
}