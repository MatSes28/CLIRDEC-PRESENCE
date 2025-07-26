"""
Database configuration and connection management
"""
import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Database URL from environment with comprehensive fallbacks
DATABASE_URL = os.getenv("DATABASE_URL")

# Try to build DATABASE_URL from individual components if not available
if not DATABASE_URL or DATABASE_URL.strip() == "":
    PGHOST = os.getenv("PGHOST") 
    PGPORT = os.getenv("PGPORT")
    PGUSER = os.getenv("PGUSER")
    PGPASSWORD = os.getenv("PGPASSWORD")
    PGDATABASE = os.getenv("PGDATABASE")
    
    # Only build URL if we have actual values
    if all([PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE]):
        DATABASE_URL = f"postgresql://{PGUSER}:{PGPASSWORD}@{PGHOST}:{PGPORT}/{PGDATABASE}"
        print(f"✅ Built DATABASE_URL from components: postgresql://{PGUSER}:***@{PGHOST}:{PGPORT}/{PGDATABASE}")
    else:
        print("❌ PostgreSQL database not configured. Checking database provisioning...")
        
        # Use in-memory SQLite for development if PostgreSQL not available
        print("🔧 Falling back to SQLite for development")
        DATABASE_URL = "sqlite:///./clirdec_presence.db"

print(f"Connecting to database: {DATABASE_URL}")

# Create synchronous engine for now (easier SSL handling)
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Set to False in production
    pool_pre_ping=True
)

# Create session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables"""
    # Import all models to ensure they're registered
    from models import User, Student, Classroom, Subject, Schedule, ClassSession, AttendanceRecord, Computer
    Base.metadata.create_all(bind=engine)