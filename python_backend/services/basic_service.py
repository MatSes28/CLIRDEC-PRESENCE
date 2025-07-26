"""
Basic service methods for simple CRUD operations
"""
from sqlalchemy.orm import Session
from typing import List, Optional
from models import Student, Classroom, Subject, Schedule, ClassSession, AttendanceRecord, Computer
from schemas import *

class BasicService:
    """Basic service for simple operations"""
    
    def get_schedules(self, db: Session) -> List[Schedule]:
        """Get list of schedules"""
        return db.query(Schedule).filter(Schedule.is_active == True).all()
    
    def create_schedule(self, db: Session, schedule_data: ScheduleCreate) -> Schedule:
        """Create new schedule"""
        schedule = Schedule(**schedule_data.dict())
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        return schedule
    
    def get_class_sessions(self, db: Session, active_only: bool = False) -> List[ClassSession]:
        """Get list of class sessions"""
        query = db.query(ClassSession)
        if active_only:
            query = query.filter(ClassSession.end_time.is_(None))
        return query.all()
    
    def create_class_session(self, db: Session, session_data: ClassSessionCreate) -> ClassSession:
        """Create new class session"""
        session = ClassSession(**session_data.dict())
        db.add(session)
        db.commit()
        db.refresh(session)
        return session
    
    def end_class_session(self, db: Session, session_id: int):
        """End a class session"""
        from datetime import datetime
        session = db.query(ClassSession).filter(ClassSession.id == session_id).first()
        if session and not session.end_time:
            session.end_time = datetime.utcnow()
            db.commit()
            db.refresh(session)
        return session
    
    def get_attendance_records(self, db: Session, session_id: int = None, student_id: int = None) -> List[AttendanceRecord]:
        """Get attendance records"""
        query = db.query(AttendanceRecord)
        if session_id:
            query = query.filter(AttendanceRecord.class_session_id == session_id)
        if student_id:
            query = query.filter(AttendanceRecord.student_id == student_id)
        return query.all()

# Create global instance
basic_service = BasicService()