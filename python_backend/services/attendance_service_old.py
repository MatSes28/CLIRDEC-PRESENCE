"""
Attendance management service
"""
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
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

            raise ValueError("Class session not found")
        
        session.actual_end_time = datetime.now()
        session.status = "completed"
        await db.commit()
        
        return {"message": "Class session ended successfully"}
    
    async def get_attendance_records(
        self, 
        db: AsyncSession, 
        session_id: int = None, 
        student_id: int = None
    ) -> List[AttendanceRecord]:
        """Get attendance records"""
        query = select(AttendanceRecord).options(
            selectinload(AttendanceRecord.student),
            selectinload(AttendanceRecord.class_session)
        )
        
        if session_id:
            query = query.where(AttendanceRecord.class_session_id == session_id)
        
        if student_id:
            query = query.where(AttendanceRecord.student_id == student_id)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def checkin_student(self, db: AsyncSession, checkin_data: AttendanceCheckin) -> AttendanceRecord:
        """Check in student via RFID"""
        # Find student by RFID
        student = await self.get_student_by_rfid(db, checkin_data.rfid_card_id)
        if not student:
            raise ValueError("Student not found with this RFID card")
        
        # Find active class session or use provided session ID
        session_id = checkin_data.class_session_id
        if not session_id:
            # Find current active session
            result = await db.execute(
                select(ClassSession).where(ClassSession.status == "active")
            )
            session = result.scalar_one_or_none()
            if not session:
                raise ValueError("No active class session found")
            session_id = session.id
        
        # Check if student already checked in
        existing_record = await db.execute(
            select(AttendanceRecord).where(
                and_(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.class_session_id == session_id
                )
            )
        )
        existing = existing_record.scalar_one_or_none()
        
        if existing and existing.checkin_time:
            raise ValueError("Student already checked in")
        
        # Create or update attendance record
        if existing:
            record = existing
        else:
            record = AttendanceRecord(
                student_id=student.id,
                class_session_id=session_id,
                status=AttendanceStatus.PRESENT
            )
            db.add(record)
        
        record.checkin_time = datetime.now()
        record.computer_id = checkin_data.computer_id
        
        # Calculate if late
        # TODO: Implement late calculation based on schedule
        
        await db.commit()
        await db.refresh(record)
        return record
    
    async def checkout_student(self, db: AsyncSession, checkout_data: AttendanceCheckout) -> AttendanceRecord:
        """Check out student via RFID"""
        # Find student by RFID
        student = await self.get_student_by_rfid(db, checkout_data.rfid_card_id)
        if not student:
            raise ValueError("Student not found with this RFID card")
        
        # Find session
        session_id = checkout_data.class_session_id
        if not session_id:
            # Find current active session
            result = await db.execute(
                select(ClassSession).where(ClassSession.status == "active")
            )
            session = result.scalar_one_or_none()
            if not session:
                raise ValueError("No active class session found")
            session_id = session.id
        
        # Find existing record
        result = await db.execute(
            select(AttendanceRecord).where(
                and_(
                    AttendanceRecord.student_id == student.id,
                    AttendanceRecord.class_session_id == session_id
                )
            )
        )
        record = result.scalar_one_or_none()
        
        if not record:
            raise ValueError("No check-in record found for this student")
        
        record.checkout_time = datetime.now()
        await db.commit()
        await db.refresh(record)
        return record
    
    async def get_computers(self, db: AsyncSession, classroom_id: int = None) -> List[Computer]:
        """Get list of computers"""
        query = select(Computer).where(Computer.is_active == True)
        
        if classroom_id:
            query = query.where(Computer.classroom_id == classroom_id)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    async def create_computer(self, db: AsyncSession, computer_data: ComputerCreate) -> Computer:
        """Create new computer"""
        computer = Computer(**computer_data.dict())
        db.add(computer)
        await db.commit()
        await db.refresh(computer)
        return computer
    
    async def get_attendance_summary(
        self, 
        db: AsyncSession, 
        start_date: str = None, 
        end_date: str = None
    ) -> dict:
        """Get attendance analytics summary"""
        # TODO: Implement comprehensive analytics
        result = await db.execute(select(func.count(AttendanceRecord.id)))
        total_records = result.scalar()
        
        return {
            "total_students": 0,
            "present_count": 0,
            "absent_count": 0,
            "late_count": 0,
            "attendance_rate": 0.0,
            "date_range": f"{start_date} to {end_date}" if start_date and end_date else "All time"
        }
    
    async def get_behavior_analysis(self, db: AsyncSession) -> List[dict]:
        """Get student behavior analysis"""
        # TODO: Implement comprehensive behavior analysis
        return []