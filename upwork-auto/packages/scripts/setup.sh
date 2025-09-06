#!/bin/bash

# Upwork Automation Pipeline Setup Script
# This script sets up the complete automation pipeline

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        log_error "pnpm is not installed. Please install pnpm first."
        log_info "Install with: npm install -g pnpm"
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

setup_environment() {
    log_info "Setting up environment files..."
    
    # Copy environment examples
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        cp "$PROJECT_ROOT/env.example" "$PROJECT_ROOT/.env"
        log_success "Created .env file from template"
        log_warning "Please edit .env file with your actual credentials"
    else
        log_info ".env file already exists"
    fi
    
    # Copy infra environment
    if [ ! -f "$PROJECT_ROOT/packages/infra/.env" ]; then
        cp "$PROJECT_ROOT/packages/infra/env.example" "$PROJECT_ROOT/packages/infra/.env"
        log_success "Created infra/.env file from template"
    else
        log_info "infra/.env file already exists"
    fi
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    pnpm install
    
    log_success "Dependencies installed successfully"
}

setup_credentials() {
    log_info "Setting up credentials directory..."
    
    # Create credentials directory
    mkdir -p "$PROJECT_ROOT/packages/infra/credentials"
    
    # Create placeholder for Google Sheets credentials
    if [ ! -f "$PROJECT_ROOT/packages/infra/credentials/google-sheets.json" ]; then
        cat > "$PROJECT_ROOT/packages/infra/credentials/google-sheets.json" << EOF
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com"
}
EOF
        log_warning "Created placeholder Google Sheets credentials file"
        log_warning "Please replace with your actual service account credentials"
    fi
    
    log_success "Credentials directory set up"
}

start_infrastructure() {
    log_info "Starting infrastructure services..."
    
    cd "$PROJECT_ROOT/packages/infra"
    docker-compose up -d
    
    log_success "Infrastructure services started"
    log_info "Waiting for services to be ready..."
    
    # Wait for services to be healthy
    sleep 30
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        log_success "Services are running"
    else
        log_error "Some services failed to start. Check logs with: docker-compose logs"
        exit 1
    fi
}

deploy_workflows() {
    log_info "Deploying n8n workflows..."
    
    cd "$PROJECT_ROOT/packages/n8n"
    
    # Wait for n8n to be ready
    log_info "Waiting for n8n to be ready..."
    sleep 10
    
    # Deploy workflow
    if pnpm deploy; then
        log_success "Workflows deployed successfully"
    else
        log_warning "Workflow deployment failed. You may need to deploy manually."
    fi
}

show_status() {
    log_info "Setup completed! Here's the status:"
    echo ""
    echo "🌐 Services:"
    echo "  - n8n: http://localhost:5678 (admin/admin123)"
    echo "  - Adminer: http://localhost:8080"
    echo "  - PostgreSQL: localhost:5432"
    echo ""
    echo "📁 Important files:"
    echo "  - Environment: $PROJECT_ROOT/.env"
    echo "  - Infra config: $PROJECT_ROOT/packages/infra/.env"
    echo "  - Credentials: $PROJECT_ROOT/packages/infra/credentials/"
    echo ""
    echo "🔧 Next steps:"
    echo "  1. Edit .env files with your actual credentials"
    echo "  2. Update Google Sheets credentials"
    echo "  3. Deploy Apify actors"
    echo "  4. Test the pipeline"
    echo ""
    echo "📚 Documentation:"
    echo "  - Runbook: $PROJECT_ROOT/packages/docs/RUNBOOK.md"
    echo "  - Manual steps: $PROJECT_ROOT/packages/docs/MANUAL-STEPS.md"
}

# Main execution
main() {
    log_info "Starting Upwork Automation Pipeline Setup"
    echo ""
    
    check_dependencies
    setup_environment
    install_dependencies
    setup_credentials
    start_infrastructure
    deploy_workflows
    show_status
    
    log_success "Setup completed successfully!"
}

# Run main function
main "$@"
