#!/usr/bin/env python3
"""
Python FastAPI server for CLIRDEC Presence
"""
import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import get_db, init_db

# Create FastAPI app
app = FastAPI(
    title="CLIRDEC Presence Python API",
    description="Attendance Management System - Python FastAPI Backend",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    print("Initializing Python FastAPI backend...")
    init_db()
    print("Database initialized successfully")

@app.get("/")
def root():
    return {
        "message": "CLIRDEC Presence Python Backend",
        "technology": "Python 3.11 + FastAPI",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy", 
        "backend": "Python FastAPI",
        "database": "PostgreSQL",
        "port": 8080
    }

@app.get("/api/user")
def get_user():
    """User endpoint - returns 401 for unauthenticated requests"""
    raise HTTPException(status_code=401, detail="Not authenticated")

@app.get("/api/test")
def api_test(db: Session = Depends(get_db)):
    """Test API endpoint with database connection"""
    try:
        # Test database connection
        from sqlalchemy import text
        result = db.execute(text("SELECT COUNT(*) as count FROM students")).fetchone()
        return {
            "message": "Python FastAPI backend working!",
            "technology": "Python 3.11 + FastAPI + SQLAlchemy",
            "database": "connected",
            "students_count": result.count if result else 0,
            "status": "success"
        }
    except Exception as e:
        return {
            "message": "Python FastAPI backend working!",
            "technology": "Python 3.11 + FastAPI",
            "database": f"error: {str(e)}",
            "status": "api_working"
        }

@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Dashboard statistics endpoint"""
    try:
        from sqlalchemy import text
        
        # Get basic counts
        students_result = db.execute(text("SELECT COUNT(*) as count FROM students WHERE is_active = true")).fetchone()
        sessions_result = db.execute(text("SELECT COUNT(*) as count FROM class_sessions")).fetchone()
        
        return {
            "totalStudents": students_result.count if students_result else 0,
            "activeSessions": 0,  # Will implement later
            "todayAttendance": 0,  # Will implement later
            "attendanceRate": 85.5,  # Mock for now
            "backend": "Python FastAPI"
        }
    except Exception as e:
        return {
            "totalStudents": 0,
            "activeSessions": 0,
            "todayAttendance": 0,
            "attendanceRate": 0,
            "error": str(e),
            "backend": "Python FastAPI"
        }

if __name__ == "__main__":
    print("Starting CLIRDEC Python FastAPI server on port 8080...")
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8080, 
        log_level="info",
        reload=False
    )