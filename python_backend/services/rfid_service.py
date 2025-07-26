"""
RFID simulation and hardware integration service
"""
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
import random

from schemas import RFIDSimulation
from services.attendance_service import AttendanceService

class RFIDService:
    """Service for RFID operations and simulation"""
    
    def __init__(self):
        self.attendance_service = AttendanceService()
    
    async def simulate_tap(self, db: AsyncSession, rfid_data: RFIDSimulation) -> dict:
        """Simulate RFID card tap for development/testing"""
        try:
            # Simulate proximity detection
            if not rfid_data.proximity_detected:
                return {
                    "success": False,
                    "message": "Proximity sensor did not detect presence",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Simulate tap strength validation
            if rfid_data.tap_strength < 5:
                return {
                    "success": False,
                    "message": "Tap strength too weak, please tap firmly",
                    "timestamp": datetime.now().isoformat()
                }
            
            # Try to check in the student
            from schemas import AttendanceCheckin
            checkin_data = AttendanceCheckin(rfid_card_id=rfid_data.rfid_card_id)
            
            try:
                record = await self.attendance_service.checkin_student(db, checkin_data)
                return {
                    "success": True,
                    "message": "Student checked in successfully",
                    "student_id": record.student_id,
                    "timestamp": record.checkin_time.isoformat(),
                    "tap_strength": rfid_data.tap_strength
                }
            except ValueError as e:
                # If check-in fails, try check-out
                if "already checked in" in str(e):
                    from schemas import AttendanceCheckout
                    checkout_data = AttendanceCheckout(rfid_card_id=rfid_data.rfid_card_id)
                    
                    try:
                        record = await self.attendance_service.checkout_student(db, checkout_data)
                        return {
                            "success": True,
                            "message": "Student checked out successfully",
                            "student_id": record.student_id,
                            "timestamp": record.checkout_time.isoformat(),
                            "tap_strength": rfid_data.tap_strength
                        }
                    except ValueError as checkout_error:
                        return {
                            "success": False,
                            "message": str(checkout_error),
                            "timestamp": datetime.now().isoformat()
                        }
                else:
                    return {
                        "success": False,
                        "message": str(e),
                        "timestamp": datetime.now().isoformat()
                    }
        
        except Exception as e:
            return {
                "success": False,
                "message": f"RFID processing error: {str(e)}",
                "timestamp": datetime.now().isoformat()
            }
    
    def validate_hardware_connection(self) -> dict:
        """Validate RFID hardware connection (placeholder for real hardware)"""
        # Simulate hardware check
        is_connected = random.choice([True, False])
        
        return {
            "hardware_connected": is_connected,
            "port": "/dev/ttyUSB0" if is_connected else None,
            "signal_strength": random.randint(1, 10) if is_connected else 0,
            "last_check": datetime.now().isoformat()
        }