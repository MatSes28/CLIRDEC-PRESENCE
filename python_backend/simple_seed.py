"""
Simple seed script to populate the database with sample data
"""
from datetime import datetime, time, date, timedelta

from database import SessionLocal, init_db
from models import User, Student, Classroom, Subject, UserRole
from auth import get_password_hash

def simple_seed():
    """Simple seed for testing"""
    print("Starting simple database seeding...")
    
    # Initialize database tables
    init_db()
    
    db = SessionLocal()
    try:
        # Create sample users
        admin_user = User(
            email="admin@clsu.edu.ph",
            name="System Administrator",
            role=UserRole.ADMIN,
            hashed_password=get_password_hash("admin123"),
            is_active=True
        )
        
        faculty_user = User(
            email="faculty@clsu.edu.ph", 
            name="Professor Faculty",
            role=UserRole.FACULTY,
            hashed_password=get_password_hash("faculty123"),
            is_active=True
        )
        
        db.add(admin_user)
        db.add(faculty_user)
        db.commit()
        
        print(f"Created users: {admin_user.email}, {faculty_user.email}")
        
        # Create sample classroom
        lab_204 = Classroom(
            name="Lab 204",
            location="2nd Floor, CS Building",
            capacity=30,
            description="Computer Laboratory with 30 workstations",
            equipment={"computers": 30, "projector": 1, "whiteboard": 1},
            is_active=True
        )
        
        db.add(lab_204)
        db.commit()
        
        print(f"Created classroom: {lab_204.name}")
        
        # Create sample students
        student1 = Student(
            student_id="2024-001",
            name="Juan Cruz",
            email="juan.cruz@student.clsu.edu.ph",
            rfid_card_id="RFID001",
            program="Computer Science",
            year_level=1,
            section="A",
            is_active=True
        )
        
        student2 = Student(
            student_id="2024-002", 
            name="Maria Santos",
            email="maria.santos@student.clsu.edu.ph",
            rfid_card_id="RFID002",
            program="Computer Science", 
            year_level=1,
            section="A",
            is_active=True
        )
        
        db.add(student1)
        db.add(student2)
        db.commit()
        
        print(f"Created students: {student1.name}, {student2.name}")
        print("Simple database seeding completed successfully!")
        
    except Exception as e:
        print(f"Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    simple_seed()