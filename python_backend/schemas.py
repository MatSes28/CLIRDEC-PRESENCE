"""
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, time, date
from enum import Enum

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    FACULTY = "faculty"

class AttendanceStatus(str, Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"

class ComputerStatus(str, Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"

# Authentication schemas
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int

# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Student schemas
class StudentBase(BaseModel):
    student_id: str
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None
    rfid_card_id: Optional[str] = None
    program: Optional[str] = None
    year_level: Optional[int] = None
    section: Optional[str] = None

class StudentCreate(StudentBase):
    pass

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    parent_email: Optional[EmailStr] = None
    parent_phone: Optional[str] = None
    rfid_card_id: Optional[str] = None
    program: Optional[str] = None
    year_level: Optional[int] = None
    section: Optional[str] = None

class StudentResponse(StudentBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Classroom schemas
class ClassroomBase(BaseModel):
    name: str
    location: Optional[str] = None
    capacity: Optional[int] = None
    description: Optional[str] = None
    equipment: Optional[dict] = None

class ClassroomCreate(ClassroomBase):
    pass

class ClassroomResponse(ClassroomBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Subject schemas
class SubjectBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    credits: Optional[int] = None
    professor_id: Optional[int] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Schedule schemas
class ScheduleBase(BaseModel):
    subject_id: int
    classroom_id: int
    day_of_week: int = Field(..., ge=0, le=6)  # 0=Monday, 6=Sunday
    start_time: time
    end_time: time
    semester: Optional[str] = None
    academic_year: Optional[str] = None

class ScheduleCreate(ScheduleBase):
    pass

class ScheduleResponse(ScheduleBase):
    id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Class Session schemas
class ClassSessionBase(BaseModel):
    schedule_id: int
    date: date
    notes: Optional[str] = None

class ClassSessionCreate(ClassSessionBase):
    pass

class ClassSessionResponse(ClassSessionBase):
    id: int
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Attendance schemas
class AttendanceRecordBase(BaseModel):
    student_id: int
    class_session_id: int
    status: AttendanceStatus
    computer_id: Optional[int] = None
    notes: Optional[str] = None

class AttendanceCheckin(BaseModel):
    rfid_card_id: str
    class_session_id: Optional[int] = None
    computer_id: Optional[int] = None

class AttendanceCheckout(BaseModel):
    rfid_card_id: str
    class_session_id: Optional[int] = None

class AttendanceRecordResponse(AttendanceRecordBase):
    id: int
    checkin_time: Optional[datetime] = None
    checkout_time: Optional[datetime] = None
    is_late: bool
    minutes_late: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Computer schemas
class ComputerBase(BaseModel):
    classroom_id: int
    computer_name: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    specifications: Optional[dict] = None
    status: ComputerStatus = ComputerStatus.AVAILABLE
    notes: Optional[str] = None

class ComputerCreate(ComputerBase):
    pass

class ComputerResponse(ComputerBase):
    id: int
    last_maintenance: Optional[datetime] = None
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# RFID simulation schema
class RFIDSimulation(BaseModel):
    rfid_card_id: str
    proximity_detected: bool = True
    tap_strength: int = Field(default=8, ge=1, le=10)

# Analytics schemas
class AttendanceSummary(BaseModel):
    total_students: int
    present_count: int
    absent_count: int
    late_count: int
    attendance_rate: float
    date_range: str

class StudentBehavior(BaseModel):
    student_id: int
    student_name: str
    attendance_rate: float
    consecutive_absences: int
    late_arrivals_this_week: int
    total_classes: int
    present_count: int
    absent_count: int
    late_count: int
    behavior_level: str  # excellent, good, concerning, critical
    requires_alert: bool
    alert_reason: List[str]