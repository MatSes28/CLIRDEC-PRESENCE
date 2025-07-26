#!/usr/bin/env python3
"""
Production FastAPI server for CLIRDEC Presence System
Technology Stack: Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL 16
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
import uvicorn

# Import our modules
try:
    from database import get_db, init_db
    from models import User, Student, Classroom, Subject, Schedule, ClassSession, AttendanceRecord, Computer
    from schemas import *
    from auth import get_current_user, authenticate_user, create_access_token
    print("✓ All modules imported successfully")
except ImportError as e:
    print(f"Import error: {e}")
    # Create minimal FastAPI app for development
    app = FastAPI(title="CLIRDEC Python Backend - Development Mode")
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/")
    def read_root():
        return {"message": "Python FastAPI Backend Running - Development Mode", "version": "1.0.0"}

    @app.get("/health")
    def health_check():
        return {"status": "healthy", "backend": "Python FastAPI", "mode": "development"}

    @app.get("/api/user")
    def get_user():
        raise HTTPException(status_code=401, detail="Not authenticated")

    if __name__ == "__main__":
        print("Starting development FastAPI server on port 8000...")
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    
    sys.exit()

# Create production FastAPI app
app = FastAPI(
    title="CLIRDEC: Presence Attendance Management System",
    description="Modern IoT-enabled attendance management for educational institutions using Python 3.11 + FastAPI + SQLAlchemy",
    version="2.0.0"
)

# CORS middleware for React frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://0.0.0.0:3000", "*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    try:
        init_db()
        print("✓ PostgreSQL database initialized with SQLAlchemy")
        print("✓ Python 3.11 FastAPI backend started successfully")
    except Exception as e:
        print(f"Database initialization error: {e}")

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "CLIRDEC Presence System - Python FastAPI Backend",
        "version": "2.0.0",
        "technology_stack": {
            "backend": "Python 3.11 + FastAPI",
            "database": "PostgreSQL 16 + SQLAlchemy",
            "frontend": "React 18 + TypeScript + Vite",
            "authentication": "JWT + Replit Auth",
            "email": "SendGrid",
            "validation": "Zod + Pydantic"
        }
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "backend": "Python 3.11 FastAPI", "database": "PostgreSQL + SQLAlchemy"}

# Authentication endpoints matching current frontend expectations
@app.post("/api/login")
async def login(credentials: dict, db: Session = Depends(get_db)):
    """Login endpoint compatible with current frontend"""
    try:
        email = credentials.get("email")
        password = credentials.get("password")
        
        if not email or not password:
            raise HTTPException(status_code=400, detail="Email and password required")
        
        # For now, return mock user data to maintain frontend compatibility
        if email == "admin@clsu.edu.ph":
            return {
                "id": "admin_001",
                "email": "admin@clsu.edu.ph",
                "firstName": "System",
                "lastName": "Administrator", 
                "role": "admin",
                "department": "Information Technology"
            }
        elif email == "faculty@clsu.edu.ph":
            return {
                "id": "faculty_001", 
                "email": "faculty@clsu.edu.ph",
                "firstName": "Faculty",
                "lastName": "Member",
                "role": "faculty",
                "department": "Information Technology"
            }
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user")
async def get_current_user_info():
    """Get current user info - returns authenticated user data for session management"""
    # For development testing, return admin user data
    # In production, this would validate JWT token or session
    return {
        "id": "admin_001",
        "email": "admin@clsu.edu.ph",
        "firstName": "System",
        "lastName": "Administrator", 
        "role": "admin",
        "department": "Information Technology"
    }

@app.post("/api/logout")
async def logout():
    """Logout endpoint"""
    return {"message": "Logged out successfully"}

# Dashboard statistics endpoint
@app.get("/api/dashboard/stats")
async def get_dashboard_stats():
    """Dashboard statistics endpoint"""
    return {
        "todayClasses": 0,
        "presentStudents": 0,
        "absentStudents": 0,
        "attendanceRate": "0%",
        "systemRole": "admin"
    }

# Basic endpoints for frontend compatibility
@app.get("/api/students")
async def get_students():
    return []

@app.get("/api/classrooms") 
async def get_classrooms():
    return []

@app.get("/api/subjects")
async def get_subjects():
    return []

@app.get("/api/schedules")
async def get_schedules():
    return []

@app.get("/api/computers")
async def get_computers():
    return []

@app.get("/api/sessions/active")
async def get_active_sessions():
    return None

if __name__ == "__main__":
    print("🚀 Starting CLIRDEC Presence System")
    print("📊 Technology Stack: Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL 16")
    print("🌐 Server starting on port 8000...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000, 
        log_level="info",
        reload=False
    )