"""
Seed script to populate the database with sample data
"""
from datetime import datetime, time, date, timedelta
from sqlalchemy.orm import Session

from database import SessionLocal, init_db
from models import User, Student, Classroom, Subject, Schedule, ClassSession, AttendanceRecord, Computer, UserRole, AttendanceStatus, ComputerStatus
from auth import get_password_hash

def seed_database():
    """Seed the database with sample data"""
    print("Starting database seeding...")
    
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
        
        # Refresh to get IDs
        db.refresh(admin_user)
        db.refresh(faculty_user)
        
        print(f"Created users: {admin_user.email}, {faculty_user.email}")
            
            # Create sample classrooms
            lab_204 = Classroom(
                name="Lab 204",
                location="2nd Floor, CS Building",
                capacity=30,
                description="Computer Laboratory with 30 workstations",
                equipment={"computers": 30, "projector": 1, "whiteboard": 1},
                is_active=True
            )
            
            room_301 = Classroom(
                name="Room 301",
                location="3rd Floor, Main Building", 
                capacity=40,
                description="Regular classroom with multimedia setup",
                equipment={"projector": 1, "whiteboard": 1, "speakers": 1},
                is_active=True
            )
            
            db.add(lab_204)
            db.add(room_301)
            db.commit()
            db.refresh(lab_204)
            db.refresh(room_301)
            
            print(f"Created classrooms: {lab_204.name}, {room_301.name}")
            
            # Create sample subjects
            cs101 = Subject(
                code="CS101",
                name="Introduction to Computer Science",
                description="Basic concepts of computer science and programming",
                credits=3,
                professor_id=faculty_user.id,
                is_active=True
            )
            
            cs201 = Subject(
                code="CS201", 
                name="Data Structures and Algorithms",
                description="Advanced programming concepts and algorithms",
                credits=4,
                professor_id=faculty_user.id,
                is_active=True
            )
            
            db.add(cs101)
            db.add(cs201)
            db.commit()
            db.refresh(cs101)
            db.refresh(cs201)
            
            print(f"Created subjects: {cs101.code}, {cs201.code}")
            
            # Create sample students
            students_data = [
                {
                    "student_id": "2024-001",
                    "name": "Juan Cruz",
                    "email": "juan.cruz@student.clsu.edu.ph",
                    "phone": "+63912345001",
                    "parent_email": "parent.cruz@email.com",
                    "parent_phone": "+63912345101", 
                    "rfid_card_id": "RFID001",
                    "program": "Computer Science",
                    "year_level": 1,
                    "section": "A"
                },
                {
                    "student_id": "2024-002",
                    "name": "Maria Santos",
                    "email": "maria.santos@student.clsu.edu.ph",
                    "phone": "+63912345002",
                    "parent_email": "parent.santos@email.com",
                    "parent_phone": "+63912345102",
                    "rfid_card_id": "RFID002", 
                    "program": "Computer Science",
                    "year_level": 1,
                    "section": "A"
                },
                {
                    "student_id": "2024-003",
                    "name": "Carlos Reyes",
                    "email": "carlos.reyes@student.clsu.edu.ph",
                    "phone": "+63912345003",
                    "parent_email": "parent.reyes@email.com",
                    "parent_phone": "+63912345103",
                    "rfid_card_id": "RFID003",
                    "program": "Computer Science", 
                    "year_level": 2,
                    "section": "B"
                },
                {
                    "student_id": "2024-004",
                    "name": "Ana Garcia",
                    "email": "ana.garcia@student.clsu.edu.ph",
                    "phone": "+63912345004",
                    "parent_email": "parent.garcia@email.com",
                    "parent_phone": "+63912345104",
                    "rfid_card_id": "RFID004",
                    "program": "Information Technology",
                    "year_level": 1,
                    "section": "A"
                },
                {
                    "student_id": "2024-005",
                    "name": "Jose Rodriguez",
                    "email": "jose.rodriguez@student.clsu.edu.ph",
                    "phone": "+63912345005",
                    "parent_email": "parent.rodriguez@email.com", 
                    "parent_phone": "+63912345105",
                    "rfid_card_id": "RFID005",
                    "program": "Information Technology",
                    "year_level": 2,
                    "section": "A"
                }
            ]
            
            students = []
            for student_data in students_data:
                student = Student(**student_data, is_active=True)
                students.append(student)
                db.add(student)
            
            db.commit()
            for student in students:
                db.refresh(student)
            
            print(f"Created {len(students)} students")
            
            # Create sample computers for Lab 204
            computers = []
            for i in range(1, 9):  # Create 8 computers
                computer = Computer(
                    classroom_id=lab_204.id,
                    computer_name=f"PC-{i:02d}",
                    ip_address=f"192.168.1.{100 + i}",
                    mac_address=f"00:11:22:33:44:{i:02d}",
                    specifications={
                        "cpu": "Intel Core i5",
                        "ram": "8GB",
                        "storage": "256GB SSD",
                        "os": "Windows 11"
                    },
                    status=ComputerStatus.AVAILABLE,
                    is_active=True
                )
                computers.append(computer)
                db.add(computer)
            
            db.commit()
            for computer in computers:
                db.refresh(computer)
            
            print(f"Created {len(computers)} computers")
            
            # Create sample schedules
            schedule1 = Schedule(
                subject_id=cs101.id,
                classroom_id=lab_204.id,
                day_of_week=0,  # Monday
                start_time=time(8, 0),  # 8:00 AM
                end_time=time(10, 0),   # 10:00 AM
                semester="1st Semester",
                academic_year="2024-2025",
                is_active=True
            )
            
            schedule2 = Schedule(
                subject_id=cs201.id,
                classroom_id=lab_204.id,
                day_of_week=2,  # Wednesday
                start_time=time(13, 0), # 1:00 PM
                end_time=time(15, 0),   # 3:00 PM
                semester="1st Semester",
                academic_year="2024-2025",
                is_active=True
            )
            
            db.add(schedule1)
            db.add(schedule2)
            db.commit()
            db.refresh(schedule1)
            db.refresh(schedule2)
            
            print(f"Created schedules for {cs101.code} and {cs201.code}")
            
            # Create sample class sessions and attendance
            today = date.today()
            
            # Create a class session for today
            session = ClassSession(
                schedule_id=schedule1.id,
                date=today,
                actual_start_time=datetime.now() - timedelta(hours=1),
                status="active",
                notes="Sample class session"
            )
            
            db.add(session)
            db.commit()
            db.refresh(session)
            
            # Add some attendance records
            for i, student in enumerate(students[:3]):  # First 3 students
                status = AttendanceStatus.PRESENT if i < 2 else AttendanceStatus.LATE
                is_late = i >= 2
                minutes_late = 15 if is_late else 0
                
                attendance = AttendanceRecord(
                    student_id=student.id,
                    class_session_id=session.id,
                    checkin_time=datetime.now() - timedelta(minutes=60-i*10),
                    status=status,
                    is_late=is_late,
                    minutes_late=minutes_late,
                    computer_id=computers[i].id if i < len(computers) else None
                )
                db.add(attendance)
            
            db.commit()
            
            print(f"Created class session with attendance records")
            print("Database seeding completed successfully!")
            
        except Exception as e:
            print(f"Error during seeding: {e}")
            db.rollback()
            raise
        finally:
            db.close()

if __name__ == "__main__":
    seed_database()