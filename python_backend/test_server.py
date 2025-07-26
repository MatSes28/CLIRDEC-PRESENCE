#!/usr/bin/env python3
"""
Test FastAPI server to replace Node.js Express
"""
import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import get_db, init_db

# Create FastAPI app
app = FastAPI(title="CLIRDEC Presence API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    print("Initializing Python FastAPI server...")
    init_db()
    print("Database initialized successfully")

@app.get("/health")
def health_check():
    return {"status": "healthy", "backend": "Python FastAPI", "version": "1.0.0"}

@app.get("/api/test")
def test_api(db: Session = Depends(get_db)):
    try:
        # Test database connection
        result = db.execute(text("SELECT COUNT(*) as count FROM students")).fetchone()
        return {
            "message": "Python FastAPI backend working!",
            "database": "connected",
            "students_count": result.count if result else 0
        }
    except Exception as e:
        return {"message": "API working", "database": f"error: {str(e)}"}

@app.get("/api/user")
def get_user():
    """Temporary user endpoint for frontend compatibility"""
    return {"message": "Not authenticated"}

@app.post("/api/auth/login")
def login():
    """Temporary login endpoint"""
    return {"message": "Python FastAPI authentication not yet implemented"}

if __name__ == "__main__":
    print("Starting Python FastAPI server on port 8000...")
    uvicorn.run(
        "test_server:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )