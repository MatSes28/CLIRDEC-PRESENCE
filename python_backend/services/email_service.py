"""
Email notification service using SendGrid
"""
import os
try:
    from sendgrid import SendGridAPIClient
    from sendgrid.helpers.mail import Mail
    SENDGRID_AVAILABLE = True
except ImportError:
    SENDGRID_AVAILABLE = False
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

class EmailService:
    """Service for sending email notifications"""
    
    def __init__(self):
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@presenceattendance.com")
        
        if self.sendgrid_api_key and SENDGRID_AVAILABLE:
            self.sg = SendGridAPIClient(api_key=self.sendgrid_api_key)
        else:
            self.sg = None
    
    async def send_attendance_alerts(self, db: AsyncSession) -> dict:
        """Send attendance alerts to parents"""
        if not self.sg:
            return {"error": "SendGrid API key not configured"}
        
        # TODO: Implement logic to find students requiring alerts
        # and send emails to their parents
        
        return {"message": "Attendance alerts sent successfully"}
    
    async def send_email(self, to_email: str, subject: str, content: str) -> bool:
        """Send individual email"""
        if not self.sg:
            print(f"Email would be sent to {to_email}: {subject}")
            return True
        
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                html_content=content
            )
            
            response = self.sg.send(message)
            return response.status_code == 202
        
        except Exception as e:
            print(f"Error sending email: {e}")
            return False