"""
SQLAlchemy models for the Presence Attendance Management System
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Enum, Time, Date, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime, time, date
import enum

from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    FACULTY = "faculty"

class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"

class ComputerStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    MAINTENANCE = "maintenance"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    parent_email = Column(String)
    parent_phone = Column(String)
    rfid_card_id = Column(String, unique=True, index=True)
    program = Column(String)
    year_level = Column(Integer)
    section = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    attendance_records = relationship("AttendanceRecord", back_populates="student")

class Classroom(Base):
    __tablename__ = "classrooms"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String)
    capacity = Column(Integer)
    description = Column(Text)
    equipment = Column(JSON)  # Store equipment list as JSON
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    schedules = relationship("Schedule", back_populates="classroom")
    computers = relationship("Computer", back_populates="classroom")

class Subject(Base):
    __tablename__ = "subjects"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text)
    credits = Column(Integer)
    professor_id = Column(Integer, ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    professor = relationship("User")
    schedules = relationship("Schedule", back_populates="subject")

class Schedule(Base):
    __tablename__ = "schedules"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    semester = Column(String)
    academic_year = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    subject = relationship("Subject", back_populates="schedules")
    classroom = relationship("Classroom", back_populates="schedules")
    class_sessions = relationship("ClassSession", back_populates="schedule")

class ClassSession(Base):
    __tablename__ = "class_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("schedules.id"), nullable=False)
    date = Column(Date, nullable=False)
    actual_start_time = Column(DateTime(timezone=True))
    actual_end_time = Column(DateTime(timezone=True))
    status = Column(String, default="scheduled")  # scheduled, active, completed, cancelled
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    schedule = relationship("Schedule", back_populates="class_sessions")
    attendance_records = relationship("AttendanceRecord", back_populates="class_session")

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_session_id = Column(Integer, ForeignKey("class_sessions.id"), nullable=False)
    checkin_time = Column(DateTime(timezone=True))
    checkout_time = Column(DateTime(timezone=True))
    status = Column(Enum(AttendanceStatus), nullable=False)
    is_late = Column(Boolean, default=False)
    minutes_late = Column(Integer, default=0)
    computer_id = Column(Integer, ForeignKey("computers.id"))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    student = relationship("Student", back_populates="attendance_records")
    class_session = relationship("ClassSession", back_populates="attendance_records")
    computer = relationship("Computer")

class Computer(Base):
    __tablename__ = "computers"
    
    id = Column(Integer, primary_key=True, index=True)
    classroom_id = Column(Integer, ForeignKey("classrooms.id"), nullable=False)
    computer_name = Column(String, nullable=False)
    ip_address = Column(String)
    mac_address = Column(String)
    specifications = Column(JSON)  # Store specs as JSON
    status = Column(Enum(ComputerStatus), default=ComputerStatus.AVAILABLE)
    last_maintenance = Column(DateTime(timezone=True))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    classroom = relationship("Classroom", back_populates="computers")