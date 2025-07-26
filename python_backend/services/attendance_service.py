"""
Clean attendance management service
"""
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta
from typing import List, Optional

from models import Student, Classroom, Subject, Schedule, ClassSession, AttendanceRecord, Computer
from schemas import *

class AttendanceService:
    """Service for managing attendance operations"""
    
    def get_students(self, db: Session, skip: int = 0, limit: int = 100) -> List[Student]:
        """Get list of students"""
        return db.query(Student).filter(Student.is_active == True).offset(skip).limit(limit).all()
    
    def create_student(self, db: Session, student_data: StudentCreate) -> Student:
        """Create new student"""
        student = Student(**student_data.dict())
        db.add(student)
        db.commit()
        db.refresh(student)
        return student
    
    def get_student(self, db: Session, student_id: int) -> Optional[Student]:
        """Get student by ID"""
        return db.query(Student).filter(Student.id == student_id).first()
    
    def get_student_by_rfid(self, db: Session, rfid_card_id: str) -> Optional[Student]:
        """Get student by RFID card ID"""
        return db.query(Student).filter(Student.rfid_card_id == rfid_card_id).first()
    
    def get_classrooms(self, db: Session) -> List[Classroom]:
        """Get list of classrooms"""
        return db.query(Classroom).filter(Classroom.is_active == True).all()
    
    def create_classroom(self, db: Session, classroom_data: ClassroomCreate) -> Classroom:
        """Create new classroom"""
        classroom = Classroom(**classroom_data.dict())
        db.add(classroom)
        db.commit()
        db.refresh(classroom)
        return classroom
    
    def get_subjects(self, db: Session) -> List[Subject]:
        """Get list of subjects"""
        return db.query(Subject).filter(Subject.is_active == True).all()
    
    def create_subject(self, db: Session, subject_data: SubjectCreate) -> Subject:
        """Create new subject"""
        subject = Subject(**subject_data.dict())
        db.add(subject)
        db.commit()
        db.refresh(subject)
        return subject
    
    def get_schedules(self, db: Session) -> List[Schedule]:
        """Get list of schedules"""
        return db.query(Schedule).filter(Schedule.is_active == True).all()

# Create global instance
attendance_service = AttendanceService()