#!/bin/bash

# Upwork Automation Pipeline Backup Script
# This script creates backups of the automation pipeline data

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
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

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

create_backup_directory() {
    log_info "Creating backup directory..."
    
    mkdir -p "$BACKUP_DIR/$TIMESTAMP"
    log_success "Backup directory created: $BACKUP_DIR/$TIMESTAMP"
}

backup_database() {
    log_info "Backing up PostgreSQL database..."
    
    cd "$PROJECT_ROOT/packages/infra"
    
    # Create database dump
    docker-compose exec -T postgres pg_dump -U n8n -d n8n > "$BACKUP_DIR/$TIMESTAMP/database.sql"
    
    # Create compressed version
    gzip "$BACKUP_DIR/$TIMESTAMP/database.sql"
    
    log_success "Database backup completed: database.sql.gz"
}

backup_n8n_data() {
    log_info "Backing up n8n data..."
    
    cd "$PROJECT_ROOT/packages/infra"
    
    # Copy n8n data volume
    docker-compose exec -T n8n tar -czf - -C /home/node/.n8n . > "$BACKUP_DIR/$TIMESTAMP/n8n-data.tar.gz"
    
    log_success "n8n data backup completed: n8n-data.tar.gz"
}

backup_workflows() {
    log_info "Backing up n8n workflows..."
    
    # Copy workflow files
    cp -r "$PROJECT_ROOT/packages/n8n/workflows" "$BACKUP_DIR/$TIMESTAMP/"
    
    # Export workflows from n8n (if available)
    cd "$PROJECT_ROOT/packages/n8n"
    if [ -f "scripts/export-workflow.js" ]; then
        if pnpm export > /dev/null 2>&1; then
            cp -r exports "$BACKUP_DIR/$TIMESTAMP/n8n-exports"
            log_success "n8n workflow exports completed"
        else
            log_warning "Failed to export workflows from n8n"
        fi
    fi
    
    log_success "Workflow backup completed"
}

backup_configurations() {
    log_info "Backing up configuration files..."
    
    # Create config backup directory
    mkdir -p "$BACKUP_DIR/$TIMESTAMP/config"
    
    # Copy environment files
    cp "$PROJECT_ROOT/.env" "$BACKUP_DIR/$TIMESTAMP/config/" 2>/dev/null || log_warning ".env file not found"
    cp "$PROJECT_ROOT/packages/infra/.env" "$BACKUP_DIR/$TIMESTAMP/config/infra.env" 2>/dev/null || log_warning "infra/.env file not found"
    
    # Copy Docker Compose files
    cp "$PROJECT_ROOT/packages/infra/docker-compose.yml" "$BACKUP_DIR/$TIMESTAMP/config/"
    cp -r "$PROJECT_ROOT/packages/infra/nginx" "$BACKUP_DIR/$TIMESTAMP/config/" 2>/dev/null || log_warning "nginx config not found"
    
    # Copy package.json files
    find "$PROJECT_ROOT" -name "package.json" -exec cp {} "$BACKUP_DIR/$TIMESTAMP/config/" \;
    
    log_success "Configuration backup completed"
}

backup_credentials() {
    log_info "Backing up credentials (encrypted)..."
    
    # Create credentials backup directory
    mkdir -p "$BACKUP_DIR/$TIMESTAMP/credentials"
    
    # Copy credentials with restricted permissions
    if [ -d "$PROJECT_ROOT/packages/infra/credentials" ]; then
        cp -r "$PROJECT_ROOT/packages/infra/credentials"/* "$BACKUP_DIR/$TIMESTAMP/credentials/" 2>/dev/null || log_warning "No credentials found"
        
        # Set restrictive permissions
        chmod -R 600 "$BACKUP_DIR/$TIMESTAMP/credentials"
        
        log_success "Credentials backup completed (encrypted)"
    else
        log_warning "No credentials directory found"
    fi
}

backup_logs() {
    log_info "Backing up logs..."
    
    cd "$PROJECT_ROOT/packages/infra"
    
    # Create logs backup directory
    mkdir -p "$BACKUP_DIR/$TIMESTAMP/logs"
    
    # Export recent logs
    docker-compose logs --no-color > "$BACKUP_DIR/$TIMESTAMP/logs/docker-compose.log"
    docker-compose logs --no-color n8n > "$BACKUP_DIR/$TIMESTAMP/logs/n8n.log"
    docker-compose logs --no-color postgres > "$BACKUP_DIR/$TIMESTAMP/logs/postgres.log"
    
    log_success "Logs backup completed"
}

create_backup_manifest() {
    log_info "Creating backup manifest..."
    
    manifest_file="$BACKUP_DIR/$TIMESTAMP/backup-manifest.txt"
    
    {
        echo "Upwork Automation Pipeline Backup"
        echo "=================================="
        echo "Backup Date: $(date)"
        echo "Backup Directory: $BACKUP_DIR/$TIMESTAMP"
        echo ""
        echo "Contents:"
        echo "---------"
        find "$BACKUP_DIR/$TIMESTAMP" -type f -exec ls -lh {} \; | awk '{print $5, $9}'
        echo ""
        echo "Database Size: $(du -h "$BACKUP_DIR/$TIMESTAMP/database.sql.gz" 2>/dev/null | cut -f1 || echo "N/A")"
        echo "n8n Data Size: $(du -h "$BACKUP_DIR/$TIMESTAMP/n8n-data.tar.gz" 2>/dev/null | cut -f1 || echo "N/A")"
        echo "Total Size: $(du -sh "$BACKUP_DIR/$TIMESTAMP" | cut -f1)"
        echo ""
        echo "Restore Instructions:"
        echo "1. Stop services: docker-compose down"
        echo "2. Restore database: gunzip -c database.sql.gz | docker-compose exec -T postgres psql -U n8n -d n8n"
        echo "3. Restore n8n data: docker-compose exec -T n8n tar -xzf - -C /home/node/.n8n < n8n-data.tar.gz"
        echo "4. Restore configs: Copy config files to appropriate locations"
        echo "5. Start services: docker-compose up -d"
        
    } > "$manifest_file"
    
    log_success "Backup manifest created: backup-manifest.txt"
}

cleanup_old_backups() {
    log_info "Cleaning up old backups..."
    
    # Keep only last 7 days of backups
    find "$BACKUP_DIR" -type d -name "20*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    
    log_success "Old backups cleaned up (kept last 7 days)"
}

show_backup_summary() {
    log_info "Backup completed! Summary:"
    echo ""
    echo "📁 Backup Location: $BACKUP_DIR/$TIMESTAMP"
    echo "📊 Backup Size: $(du -sh "$BACKUP_DIR/$TIMESTAMP" | cut -f1)"
    echo ""
    echo "📋 Contents:"
    ls -la "$BACKUP_DIR/$TIMESTAMP"
    echo ""
    echo "🔧 Restore Instructions:"
    echo "  1. See backup-manifest.txt for detailed restore steps"
    echo "  2. Use restore.sh script for automated restore"
    echo ""
    echo "📚 Backup Management:"
    echo "  - List backups: ls -la $BACKUP_DIR"
    echo "  - Clean old backups: $0 cleanup"
    echo "  - Restore backup: $0 restore <backup-dir>"
}

# Main execution
main() {
    case "${1:-backup}" in
        "backup")
            create_backup_directory
            backup_database
            backup_n8n_data
            backup_workflows
            backup_configurations
            backup_credentials
            backup_logs
            create_backup_manifest
            cleanup_old_backups
            show_backup_summary
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "list")
            log_info "Available backups:"
            ls -la "$BACKUP_DIR" 2>/dev/null || log_warning "No backups found"
            ;;
        "restore")
            if [ -z "$2" ]; then
                log_error "Please specify backup directory to restore"
                log_info "Usage: $0 restore <backup-dir>"
                exit 1
            fi
            
            restore_backup "$2"
            ;;
        *)
            log_error "Unknown command: $1"
            log_info "Usage: $0 [backup|cleanup|list|restore]"
            exit 1
            ;;
    esac
}

restore_backup() {
    local backup_dir="$1"
    
    if [ ! -d "$backup_dir" ]; then
        log_error "Backup directory not found: $backup_dir"
        exit 1
    fi
    
    log_info "Restoring backup from: $backup_dir"
    
    # Stop services
    log_info "Stopping services..."
    cd "$PROJECT_ROOT/packages/infra"
    docker-compose down
    
    # Restore database
    if [ -f "$backup_dir/database.sql.gz" ]; then
        log_info "Restoring database..."
        gunzip -c "$backup_dir/database.sql.gz" | docker-compose exec -T postgres psql -U n8n -d n8n
        log_success "Database restored"
    fi
    
    # Restore n8n data
    if [ -f "$backup_dir/n8n-data.tar.gz" ]; then
        log_info "Restoring n8n data..."
        docker-compose up -d postgres
        sleep 10
        docker-compose exec -T n8n tar -xzf - -C /home/node/.n8n < "$backup_dir/n8n-data.tar.gz"
        log_success "n8n data restored"
    fi
    
    # Restore configurations
    if [ -d "$backup_dir/config" ]; then
        log_info "Restoring configurations..."
        cp "$backup_dir/config/.env" "$PROJECT_ROOT/" 2>/dev/null || log_warning "Could not restore .env"
        cp "$backup_dir/config/infra.env" "$PROJECT_ROOT/packages/infra/.env" 2>/dev/null || log_warning "Could not restore infra/.env"
        log_success "Configurations restored"
    fi
    
    # Start services
    log_info "Starting services..."
    docker-compose up -d
    
    log_success "Backup restored successfully!"
}

# Show usage if help requested
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  backup              - Create full backup (default)"
    echo "  cleanup             - Remove old backups (older than 7 days)"
    echo "  list                - List available backups"
    echo "  restore <backup-dir> - Restore from backup directory"
    echo ""
    echo "Examples:"
    echo "  $0                           # Create backup"
    echo "  $0 cleanup                   # Clean old backups"
    echo "  $0 list                      # List backups"
    echo "  $0 restore backups/20240101-120000  # Restore specific backup"
    exit 0
fi

# Run main function
main "$@"
