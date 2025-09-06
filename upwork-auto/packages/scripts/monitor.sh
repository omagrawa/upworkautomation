#!/bin/bash

# Upwork Automation Pipeline Monitoring Script
# This script monitors the health and performance of the automation pipeline

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

check_services() {
    log_info "Checking service status..."
    
    cd "$PROJECT_ROOT/packages/infra"
    
    echo ""
    echo "📊 Service Status:"
    echo "=================="
    
    # Check Docker Compose services
    docker-compose ps
    
    echo ""
    echo "🔍 Service Health Checks:"
    echo "========================="
    
    # Check n8n
    if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
        log_success "n8n is healthy"
    else
        log_error "n8n is not responding"
    fi
    
    # Check PostgreSQL
    if docker-compose exec -T postgres pg_isready -U n8n > /dev/null 2>&1; then
        log_success "PostgreSQL is healthy"
    else
        log_error "PostgreSQL is not responding"
    fi
    
    # Check Adminer
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        log_success "Adminer is accessible"
    else
        log_warning "Adminer is not accessible"
    fi
    
    # Check Redis (if enabled)
    if docker-compose ps | grep -q redis; then
        if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
            log_success "Redis is healthy"
        else
            log_error "Redis is not responding"
        fi
    fi
}

check_webhooks() {
    log_info "Testing webhook endpoints..."
    
    echo ""
    echo "🔗 Webhook Tests:"
    echo "================="
    
    # Test main webhook
    test_payload='{
        "source": "upwork-scraper",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
        "searchQuery": "monitoring test",
        "filters": {},
        "jobs": []
    }'
    
    response=$(curl -s -w "%{http_code}" -X POST http://localhost:5678/webhook/upwork-jobs \
        -H "Content-Type: application/json" \
        -d "$test_payload" -o /dev/null)
    
    if [ "$response" = "200" ]; then
        log_success "Main webhook is responding correctly"
    else
        log_error "Main webhook returned status: $response"
    fi
}

check_database() {
    log_info "Checking database status..."
    
    echo ""
    echo "🗄️  Database Status:"
    echo "==================="
    
    cd "$PROJECT_ROOT/packages/infra"
    
    # Check database size
    db_size=$(docker-compose exec -T postgres psql -U n8n -d n8n -t -c "SELECT pg_size_pretty(pg_database_size('n8n'));" | xargs)
    echo "Database size: $db_size"
    
    # Check table counts
    echo ""
    echo "Table counts:"
    docker-compose exec -T postgres psql -U n8n -d n8n -c "
        SELECT 
            schemaname,
            tablename,
            n_tup_ins as inserts,
            n_tup_upd as updates,
            n_tup_del as deletes
        FROM pg_stat_user_tables 
        ORDER BY n_tup_ins DESC 
        LIMIT 10;
    "
    
    # Check recent automation logs
    echo ""
    echo "Recent automation activity:"
    docker-compose exec -T postgres psql -U n8n -d n8n -c "
        SELECT 
            source,
            COUNT(*) as total_jobs,
            COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
            AVG(score) as avg_score,
            MAX(created_at) as last_activity
        FROM automation_logs 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY source;
    " 2>/dev/null || echo "No automation logs found"
}

check_logs() {
    log_info "Checking recent logs..."
    
    echo ""
    echo "📝 Recent Logs:"
    echo "==============="
    
    cd "$PROJECT_ROOT/packages/infra"
    
    # Show recent n8n logs
    echo "n8n logs (last 10 lines):"
    docker-compose logs --tail=10 n8n
    
    echo ""
    echo "PostgreSQL logs (last 5 lines):"
    docker-compose logs --tail=5 postgres
}

check_performance() {
    log_info "Checking system performance..."
    
    echo ""
    echo "⚡ Performance Metrics:"
    echo "======================"
    
    # Check Docker resource usage
    echo "Docker resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
    
    echo ""
    echo "Disk usage:"
    df -h | grep -E "(Filesystem|/dev/)"
    
    echo ""
    echo "Memory usage:"
    free -h
}

check_apify_status() {
    log_info "Checking Apify actor status..."
    
    echo ""
    echo "🤖 Apify Actor Status:"
    echo "====================="
    
    # Check if Apify CLI is available
    if command -v apify &> /dev/null; then
        echo "Apify CLI is available"
        
        # List actors (if authenticated)
        if apify info > /dev/null 2>&1; then
            echo "Apify authentication: ✅"
            echo ""
            echo "Your actors:"
            apify list | head -10
        else
            log_warning "Apify not authenticated. Run 'apify login' first."
        fi
    else
        log_warning "Apify CLI not installed"
    fi
}

generate_report() {
    log_info "Generating monitoring report..."
    
    report_file="$PROJECT_ROOT/monitoring-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "Upwork Automation Pipeline Monitoring Report"
        echo "Generated: $(date)"
        echo "=============================================="
        echo ""
        
        echo "Service Status:"
        cd "$PROJECT_ROOT/packages/infra"
        docker-compose ps
        echo ""
        
        echo "Database Size:"
        docker-compose exec -T postgres psql -U n8n -d n8n -t -c "SELECT pg_size_pretty(pg_database_size('n8n'));" | xargs
        echo ""
        
        echo "Recent Activity:"
        docker-compose exec -T postgres psql -U n8n -d n8n -c "
            SELECT 
                source,
                COUNT(*) as total_jobs,
                COUNT(CASE WHEN status = 'success' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                AVG(score) as avg_score,
                MAX(created_at) as last_activity
            FROM automation_logs 
            WHERE created_at >= NOW() - INTERVAL '24 hours'
            GROUP BY source;
        " 2>/dev/null || echo "No automation logs found"
        echo ""
        
        echo "System Resources:"
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
        
    } > "$report_file"
    
    log_success "Report generated: $report_file"
}

# Main execution
main() {
    case "${1:-all}" in
        "services")
            check_services
            ;;
        "webhooks")
            check_webhooks
            ;;
        "database")
            check_database
            ;;
        "logs")
            check_logs
            ;;
        "performance")
            check_performance
            ;;
        "apify")
            check_apify_status
            ;;
        "report")
            generate_report
            ;;
        "all"|*)
            check_services
            check_webhooks
            check_database
            check_logs
            check_performance
            check_apify_status
            ;;
    esac
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  services    - Check service status and health"
    echo "  webhooks    - Test webhook endpoints"
    echo "  database    - Check database status and activity"
    echo "  logs        - Show recent logs"
    echo "  performance - Check system performance"
    echo "  apify       - Check Apify actor status"
    echo "  report      - Generate monitoring report"
    echo "  all         - Run all checks (default)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all checks"
    echo "  $0 services          # Check only services"
    echo "  $0 database          # Check only database"
    echo "  $0 report            # Generate report"
    exit 0
fi

# Run main function
main "$@"
