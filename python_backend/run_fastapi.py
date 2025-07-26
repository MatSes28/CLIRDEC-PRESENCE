#!/usr/bin/env python3
"""
Simple FastAPI server runner
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create a minimal FastAPI app
app = FastAPI(title="CLIRDEC Python Backend")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Python FastAPI Backend Running", "version": "1.0.0"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "backend": "Python FastAPI"}

@app.get("/api/user")
def get_user():
    """User endpoint for frontend compatibility"""
    raise HTTPException(status_code=401, detail="Not authenticated")

@app.get("/api/test")  
def api_test():
    return {"message": "Python FastAPI API working!", "backend": "FastAPI", "status": "success"}

if __name__ == "__main__":
    print("Starting FastAPI server on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")