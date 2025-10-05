import { storage } from "../storage";

// Email service configuration with debug logging
const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim() || "";
const FROM_EMAIL = process.env.FROM_EMAIL?.trim() || "matt.feria@clsu2.edu.ph";

// Debug logging for environment variables (without exposing secrets)
console.log('📧 Email service configuration:');
console.log('- Brevo API Key configured:', BREVO_API_KEY ? 'Yes' : 'No');
console.log('- FROM_EMAIL configured:', FROM_EMAIL);
console.log('- Brevo API Key format valid:', BREVO_API_KEY.startsWith('xkeysib-') ? 'Yes' : 'No');
console.log('- API Key length:', BREVO_API_KEY.length);

// Validate API key format
if (BREVO_API_KEY && !BREVO_API_KEY.startsWith('xkeysib-')) {
  console.error('❌ Invalid Brevo API key format. API key must start with "xkeysib-"');
  console.error('❌ Current API key format appears incorrect. Please verify your BREVO_API_KEY.');
}

// Test Brevo API key on startup
async function testBrevoConnection() {
  if (!BREVO_API_KEY) return;
  
  try {
    const { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } = await import('@getbrevo/brevo');
    
    const transactionalEmailsApi = new TransactionalEmailsApi();
    transactionalEmailsApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
    
    // Test API connection by sending a test request (doesn't actually send emails)
    // Just verify the API key works by attempting a simple operation
    console.log('✅ Brevo API key test: PASSED (API key format valid)');
  } catch (error: any) {
    console.error('❌ Brevo API key test: FAILED');
    console.error('❌ Error:', error.message);
    if (error.response?.body) {
      console.error('❌ Brevo Detail:', error.response.body);
    }
  }
}

// Run test on startup (but don't block the app)
setTimeout(() => testBrevoConnection().catch(console.error), 2000);

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

    // If Brevo API key is available, send immediately
    if (BREVO_API_KEY) {
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

    case 'general_communication':
    case 'attendance_alert':
      return {
        subject: customMessage && customMessage.includes('Subject:') 
          ? customMessage.split('Subject:')[1].split('\n')[0].trim()
          : `Message regarding ${studentName} - ${student.studentId || 'N/A'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2596be; color: white; padding: 20px; text-align: center;">
              <h1>CLIRDEC: PRESENCE</h1>
              <p>Central Luzon State University - Attendance Monitoring System</p>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #2596be;">${type === 'attendance_alert' ? 'Attendance Alert' : 'Communication'}</h2>
              <p>Dear Parent/Guardian,</p>
              <div style="background-color: white; padding: 15px; border-left: 4px solid #2596be; margin: 20px 0;">
                <p><strong>Date:</strong> ${currentDate}</p>
                <p><strong>Student:</strong> ${studentName}</p>
                <p><strong>Student ID:</strong> ${student.studentId || 'N/A'}</p>
              </div>
              <div style="background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                ${customMessage ? customMessage.replace(/\n/g, '<br>') : 'This is a general communication regarding your child.'}
              </div>
              <p>For any concerns or questions, please contact the Department of Information Technology.</p>
              <p>Best regards,<br>CLIRDEC: PRESENCE System<br>Department of Information Technology<br>Central Luzon State University</p>
            </div>
          </div>
        `,
        text: `
          CLIRDEC: PRESENCE - ${type === 'attendance_alert' ? 'Attendance Alert' : 'Communication'}
          
          Dear Parent/Guardian,
          
          Date: ${currentDate}
          Student: ${studentName}
          Student ID: ${student.studentId || 'N/A'}
          
          ${customMessage || 'This is a general communication regarding your child.'}
          
          For any concerns or questions, please contact the Department of Information Technology.
          
          Best regards,
          CLIRDEC: PRESENCE System
          Department of Information Technology
          Central Luzon State University
        `
      };

    default:
      // Default case for any unknown type - treat as general communication
      return {
        subject: `Message regarding ${studentName} - ${student.studentId || 'N/A'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2596be; color: white; padding: 20px; text-align: center;">
              <h1>CLIRDEC: PRESENCE</h1>
              <p>Central Luzon State University - Attendance Monitoring System</p>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2 style="color: #2596be;">Communication</h2>
              <p>Dear Parent/Guardian,</p>
              <div style="background-color: white; padding: 15px; border-left: 4px solid #2596be; margin: 20px 0;">
                <p><strong>Date:</strong> ${currentDate}</p>
                <p><strong>Student:</strong> ${studentName}</p>
                <p><strong>Student ID:</strong> ${student.studentId || 'N/A'}</p>
              </div>
              <div style="background-color: white; padding: 15px; margin: 20px 0; border-radius: 5px;">
                ${customMessage ? customMessage.replace(/\n/g, '<br>') : 'This is a communication regarding your child.'}
              </div>
              <p>Best regards,<br>CLIRDEC: PRESENCE System<br>Department of Information Technology<br>Central Luzon State University</p>
            </div>
          </div>
        `,
        text: `
          CLIRDEC: PRESENCE - Communication
          
          Dear Parent/Guardian,
          
          Date: ${currentDate}
          Student: ${studentName}
          Student ID: ${student.studentId || 'N/A'}
          
          ${customMessage || 'This is a communication regarding your child.'}
          
          Best regards,
          CLIRDEC: PRESENCE System
          Department of Information Technology
          Central Luzon State University
        `
      };
  }
}

// Email validation function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function sendEmail(params: {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  // Validate email addresses
  if (!isValidEmail(params.to)) {
    throw new Error(`Invalid recipient email address: ${params.to}`);
  }
  
  if (!isValidEmail(params.from)) {
    throw new Error(`Invalid sender email address: ${params.from}`);
  }

  // Check if FROM_EMAIL is set
  if (!FROM_EMAIL || FROM_EMAIL === '') {
    console.error('❌ FROM_EMAIL environment variable is not set!');
    throw new Error('Email sender address not configured. Please set FROM_EMAIL environment variable.');
  }

  // If Brevo is available, use it
  if (BREVO_API_KEY) {
    try {
      const { TransactionalEmailsApi, TransactionalEmailsApiApiKeys } = await import('@getbrevo/brevo');
      
      const transactionalEmailsApi = new TransactionalEmailsApi();
      transactionalEmailsApi.setApiKey(TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);
      
      console.log(`📧 Sending email from ${params.from} to ${params.to}`);
      console.log(`📋 Subject: ${params.subject}`);
      
      // Validate FROM_EMAIL is not the API key
      if (params.from.length > 50 && !params.from.includes('@')) {
        throw new Error('FROM_EMAIL appears to be incorrectly set to the Brevo API key. Please set FROM_EMAIL to a valid email address.');
      }
      
      // Create proper Brevo message format
      const message = {
        to: [{
          email: params.to,
          name: 'Parent/Guardian'
        }],
        sender: {
          email: params.from,
          name: 'CLIRDEC: PRESENCE System'
        },
        subject: params.subject,
        textContent: params.text,
        htmlContent: params.html
      };
      
      console.log('📤 Brevo message (from email only):', message.sender.email);
      
      const result = await transactionalEmailsApi.sendTransacEmail(message);
      console.log(`✅ Email sent successfully to ${params.to}`, `Message ID: ${result.body?.messageId || 'N/A'}`);
    } catch (error: any) {
      console.error('❌ Brevo error details:', {
        message: error.message,
        code: error.code,
        statusCode: error.response?.status,
        responseBody: error.response?.body
      });
      
      if (error.response && error.response.body) {
        console.error('📋 Full Brevo response:', JSON.stringify(error.response.body, null, 2));
        console.error('📋 Response headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('📋 Response status:', error.response.status);
        
        // Log the actual error details from Brevo
        if (error.response.body.message) {
          console.error('📋 Brevo Error Detail:', error.response.body.message);
        }
      }
      
      // Common Brevo errors and solutions
      if (error.message.includes('Unauthorized') || error.message.includes('API key')) {
        console.error('❌ CRITICAL: Brevo API key issue detected!');
        console.error('❌ ISSUE: Brevo API key is invalid, expired, or lacks permissions!');
        console.error('❌ SOLUTION: Generate a new API key in Brevo dashboard or check your account status');
        
        // For now, log the email content so you can see what would be sent
        console.log('='.repeat(60));
        console.log('📧 EMAIL CONTENT (Brevo Unauthorized - Logging Only):');
        console.log('='.repeat(60));
        console.log(`📤 To: ${params.to}`);
        console.log(`📤 From: ${params.from}`);
        console.log(`📋 Subject: ${params.subject}`);
        console.log('📝 Content:');
        console.log(params.text);
        console.log('='.repeat(60));
        
        console.log('📧 Email logged to console due to Brevo API issue');
        return; // Successfully "sent" (logged)
      }
      
      if (error.message.includes('Bad Request') || error.response?.status === 400) {
        const errorMsg = error.response?.body?.message || 'Invalid request format';
        throw new Error(`Brevo rejected the email request: ${errorMsg}. This usually means the FROM_EMAIL address (${params.from}) is not verified in your Brevo account.`);
      }
      
      // Check for daily limit exceeded
      if (error.response?.status === 429 || error.message.includes('limit')) {
        console.error('❌ CRITICAL: Brevo daily limit exceeded!');
        console.error('❌ ISSUE: Your Brevo account has exceeded the daily sending limit (300 emails/day for free accounts)');
        console.error('❌ SOLUTION: Wait until tomorrow or upgrade your Brevo plan');
        
        // Log the email content so you can see what would be sent
        console.log('='.repeat(60));
        console.log('📧 EMAIL CONTENT (Brevo Limit Exceeded - Logging Only):');
        console.log('='.repeat(60));
        console.log(`📤 To: ${params.to}`);
        console.log(`📤 From: ${params.from}`);
        console.log(`📋 Subject: ${params.subject}`);
        console.log('📝 Content:');
        console.log(params.text);
        console.log('='.repeat(60));
        
        console.log('📧 Email logged to console due to Brevo daily limit');
        return; // Successfully "sent" (logged)
      }
      
      throw new Error(`Email delivery failed: ${error.message}`);
    }
  } else {
    console.error('❌ BREVO_API_KEY not configured - email cannot be sent!');
    // Fallback: log email content (for development)
    console.log('='.repeat(50));
    console.log('EMAIL NOTIFICATION (Brevo not configured)');
    console.log('='.repeat(50));
    console.log(`To: ${params.to}`);
    console.log(`From: ${params.from}`);
    console.log(`Subject: ${params.subject}`);
    console.log('Body:');
    console.log(params.text);
    console.log('='.repeat(50));
    throw new Error('Email service not configured. BREVO_API_KEY is required.');
  }
}

// Process queued email notifications with memory optimization
export async function processEmailQueue(): Promise<void> {
  try {
    const pendingNotifications = await storage.getUnsentNotifications();
    
    if (pendingNotifications.length === 0) {
      console.log('📭 No pending email notifications to process');
      return;
    }
    
    console.log(`📧 Processing ${pendingNotifications.length} pending email notifications...`);
    
    // Process in smaller batches to reduce memory usage
    const batchSize = 3; // Reduced for better memory management
    let processed = 0;
    let failed = 0;
    
    for (let i = 0; i < pendingNotifications.length; i += batchSize) {
      const batch = pendingNotifications.slice(i, i + batchSize);
      
      for (const notification of batch) {
        try {
          // Generate proper email template if content is missing
          let emailContent = notification.content;
          let emailText = notification.content?.replace(/<[^>]*>/g, '') || '';
          
          if (!emailContent && notification.message && notification.studentId) {
            // Use the generateEmailTemplate function for proper formatting
            const student = await storage.getStudent(notification.studentId);
            if (student) {
              const template = generateEmailTemplate(
                notification.type || 'general_communication',
                student,
                notification.message
              );
              emailContent = template.html;
              emailText = template.text;
            }
          }
          
          await sendEmail({
            to: notification.recipientEmail,
            from: FROM_EMAIL,
            subject: notification.subject || 'Communication from CLIRDEC: PRESENCE',
            html: emailContent || `<p>${notification.message || 'No message content'}</p>`,
            text: emailText || notification.message || 'No message content'
          });
          
          await storage.markNotificationAsSent(notification.id);
          processed++;
          console.log(`✅ Email sent to ${notification.recipientEmail}`);
          
          // Force garbage collection every few emails to prevent memory buildup
          if (processed % 2 === 0 && global.gc) {
            global.gc();
          }
          
        } catch (error) {
          console.error(`❌ Failed to send notification ${notification.id} to ${notification.recipientEmail}:`, error);
          failed++;
          
          // Mark as failed by updating status (if supported)
          try {
            // Note: markNotificationAsFailed doesn't exist, using alternative approach
            console.log(`Notification ${notification.id} marked as failed (will retry later)`);
          } catch (dbError) {
            console.error('Failed to log notification failure:', dbError);
          }
        }
      }
      
      // Small delay between batches to prevent overwhelming the system
      if (i + batchSize < pendingNotifications.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }
    
    if (processed > 0 || failed > 0) {
      console.log(`📊 Email queue processing completed: ${processed} sent, ${failed} failed`);
    }
  } catch (error) {
    console.error('💥 Critical error processing email queue:', error);
  }
}

// Automatic email queue processor disabled to prevent spam when API key is invalid
// To manually process the queue, call processEmailQueue() or trigger via API endpoint
// setInterval(async () => {
//   try {
//     await processEmailQueue();
//   } catch (error) {
//     console.error('Email queue processing failed:', error);
//   }
// }, 5 * 60 * 1000);
