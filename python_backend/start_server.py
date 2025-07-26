#!/usr/bin/env python3
"""
Production server starter for CLIRDEC Presence System
Technology Stack: Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL 16
"""
import os
import sys
import subprocess
import uvicorn

def start_fastapi_server():
    """Start the FastAPI server with proper configuration"""
    print("🚀 Starting CLIRDEC Presence System")
    print("📊 Technology Stack: Python 3.11 + FastAPI + SQLAlchemy + PostgreSQL 16")
    
    # Ensure DATABASE_URL is available
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not found")
        print("🔧 Using local PostgreSQL database...")
        # Set a default DATABASE_URL for development
        os.environ['DATABASE_URL'] = 'postgresql://postgres:password@localhost:5432/clirdec_presence'
    else:
        print(f"✅ Database URL configured: {database_url[:30]}...")

    # Start the FastAPI server
    try:
        print("🌐 Starting FastAPI server on port 8080...")
        uvicorn.run(
            "run_fastapi:app",
            host="0.0.0.0",
            port=8080,
            reload=False,
            log_level="info"
        )
    except Exception as e:
        print(f"❌ Failed to start FastAPI server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_fastapi_server()