#!/usr/bin/env python3
"""
Entry point for Railpack deployment
"""
from fastapi import FastAPI
from python_backend.main import app

# Re-export the app for Railpack detection
app = app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=5000,
        reload=False,
        log_level="info"
    )