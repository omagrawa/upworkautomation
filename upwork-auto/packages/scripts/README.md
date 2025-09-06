# Scripts Package

This package contains helper shell scripts for deploying, monitoring, and maintaining the Upwork automation pipeline.

## Purpose

- Automated setup and deployment of the complete pipeline
- Monitoring and health checking of all services
- Backup and restore functionality for data protection
- Maintenance and troubleshooting utilities

## Scripts

### Setup Script (`setup.sh`)
Complete initial setup of the automation pipeline.

**Features:**
- Dependency checking (pnpm, Docker, Docker Compose)
- Environment file creation from templates
- Credential directory setup
- Infrastructure service startup
- Workflow deployment
- Status reporting

**Usage:**
```bash
./scripts/setup.sh
```

### Deployment Script (`deploy.sh`)
Deploy the complete automation pipeline to production.

**Features:**
- Environment validation
- Infrastructure deployment
- Apify actor deployment
- n8n workflow deployment
- Deployment testing
- Status reporting

**Usage:**
```bash
./scripts/deploy.sh
```

### Monitoring Script (`monitor.sh`)
Monitor the health and performance of the automation pipeline.

**Features:**
- Service status checking
- Webhook endpoint testing
- Database health monitoring
- Log analysis
- Performance metrics
- Apify actor status
- Report generation

**Usage:**
```bash
# Run all checks
./scripts/monitor.sh

# Check specific components
./scripts/monitor.sh services
./scripts/monitor.sh webhooks
./scripts/monitor.sh database
./scripts/monitor.sh logs
./scripts/monitor.sh performance
./scripts/monitor.sh apify
./scripts/monitor.sh report
```

### Backup Script (`backup.sh`)
Create and manage backups of the automation pipeline.

**Features:**
- Database backup (PostgreSQL dumps)
- n8n data backup
- Workflow configuration backup
- Environment and credential backup
- Log backup
- Backup manifest generation
- Old backup cleanup
- Restore functionality

**Usage:**
```bash
# Create backup
./scripts/backup.sh

# List available backups
./scripts/backup.sh list

# Clean old backups
./scripts/backup.sh cleanup

# Restore from backup
./scripts/backup.sh restore backups/20240101-120000
```

## Commands

```bash
# Make all scripts executable
chmod +x scripts/*.sh

# Run setup
./scripts/setup.sh

# Deploy pipeline
./scripts/deploy.sh

# Monitor system
./scripts/monitor.sh

# Create backup
./scripts/backup.sh
```

## Script Features

### Error Handling
- Comprehensive error checking and reporting
- Graceful failure handling
- Detailed error messages with suggestions

### Logging
- Color-coded output for better readability
- Info, success, warning, and error levels
- Timestamped operations

### Validation
- Dependency checking before execution
- Environment validation
- Service health verification

### Automation
- Minimal user interaction required
- Automated retry logic where appropriate
- Progress reporting for long operations

## [MANUAL] Setup Steps

### 1. Prerequisites
1. Install required dependencies:
   - pnpm (Node.js package manager)
   - Docker and Docker Compose
   - curl (for webhook testing)

2. Ensure proper permissions:
   ```bash
   chmod +x scripts/*.sh
   ```

### 2. Initial Setup
1. Run the setup script:
   ```bash
   ./scripts/setup.sh
   ```

2. Edit environment files with your credentials:
   - `.env` (root level)
   - `packages/infra/.env`

3. Add Google Sheets credentials:
   - Place service account JSON in `packages/infra/credentials/`

### 3. Deployment
1. Deploy the complete pipeline:
   ```bash
   ./scripts/deploy.sh
   ```

2. Verify deployment:
   ```bash
   ./scripts/monitor.sh
   ```

### 4. Monitoring
1. Set up regular monitoring:
   ```bash
   # Add to crontab for regular checks
   0 */6 * * * /path/to/scripts/monitor.sh report
   ```

2. Monitor specific components as needed:
   ```bash
   ./scripts/monitor.sh services
   ./scripts/monitor.sh webhooks
   ```

### 5. Backup Strategy
1. Set up regular backups:
   ```bash
   # Add to crontab for daily backups
   0 2 * * * /path/to/scripts/backup.sh
   ```

2. Test restore process:
   ```bash
   ./scripts/backup.sh list
   ./scripts/backup.sh restore <backup-dir>
   ```

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   chmod +x scripts/*.sh
   ```

2. **Docker Not Running**
   ```bash
   sudo systemctl start docker
   ```

3. **Port Conflicts**
   - Check if ports 5678, 5432, 8080 are available
   - Modify ports in environment files if needed

4. **Service Health Issues**
   ```bash
   ./scripts/monitor.sh services
   docker-compose logs
   ```

### Debug Mode
Enable debug output by setting:
```bash
set -x  # Add to beginning of script
```

### Log Analysis
```bash
# View specific service logs
docker-compose logs n8n
docker-compose logs postgres

# Follow logs in real-time
docker-compose logs -f
```

## Integration

### CI/CD Integration
Scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Deploy Pipeline
  run: ./scripts/deploy.sh

- name: Monitor Deployment
  run: ./scripts/monitor.sh
```

### Cron Jobs
Set up automated tasks:

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/scripts/backup.sh

# Hourly monitoring
0 * * * * /path/to/scripts/monitor.sh report

# Weekly cleanup
0 3 * * 0 /path/to/scripts/backup.sh cleanup
```

## Dependencies

- **Bash**: Shell scripting environment
- **Docker**: Container runtime
- **Docker Compose**: Multi-container orchestration
- **curl**: HTTP client for testing
- **PostgreSQL client tools**: Database operations
- **gzip**: Compression for backups
- **tar**: Archive operations
