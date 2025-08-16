# Flood Risk Assessment Backend

A FastAPI-based backend service for flood risk assessment using Google AI and image analysis.

## Features

- **Image Analysis**: AI-powered flood risk assessment using Google Gemini Pro Vision
- **Manual Assessment**: Create manual flood risk assessments with custom parameters
- **Risk Factors**: Access common flood risk factors and assessment criteria
- **RESTful API**: Clean, documented API endpoints with automatic OpenAPI documentation
- **CORS Support**: Configured for frontend integration
- **Environment Configuration**: Flexible configuration management

## Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **Uvicorn**: ASGI server for running FastAPI applications
- **Google Generative AI**: AI-powered image analysis
- **Pydantic**: Data validation and settings management
- **Pillow**: Image processing capabilities
- **uv**: Fast Python package installer and resolver

## Prerequisites

- Python 3.11+
- uv package manager
- Google AI API key (for AI-powered analysis)

## Installation

1. **Clone the repository** (if not already done):
   ```bash
   cd backend
   ```

2. **Install dependencies using uv**:
   ```bash
   uv sync
   ```

3. **Set up environment variables**:
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Install additional dependencies** (if needed):
   ```bash
   uv add <package-name>
   ```

## Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=8000
HOST=0.0.0.0
DEBUG=true

# Google AI Configuration
GOOGLE_API_KEY=your_google_api_key_here

# Security
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Running the Application

### Development Mode
```bash
uv run python main.py
```

### Production Mode
```bash
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Using uv directly
```bash
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Core Endpoints
- `GET /` - Root endpoint with API information
- `GET /health` - Health check endpoint
- `GET /docs` - Interactive API documentation (Swagger UI)
- `GET /redoc` - Alternative API documentation

### API v1 Endpoints
- `GET /api/v1/` - API root
- `GET /api/v1/health` - API health check
- `POST /api/v1/analyze-image` - Analyze image for flood risk
- `GET /api/v1/risk-factors` - Get common risk factors
- `POST /api/v1/manual-assessment` - Create manual assessment

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   └── endpoints.py
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py
│   ├── services/
│   │   └── __init__.py
│   └── utils/
│       └── __init__.py
├── main.py
├── pyproject.toml
├── requirements.txt
├── env.example
└── README.md
```

## Development

### Adding New Dependencies
```bash
uv add <package-name>
```

### Running Tests
```bash
# Add pytest if not already installed
uv add pytest pytest-asyncio httpx

# Run tests
uv run pytest
```

### Code Formatting
```bash
# Add black if not already installed
uv add black

# Format code
uv run black .
```

## Docker Support

To run with Docker:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Contributing

1. Follow PEP 8 style guidelines
2. Add type hints to all functions
3. Include docstrings for all public functions
4. Write tests for new functionality
5. Update documentation as needed

## License

This project is part of the Flood Risk Assessment application.
