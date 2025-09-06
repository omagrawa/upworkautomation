# Upwork Automation Pipeline Runbook

This runbook provides operational procedures for managing and maintaining the Upwork automation pipeline.

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Service Management](#service-management)
4. [Monitoring and Alerting](#monitoring-and-alerting)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Emergency Procedures](#emergency-procedures)
8. [Performance Optimization](#performance-optimization)

## System Overview

### Purpose
The Upwork automation pipeline automatically scrapes job listings, scores them based on predefined criteria, generates proposals, and submits them to Upwork.

### Components
- **Apify Scraper**: Scrapes Upwork job listings
- **n8n Workflow**: Orchestrates job scoring and proposal generation
- **Google Sheets**: Logs all processed jobs and results
- **Apify Submitter**: Automatically submits proposals
- **PostgreSQL**: Stores n8n workflow data and custom logs

### Data Flow
```
Upwork Jobs → Apify Scraper → Webhook → n8n → Google Sheets
                                    ↓
                              Apify Submitter → Upwork
```

## Architecture

### Service Dependencies
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Apify     │    │     n8n     │    │ PostgreSQL  │
│  Scraper    │───▶│  Workflow   │───▶│  Database   │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐    ┌─────────────┐
                   │   Google    │    │   Apify     │
                   │   Sheets    │    │  Submitter  │
                   └─────────────┘    └─────────────┘
```

### Network Configuration
- **n8n**: Port 5678 (HTTP)
- **PostgreSQL**: Port 5432
- **Adminer**: Port 8080
- **Redis**: Port 6379 (optional)

### Storage Volumes
- `n8n_data`: n8n workflows and credentials
- `postgres_data`: Database persistence
- `redis_data`: Cache storage

## Service Management

### Starting Services
```bash
# Start all services
cd packages/infra
docker-compose up -d

# Start specific service
docker-compose up -d n8n
```

### Stopping Services
```bash
# Stop all services
docker-compose down

# Stop specific service
docker-compose stop n8n
```

### Restarting Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart n8n
```

### Service Status
```bash
# Check service status
docker-compose ps

# Check service health
docker-compose exec n8n curl -f http://localhost:5678/healthz
```

## Monitoring and Alerting

### Health Checks

#### n8n Health Check
```bash
curl -f http://localhost:5678/healthz
```

#### PostgreSQL Health Check
```bash
docker-compose exec postgres pg_isready -U n8n
```

#### Webhook Health Check
```bash
curl -X POST http://localhost:5678/webhook/upwork-jobs \
  -H "Content-Type: application/json" \
  -d '{"source":"health-check","jobs":[]}'
```

### Monitoring Scripts
```bash
# Full system check
./scripts/monitor.sh

# Specific component checks
./scripts/monitor.sh services
./scripts/monitor.sh webhooks
./scripts/monitor.sh database
```

### Key Metrics to Monitor
- **Service Availability**: All services running and responding
- **Webhook Response Time**: < 5 seconds
- **Database Performance**: Query response time < 1 second
- **Job Processing Rate**: Jobs processed per hour
- **Success Rate**: Successful submissions vs. total attempts
- **Error Rate**: Failed operations per hour

### Alerting Thresholds
- **Service Down**: Any service not responding for > 5 minutes
- **High Error Rate**: > 10% error rate in last hour
- **Slow Response**: Webhook response time > 10 seconds
- **Database Issues**: Connection failures or slow queries

## Troubleshooting

### Common Issues

#### 1. Services Won't Start
**Symptoms**: Docker containers fail to start or exit immediately

**Diagnosis**:
```bash
# Check container logs
docker-compose logs

# Check system resources
docker stats

# Check port conflicts
netstat -tulpn | grep :5678
```

**Solutions**:
- Ensure Docker is running
- Check for port conflicts
- Verify sufficient system resources
- Check environment variables

#### 2. Webhook Not Receiving Data
**Symptoms**: Apify scraper reports webhook failures

**Diagnosis**:
```bash
# Test webhook endpoint
curl -X POST http://localhost:5678/webhook/upwork-jobs \
  -H "Content-Type: application/json" \
  -d '{"source":"test","jobs":[]}'

# Check n8n logs
docker-compose logs n8n

# Check network connectivity
docker-compose exec n8n ping apify.com
```

**Solutions**:
- Verify n8n is running and accessible
- Check firewall settings
- Verify webhook URL configuration
- Check n8n workflow is active

#### 3. Database Connection Issues
**Symptoms**: n8n cannot connect to PostgreSQL

**Diagnosis**:
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready -U n8n

# Check database logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres psql -U n8n -d n8n -c "SELECT 1;"
```

**Solutions**:
- Restart PostgreSQL service
- Check database credentials
- Verify network connectivity between containers
- Check disk space for database

#### 4. Google Sheets Integration Issues
**Symptoms**: Jobs not being logged to Google Sheets

**Diagnosis**:
```bash
# Check n8n workflow execution
# Access n8n UI and check workflow logs

# Verify credentials
ls -la packages/infra/credentials/google-sheets.json

# Test Google Sheets API
curl -H "Authorization: Bearer $GOOGLE_TOKEN" \
  "https://sheets.googleapis.com/v4/spreadsheets/$SHEET_ID"
```

**Solutions**:
- Verify Google Sheets credentials
- Check service account permissions
- Ensure spreadsheet is shared with service account
- Verify API quotas and limits

#### 5. Apify Actor Issues
**Symptoms**: Scraper or submitter actors failing

**Diagnosis**:
```bash
# Check Apify actor status
apify list

# Check actor logs
apify logs <actor-id>

# Test actor manually
apify call <actor-id> --input input.json
```

**Solutions**:
- Verify Apify API token
- Check actor input parameters
- Review actor logs for errors
- Update actor code if needed

### Debug Mode
Enable debug logging:
```bash
# Set debug environment variable
export N8N_LOG_LEVEL=debug

# Restart n8n with debug logging
docker-compose restart n8n
```

## Maintenance Procedures

### Daily Tasks
1. **Check Service Status**
   ```bash
   ./scripts/monitor.sh services
   ```

2. **Review Error Logs**
   ```bash
   docker-compose logs --since 24h | grep ERROR
   ```

3. **Check Job Processing**
   ```bash
   ./scripts/monitor.sh database
   ```

### Weekly Tasks
1. **Create Backup**
   ```bash
   ./scripts/backup.sh
   ```

2. **Review Performance Metrics**
   ```bash
   ./scripts/monitor.sh performance
   ```

3. **Update Dependencies**
   ```bash
   docker-compose pull
   docker-compose up -d
   ```

### Monthly Tasks
1. **Clean Old Backups**
   ```bash
   ./scripts/backup.sh cleanup
   ```

2. **Review and Update Scoring Criteria**
   - Access n8n workflow
   - Review job scoring results
   - Adjust scoring parameters

3. **Security Review**
   - Update passwords
   - Review access logs
   - Check for security updates

## Emergency Procedures

### Service Outage
1. **Immediate Response**
   ```bash
   # Check service status
   docker-compose ps
   
   # Restart services
   docker-compose restart
   
   # Check logs
   docker-compose logs --tail=100
   ```

2. **If Services Won't Start**
   ```bash
   # Clean restart
   docker-compose down
   docker-compose up -d
   
   # Check system resources
   df -h
   free -h
   ```

3. **Data Recovery**
   ```bash
   # Restore from latest backup
   ./scripts/backup.sh restore <latest-backup>
   ```

### Data Loss
1. **Database Recovery**
   ```bash
   # Stop services
   docker-compose down
   
   # Restore database
   gunzip -c backups/latest/database.sql.gz | \
     docker-compose exec -T postgres psql -U n8n -d n8n
   
   # Start services
   docker-compose up -d
   ```

2. **n8n Data Recovery**
   ```bash
   # Restore n8n data
   docker-compose exec -T n8n tar -xzf - -C /home/node/.n8n < \
     backups/latest/n8n-data.tar.gz
   ```

### Security Incident
1. **Immediate Actions**
   - Change all passwords
   - Revoke API keys
   - Check access logs
   - Isolate affected systems

2. **Investigation**
   - Review system logs
   - Check for unauthorized access
   - Analyze network traffic

3. **Recovery**
   - Restore from clean backup
   - Update all credentials
   - Implement additional security measures

## Performance Optimization

### Database Optimization
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### n8n Optimization
- Enable Redis for caching
- Optimize workflow execution
- Monitor memory usage
- Adjust worker concurrency

### System Optimization
```bash
# Monitor resource usage
docker stats

# Check disk usage
df -h

# Monitor network
iftop
```

### Scaling Considerations
- **Horizontal Scaling**: Multiple n8n instances with load balancer
- **Database Scaling**: Read replicas for reporting
- **Caching**: Redis for session and workflow caching
- **Monitoring**: Centralized logging and metrics

## Contact Information

### On-Call Rotation
- **Primary**: [Your Name] - [Phone] - [Email]
- **Secondary**: [Backup Name] - [Phone] - [Email]

### Escalation Procedures
1. **Level 1**: Service restart and basic troubleshooting
2. **Level 2**: Advanced troubleshooting and configuration changes
3. **Level 3**: Vendor support and emergency procedures

### External Dependencies
- **Apify Support**: support@apify.com
- **n8n Support**: support@n8n.io
- **Google Cloud Support**: [Your GCP Support Plan]

---

**Last Updated**: [Current Date]
**Version**: 1.0
**Next Review**: [Date + 3 months]
