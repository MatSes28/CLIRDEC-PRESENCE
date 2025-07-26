#!/usr/bin/env python3
"""
Debug script to test Python FastAPI server startup
"""
import os
import sys
import traceback

print("🔍 Debug: Python FastAPI Server Startup")
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")

# Check environment variables
print("\n📊 Environment Variables:")
for key in ['DATABASE_URL', 'PGHOST', 'PGPORT', 'PGUSER', 'PGPASSWORD', 'PGDATABASE']:
    value = os.getenv(key)
    if key == 'PGPASSWORD' and value:
        print(f"{key}: ***")
    else:
        print(f"{key}: {value}")

# Test imports
print("\n📦 Testing imports...")
try:
    from fastapi import FastAPI
    print("✅ FastAPI imported successfully")
except ImportError as e:
    print(f"❌ FastAPI import failed: {e}")

try:
    import uvicorn
    print("✅ Uvicorn imported successfully") 
except ImportError as e:
    print(f"❌ Uvicorn import failed: {e}")

try:
    from sqlalchemy import create_engine
    print("✅ SQLAlchemy imported successfully")
except ImportError as e:
    print(f"❌ SQLAlchemy import failed: {e}")

# Test database connection
print("\n🗄️ Testing database connection...")
try:
    from database import DATABASE_URL
    print(f"Database URL configured: {DATABASE_URL[:50]}...")
    
    from database import engine
    print("✅ Database engine created successfully")
    
    # Test connection
    with engine.connect() as conn:
        result = conn.execute("SELECT 1")
        print("✅ Database connection successful")
        
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    traceback.print_exc()

# Test FastAPI app creation
print("\n🚀 Testing FastAPI app creation...")
try:
    from run_fastapi import app
    print("✅ FastAPI app created successfully")
    print(f"App title: {app.title}")
except Exception as e:
    print(f"❌ FastAPI app creation failed: {e}")
    traceback.print_exc()

print("\n🎯 Debug complete!")