"""
Simple FastAPI server for testing
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db, init_db

# Create FastAPI app
app = FastAPI(
    title="CLIRDEC Presence API",
    description="Attendance Management System API",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_db()

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "FastAPI server is running"}

# Basic API endpoint
@app.get("/api/test")
def test_api():
    return {"message": "Python FastAPI backend is working!", "technology": "Python 3.11 + FastAPI"}

# Test database connection
@app.get("/api/db-test")
def test_database(db: Session = Depends(get_db)):
    try:
        # Simple query to test database connection
        result = db.execute("SELECT 1 as test").fetchone()
        return {"status": "success", "message": "Database connection working", "result": result.test}
    except Exception as e:
        return {"status": "error", "message": f"Database error: {str(e)}"}

# Simple login response schema
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    message: str
    user: dict
    token: str

# Simple auth endpoint for testing
@app.post("/api/auth/login", response_model=LoginResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """Simple login for testing"""
    # For now, accept admin credentials
    if credentials.email == "admin@clsu.edu.ph" and credentials.password == "admin123":
        return LoginResponse(
            message="Login successful",
            user={
                "id": 1,
                "email": "admin@clsu.edu.ph",
                "name": "System Administrator",
                "role": "ADMIN"
            },
            token="test-jwt-token"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)