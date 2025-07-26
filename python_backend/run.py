#!/usr/bin/env python3
"""
Entry point for the FastAPI application
"""
import uvicorn
import os

if __name__ == "__main__":
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", 8000))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
        access_log=True
    )