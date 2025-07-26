#!/usr/bin/env python3
"""
Robust FastAPI server starter for CLIRDEC Presence System
Technology Stack: Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL 16
"""
import os
import sys
import signal
import uvicorn
from contextlib import asynccontextmanager

# Ensure proper path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

@asynccontextmanager
async def lifespan(app):
    """Application lifespan handler"""
    print("🚀 Starting CLIRDEC Presence System")
    print("📊 Technology Stack: Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL 16")
    
    # Initialize database
    try:
        from database import init_db
        init_db()
        print("✅ PostgreSQL database initialized successfully")
    except Exception as e:
        print(f"⚠️ Database initialization warning: {e}")
    
    yield
    
    print("🔄 Shutting down CLIRDEC Presence System")

def create_app():
    """Create and configure FastAPI application"""
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    app = FastAPI(
        title="CLIRDEC: Presence Attendance Management System",
        description="Python 3.11 + FastAPI + SQLAlchemy backend for educational attendance management",
        version="2.0.0",
        lifespan=lifespan
    )
    
    # CORS configuration for React frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://0.0.0.0:3000", "*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    
    return app

def setup_routes(app):
    """Add API routes to the application"""
    
    @app.get("/")
    async def root():
        return {
            "message": "CLIRDEC Presence System - Python 3.11 FastAPI Backend",
            "version": "2.0.0",
            "status": "operational",
            "stack": "Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL 16"
        }
    
    @app.get("/health")
    async def health_check():
        return {
            "status": "healthy",
            "backend": "Python 3.11 FastAPI",
            "database": "PostgreSQL + SQLAlchemy"
        }
    
    @app.post("/api/login")
    async def login(credentials: dict):
        """Login endpoint for authentication"""
        email = credentials.get("email")
        password = credentials.get("password")
        
        if not email or not password:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Email and password required")
        
        # Mock authentication for development
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
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Invalid credentials")
    
    @app.get("/api/user")
    async def get_current_user():
        """Get current authenticated user"""
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
    
    @app.get("/api/dashboard/stats")
    async def get_dashboard_stats():
        """Dashboard statistics"""
        return {
            "todayClasses": 0,
            "presentStudents": 0,
            "absentStudents": 0,
            "attendanceRate": "0%",
            "systemRole": "admin"
        }

def run_server():
    """Run the FastAPI server"""
    app = create_app()
    setup_routes(app)
    
    print("🌐 Starting Python 3.11 FastAPI server on port 8000...")
    
    # Handle graceful shutdown
    def signal_handler(signum, frame):
        print("\n🛑 Graceful shutdown initiated...")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info",
            access_log=True,
            reload=False
        )
    except Exception as e:
        print(f"❌ Server startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_server()