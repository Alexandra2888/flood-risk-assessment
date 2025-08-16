#!/bin/bash

# Start the FastAPI development server
echo "Starting Flood Risk Assessment Backend..."
echo "Server will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo "Health Check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Run the application with uv
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
