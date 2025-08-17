#!/bin/bash

# Flood Risk Assessment Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_status "Docker is running"
}

# Check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed. Please install it and try again."
        exit 1
    fi
    print_status "docker-compose is available"
}

# Build and start services
deploy() {
    local env=${1:-dev}
    local compose_file="docker-compose.yml"
    
    if [ "$env" = "prod" ]; then
        compose_file="docker-compose.prod.yml"
        print_status "Deploying to production environment"
    else
        print_status "Deploying to development environment"
    fi
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose -f $compose_file down --remove-orphans
    
    # Build images
    print_status "Building Docker images..."
    docker-compose -f $compose_file build --no-cache
    
    # Start services
    print_status "Starting services..."
    docker-compose -f $compose_file up -d
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    sleep 10
    
    # Check service status
    print_status "Checking service status..."
    docker-compose -f $compose_file ps
    
    print_status "Deployment completed successfully!"
    print_status "Frontend: http://localhost:3000"
    print_status "Backend: http://localhost:8000"
    print_status "Backend API Docs: http://localhost:8000/docs"
}

# Stop services
stop() {
    local env=${1:-dev}
    local compose_file="docker-compose.yml"
    
    if [ "$env" = "prod" ]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    print_status "Stopping services..."
    docker-compose -f $compose_file down
    print_status "Services stopped"
}

# Show logs
logs() {
    local env=${1:-dev}
    local compose_file="docker-compose.yml"
    
    if [ "$env" = "prod" ]; then
        compose_file="docker-compose.prod.yml"
    fi
    
    docker-compose -f $compose_file logs -f
}

# Show usage
usage() {
    echo "Usage: $0 {deploy|stop|logs} [env]"
    echo ""
    echo "Commands:"
    echo "  deploy    Build and start services"
    echo "  stop      Stop services"
    echo "  logs      Show service logs"
    echo ""
    echo "Environment (optional):"
    echo "  dev       Development environment (default)"
    echo "  prod      Production environment"
    echo ""
    echo "Examples:"
    echo "  $0 deploy        # Deploy to development"
    echo "  $0 deploy prod   # Deploy to production"
    echo "  $0 stop          # Stop development services"
    echo "  $0 logs prod     # Show production logs"
}

# Main script logic
main() {
    case "${1:-deploy}" in
        deploy)
            check_docker
            check_docker_compose
            deploy "${2:-dev}"
            ;;
        stop)
            check_docker
            check_docker_compose
            stop "${2:-dev}"
            ;;
        logs)
            check_docker
            check_docker_compose
            logs "${2:-dev}"
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
