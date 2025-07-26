"""
FastAPI backend for Presence Attendance Management System
"""
import os
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import uvicorn

from database import get_db, init_db
from models import User, Student, Classroom, Subject, Schedule, ClassSession, AttendanceRecord, Computer
from schemas import *
from auth import get_current_user
from services.attendance_service import attendance_service
from services.email_service import EmailService
from services.rfid_service import RFIDService
from services.basic_service import basic_service

# Initialize services  
email_service = EmailService()
rfid_service = RFIDService()

app = FastAPI(
    title="Presence Attendance Management System",
    description="Modern IoT-enabled attendance management for educational institutions",
    version="1.0.0"
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    print("Database initialized successfully!")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Presence system operational"}

# Authentication endpoints
@app.post("/api/auth/login", response_model=TokenResponse)
async def login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """Authenticate user and return JWT token"""
    from auth import authenticate_user, create_access_token
    from datetime import timedelta
    
    user = authenticate_user(db, credentials.email, credentials.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 1800  # 30 minutes in seconds
    }

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current authenticated user information"""
    return current_user

# Student management endpoints
@app.get("/api/students", response_model=list[StudentResponse])
def get_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of students"""
    return attendance_service.get_students(db, skip, limit)

@app.post("/api/students", response_model=StudentResponse)
def create_student(
    student: StudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new student"""
    return attendance_service.create_student(db, student)

@app.get("/api/students/{student_id}", response_model=StudentResponse)
def get_student(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get student by ID"""
    student = attendance_service.get_student(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

# Classroom management endpoints
@app.get("/api/classrooms", response_model=list[ClassroomResponse])
def get_classrooms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of classrooms"""
    return attendance_service.get_classrooms(db)

@app.post("/api/classrooms", response_model=ClassroomResponse)
def create_classroom(
    classroom: ClassroomCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new classroom"""
    return attendance_service.create_classroom(db, classroom)

# Subject management endpoints
@app.get("/api/subjects", response_model=list[SubjectResponse])
def get_subjects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of subjects"""
    return attendance_service.get_subjects(db)

@app.post("/api/subjects", response_model=SubjectResponse)
def create_subject(
    subject: SubjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new subject"""
    return attendance_service.create_subject(db, subject)

# Schedule management endpoints
@app.get("/api/schedules", response_model=list[ScheduleResponse])
def get_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of schedules"""
    return attendance_service.get_schedules(db)

@app.post("/api/schedules", response_model=ScheduleResponse)
def create_schedule(
    schedule: ScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new schedule"""
    return basic_service.create_schedule(db, schedule)

# Class session management endpoints
@app.get("/api/class-sessions", response_model=list[ClassSessionResponse])
async def get_class_sessions(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of class sessions"""
    return await attendance_service.get_class_sessions(db, active_only)

@app.post("/api/class-sessions", response_model=ClassSessionResponse)
async def create_class_session(
    session: ClassSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new class session"""
    return await attendance_service.create_class_session(db, session)

@app.patch("/api/class-sessions/{session_id}/end")
async def end_class_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """End a class session"""
    return await attendance_service.end_class_session(db, session_id)

# Attendance management endpoints
@app.get("/api/attendance", response_model=list[AttendanceRecordResponse])
async def get_attendance_records(
    session_id: int = None,
    student_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance records"""
    return await attendance_service.get_attendance_records(db, session_id, student_id)

@app.post("/api/attendance/checkin", response_model=AttendanceRecordResponse)
async def checkin_student(
    checkin: AttendanceCheckin,
    db: AsyncSession = Depends(get_db)
):
    """Check in student via RFID"""
    return await attendance_service.checkin_student(db, checkin)

@app.post("/api/attendance/checkout", response_model=AttendanceRecordResponse)
async def checkout_student(
    checkout: AttendanceCheckout,
    db: AsyncSession = Depends(get_db)
):
    """Check out student via RFID"""
    return await attendance_service.checkout_student(db, checkout)

# RFID simulation endpoints
@app.post("/api/rfid/simulate")
async def simulate_rfid_tap(
    rfid_data: RFIDSimulation,
    db: AsyncSession = Depends(get_db)
):
    """Simulate RFID card tap for development/testing"""
    return await rfid_service.simulate_tap(db, rfid_data)

# Analytics endpoints
@app.get("/api/analytics/attendance-summary")
async def get_attendance_summary(
    start_date: str = None,
    end_date: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get attendance analytics summary"""
    return await attendance_service.get_attendance_summary(db, start_date, end_date)

@app.get("/api/analytics/student-behavior")
async def get_student_behavior_analysis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get student behavior analysis"""
    return await attendance_service.get_behavior_analysis(db)

# Computer management endpoints
@app.get("/api/computers", response_model=list[ComputerResponse])
async def get_computers(
    classroom_id: int = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of computers"""
    return await attendance_service.get_computers(db, classroom_id)

@app.post("/api/computers", response_model=ComputerResponse)
async def create_computer(
    computer: ComputerCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new computer"""
    return await attendance_service.create_computer(db, computer)

# Email notification endpoints
@app.post("/api/notifications/send-alerts")
async def send_attendance_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send attendance alerts to parents"""
    return await email_service.send_attendance_alerts(db)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )