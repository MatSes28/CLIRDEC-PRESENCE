import { storage } from "../storage";

// Email service configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "matt.feria@clsu2.edu.ph";

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export async function sendEmailNotification(
  studentId: number,
  type: 'absence_alert' | 'late_arrival' | 'daily_summary',
  customMessage?: string
): Promise<void> {
  try {
    const student = await storage.getStudent(studentId);
    if (!student || !student.parentEmail) {
      console.log(`No parent email found for student ${studentId}`);
      return;
    }

    const template = generateEmailTemplate(type, student, customMessage);
    
    // Create notification record
    await storage.createEmailNotification({
      type,
      message: customMessage || template.text,
      subject: template.subject,
      recipientEmail: student.parentEmail,
      studentId,
      content: template.html,
      status: 'pending'
    });

    // If SendGrid API key is available, send immediately
    if (SENDGRID_API_KEY) {
      await sendEmail({
        to: student.parentEmail,
        from: FROM_EMAIL,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
    } else {
      console.log(`Email notification queued for ${student.parentEmail} (no API key configured)`);
    }

  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
}

function generateEmailTemplate(
  type: string,
  student: any,
  customMessage?: string
): EmailTemplate {
  const studentName = `${student.firstName} ${student.lastName}`;
  const currentDate = new Date().toLocaleDateString();

  switch (type) {
    case 'absence_alert':
      return {
        subject: `Attendance Alert - ${studentName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1976D2; color: white; padding: 20px; text-align: center;">
              <h1>CLIRDEC: PRESENCE</h1>
              <p>Central Luzon State University - Attendance Monitoring System</p>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #d32f2f;">Attendance Alert</h2>
              <p>Dear Parent/Guardian,</p>
              <p>We would like to inform you that your child, <strong>${studentName}</strong> (Student ID: ${student.studentId}), has been marked absent or has excessive absences in their classes.</p>
              <div style="background-color: white; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
                <p><strong>Date:</strong> ${currentDate}</p>
                <p><strong>Student:</strong> ${studentName}</p>
                <p><strong>Student ID:</strong> ${student.studentId}</p>
                ${customMessage ? `<p><strong>Additional Information:</strong> ${customMessage}</p>` : ''}
              </div>
              <p>Please contact your child to discuss their attendance and ensure they are attending their classes regularly.</p>
              <p>For any concerns or questions, please contact the Department of Information Technology.</p>
              <p>Best regards,<br>CLIRDEC: PRESENCE System<br>Department of Information Technology<br>Central Luzon State University</p>
            </div>
          </div>
        `,
        text: `
          CLIRDEC: PRESENCE - Attendance Alert
          
          Dear Parent/Guardian,
          
          Your child, ${studentName} (Student ID: ${student.studentId}), has been marked absent or has excessive absences in their classes.
          
          Date: ${currentDate}
          Student: ${studentName}
          Student ID: ${student.studentId}
          ${customMessage ? `Additional Information: ${customMessage}` : ''}
          
          Please contact your child to discuss their attendance.
          
          Best regards,
          CLIRDEC: PRESENCE System
          Department of Information Technology
          Central Luzon State University
        `
      };

    case 'late_arrival':
      return {
        subject: `Late Arrival Notification - ${studentName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1976D2; color: white; padding: 20px; text-align: center;">
              <h1>CLIRDEC: PRESENCE</h1>
              <p>Central Luzon State University - Attendance Monitoring System</p>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #f57c00;">Late Arrival Notification</h2>
              <p>Dear Parent/Guardian,</p>
              <p>We would like to inform you that your child, <strong>${studentName}</strong> (Student ID: ${student.studentId}), arrived late to class today.</p>
              <div style="background-color: white; padding: 15px; border-left: 4px solid #f57c00; margin: 20px 0;">
                <p><strong>Date:</strong> ${currentDate}</p>
                <p><strong>Student:</strong> ${studentName}</p>
                <p><strong>Student ID:</strong> ${student.studentId}</p>
                ${customMessage ? `<p><strong>Additional Information:</strong> ${customMessage}</p>` : ''}
              </div>
              <p>Please remind your child about the importance of punctuality and arriving to class on time.</p>
              <p>Best regards,<br>CLIRDEC: PRESENCE System<br>Department of Information Technology<br>Central Luzon State University</p>
            </div>
          </div>
        `,
        text: `
          CLIRDEC: PRESENCE - Late Arrival Notification
          
          Dear Parent/Guardian,
          
          Your child, ${studentName} (Student ID: ${student.studentId}), arrived late to class today.
          
          Date: ${currentDate}
          Student: ${studentName}
          Student ID: ${student.studentId}
          ${customMessage ? `Additional Information: ${customMessage}` : ''}
          
          Please remind your child about the importance of punctuality.
          
          Best regards,
          CLIRDEC: PRESENCE System
          Department of Information Technology
          Central Luzon State University
        `
      };

    case 'daily_summary':
      return {
        subject: `Daily Attendance Summary - ${studentName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1976D2; color: white; padding: 20px; text-align: center;">
              <h1>CLIRDEC: PRESENCE</h1>
              <p>Central Luzon State University - Attendance Monitoring System</p>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #388e3c;">Daily Attendance Summary</h2>
              <p>Dear Parent/Guardian,</p>
              <p>Here is the daily attendance summary for your child, <strong>${studentName}</strong> (Student ID: ${student.studentId}).</p>
              <div style="background-color: white; padding: 15px; border-left: 4px solid #388e3c; margin: 20px 0;">
                <p><strong>Date:</strong> ${currentDate}</p>
                <p><strong>Student:</strong> ${studentName}</p>
                <p><strong>Student ID:</strong> ${student.studentId}</p>
                ${customMessage ? `<p><strong>Summary:</strong> ${customMessage}</p>` : ''}
              </div>
              <p>Thank you for staying informed about your child's attendance.</p>
              <p>Best regards,<br>CLIRDEC: PRESENCE System<br>Department of Information Technology<br>Central Luzon State University</p>
            </div>
          </div>
        `,
        text: `
          CLIRDEC: PRESENCE - Daily Attendance Summary
          
          Dear Parent/Guardian,
          
          Daily attendance summary for ${studentName} (Student ID: ${student.studentId}).
          
          Date: ${currentDate}
          Student: ${studentName}
          Student ID: ${student.studentId}
          ${customMessage ? `Summary: ${customMessage}` : ''}
          
          Thank you for staying informed about your child's attendance.
          
          Best regards,
          CLIRDEC: PRESENCE System
          Department of Information Technology
          Central Luzon State University
        `
      };

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
}

async function sendEmail(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  // If SendGrid is available, use it
  if (SENDGRID_API_KEY) {
    try {
      const sgMail = await import('@sendgrid/mail');
      sgMail.default.setApiKey(SENDGRID_API_KEY);
      
      await sgMail.default.send(params);
      console.log(`Email sent successfully to ${params.to}`);
    } catch (error) {
      console.error('SendGrid error:', error);
      throw error;
    }
  } else {
    // Fallback: log email content (for development)
    console.log('='.repeat(50));
    console.log('EMAIL NOTIFICATION (SendGrid not configured)');
    console.log('='.repeat(50));
    console.log(`To: ${params.to}`);
    console.log(`From: ${params.from}`);
    console.log(`Subject: ${params.subject}`);
    console.log('Body:');
    console.log(params.text);
    console.log('='.repeat(50));
  }
}

// Process queued email notifications with memory optimization
export async function processEmailQueue(): Promise<void> {
  try {
    const pendingNotifications = await storage.getUnsentNotifications();
    
    // Process in smaller batches to reduce memory usage
    const batchSize = 5;
    let processed = 0;
    
    for (let i = 0; i < pendingNotifications.length; i += batchSize) {
      const batch = pendingNotifications.slice(i, i + batchSize);
      
      for (const notification of batch) {
        try {
          await sendEmail({
            to: notification.recipientEmail,
            from: FROM_EMAIL,
            subject: notification.subject || '',
            html: notification.content || '',
            text: notification.content?.replace(/<[^>]*>/g, '') || '' // Strip HTML tags for text version
          });
          
          await storage.markNotificationAsSent(notification.id);
          processed++;
          
          // Force garbage collection every few emails to prevent memory buildup
          if (processed % 3 === 0 && global.gc) {
            global.gc();
          }
          
        } catch (error) {
          console.error(`Failed to send notification ${notification.id}:`, error);
        }
      }
      
      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < pendingNotifications.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    if (processed > 0) {
      console.log(`✅ Email queue processed: ${processed} emails sent`);
    }
  } catch (error) {
    console.error('Error processing email queue:', error);
  }
}

// Start email queue processor (runs every 5 minutes) with error handling
setInterval(async () => {
  try {
    await processEmailQueue();
  } catch (error) {
    console.error('Email queue processing failed:', error);
  }
}, 5 * 60 * 1000);
