#!/bin/bash

# Upwork Automation Pipeline Deployment Script
# This script deploys the complete automation pipeline

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

check_environment() {
    log_info "Checking environment configuration..."
    
    # Check if .env file exists
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_error ".env file not found. Please run setup.sh first."
        exit 1
    fi
    
    # Check if infra .env exists
    if [ ! -f "$PROJECT_ROOT/packages/infra/.env" ]; then
        log_error "infra/.env file not found. Please run setup.sh first."
        exit 1
    fi
    
    # Check if credentials exist
    if [ ! -f "$PROJECT_ROOT/packages/infra/credentials/google-sheets.json" ]; then
        log_warning "Google Sheets credentials not found. Please add them before deployment."
    fi
    
    log_success "Environment configuration checked"
}

deploy_infrastructure() {
    log_info "Deploying infrastructure services..."
    
    cd "$PROJECT_ROOT/packages/infra"
    
    # Build and start services
    docker-compose down --remove-orphans
    docker-compose build
    docker-compose up -d
    
    log_success "Infrastructure services deployed"
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    if docker-compose ps | grep -q "Up"; then
        log_success "All services are running"
    else
        log_error "Some services failed to start"
        docker-compose logs
        exit 1
    fi
}

deploy_apify_actors() {
    log_info "Deploying Apify actors..."
    
    # Deploy scraper actor
    log_info "Deploying scraper actor..."
    cd "$PROJECT_ROOT/packages/apify-scraper"
    
    if command -v apify &> /dev/null; then
        apify push
        log_success "Scraper actor deployed"
    else
        log_warning "Apify CLI not found. Please deploy actors manually."
        log_info "Scraper actor location: $PROJECT_ROOT/packages/apify-scraper"
    fi
    
    # Deploy submitter actor
    log_info "Deploying submitter actor..."
    cd "$PROJECT_ROOT/packages/apify-submit"
    
    if command -v apify &> /dev/null; then
        apify push
        log_success "Submitter actor deployed"
    else
        log_warning "Apify CLI not found. Please deploy actors manually."
        log_info "Submitter actor location: $PROJECT_ROOT/packages/apify-submit"
    fi
}

deploy_n8n_workflows() {
    log_info "Deploying n8n workflows..."
    
    cd "$PROJECT_ROOT/packages/n8n"
    
    # Wait for n8n to be ready
    log_info "Waiting for n8n to be ready..."
    max_attempts=30
    attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
            log_success "n8n is ready"
            break
        fi
        
        attempt=$((attempt + 1))
        log_info "Waiting for n8n... (attempt $attempt/$max_attempts)"
        sleep 10
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "n8n failed to start within expected time"
        exit 1
    fi
    
    # Deploy workflow
    if pnpm deploy; then
        log_success "n8n workflows deployed"
    else
        log_warning "Workflow deployment failed. Please deploy manually."
    fi
}

test_deployment() {
    log_info "Testing deployment..."
    
    # Test n8n webhook
    log_info "Testing n8n webhook endpoint..."
    
    test_payload='{
        "source": "upwork-scraper",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
        "searchQuery": "test",
        "filters": {},
        "jobs": []
    }'
    
    if curl -s -X POST http://localhost:5678/webhook/upwork-jobs \
        -H "Content-Type: application/json" \
        -d "$test_payload" > /dev/null; then
        log_success "Webhook endpoint is working"
    else
        log_warning "Webhook endpoint test failed"
    fi
    
    # Test database connection
    log_info "Testing database connection..."
    
    if docker-compose exec -T postgres psql -U n8n -d n8n -c "SELECT 1;" > /dev/null 2>&1; then
        log_success "Database connection is working"
    else
        log_warning "Database connection test failed"
    fi
}

show_deployment_status() {
    log_info "Deployment completed! Here's the status:"
    echo ""
    echo "🌐 Services:"
    echo "  - n8n: http://localhost:5678"
    echo "  - Adminer: http://localhost:8080"
    echo "  - PostgreSQL: localhost:5432"
    echo ""
    echo "🔗 Webhook endpoints:"
    echo "  - Job data: http://localhost:5678/webhook/upwork-jobs"
    echo ""
    echo "📊 Monitoring:"
    echo "  - Service status: docker-compose ps"
    echo "  - Service logs: docker-compose logs -f"
    echo "  - n8n logs: docker-compose logs -f n8n"
    echo ""
    echo "🔧 Management:"
    echo "  - Stop services: docker-compose down"
    echo "  - Restart services: docker-compose restart"
    echo "  - Update services: docker-compose pull && docker-compose up -d"
    echo ""
    echo "📚 Next steps:"
    echo "  1. Configure Apify actors with webhook URL"
    echo "  2. Set up Google Sheets integration"
    echo "  3. Test the complete pipeline"
    echo "  4. Monitor job processing and submissions"
}

# Main execution
main() {
    log_info "Starting Upwork Automation Pipeline Deployment"
    echo ""
    
    check_environment
    deploy_infrastructure
    deploy_apify_actors
    deploy_n8n_workflows
    test_deployment
    show_deployment_status
    
    log_success "Deployment completed successfully!"
}

# Run main function
main "$@"
