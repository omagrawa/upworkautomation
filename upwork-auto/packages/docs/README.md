# Documentation Package

This package contains comprehensive documentation for the Upwork automation pipeline, including operational runbooks and detailed setup instructions.

## Purpose

- Provide complete operational documentation for the automation pipeline
- Guide users through manual setup steps that cannot be automated
- Offer troubleshooting procedures and maintenance guidelines
- Document system architecture and operational procedures

## Contents

### RUNBOOK.md
Comprehensive operational runbook covering:
- System overview and architecture
- Service management procedures
- Monitoring and alerting guidelines
- Troubleshooting common issues
- Maintenance procedures
- Emergency response procedures
- Performance optimization tips

### MANUAL-STEPS.md
Detailed manual setup instructions including:
- Prerequisites and system requirements
- Account creation and credential setup
- Environment configuration
- Service deployment steps
- Testing and validation procedures
- Production configuration
- Ongoing maintenance tasks

## Quick Reference

### Essential Commands
```bash
# Start the pipeline
cd packages/infra && docker-compose up -d

# Monitor system health
./scripts/monitor.sh

# Create backup
./scripts/backup.sh

# Check service status
docker-compose ps
```

### Key URLs
- **n8n Interface**: http://localhost:5678
- **Database Admin**: http://localhost:8080
- **Webhook Endpoint**: http://localhost:5678/webhook/upwork-jobs

### Important Files
- **Environment Config**: `.env` and `packages/infra/.env`
- **Google Sheets Credentials**: `packages/infra/credentials/google-sheets.json`
- **Docker Compose**: `packages/infra/docker-compose.yml`

## Documentation Structure

### For Operators
1. **RUNBOOK.md** - Daily operations and troubleshooting
2. **Service Management** - Starting, stopping, monitoring services
3. **Emergency Procedures** - Incident response and recovery

### For Setup
1. **MANUAL-STEPS.md** - Complete setup guide
2. **Prerequisites** - System requirements and dependencies
3. **Configuration** - Environment and credential setup

### For Maintenance
1. **Backup Procedures** - Data protection and recovery
2. **Performance Monitoring** - System health and optimization
3. **Security Guidelines** - Best practices and hardening

## [MANUAL] Setup Checklist

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] pnpm package manager installed
- [ ] Docker and Docker Compose installed
- [ ] System meets minimum requirements (4GB RAM, 10GB storage)

### Accounts and Credentials
- [ ] Apify account created and API token obtained
- [ ] Google Cloud Platform account with Sheets API enabled
- [ ] Service account created and JSON credentials downloaded
- [ ] Google Sheets spreadsheet created and shared with service account
- [ ] Upwork account credentials available

### Configuration
- [ ] Environment files created and configured
- [ ] Google Sheets credentials file placed in correct location
- [ ] All API tokens and credentials updated in environment files
- [ ] Database passwords set to secure values

### Deployment
- [ ] Infrastructure services started successfully
- [ ] n8n accessible and configured
- [ ] Apify actors deployed and configured
- [ ] n8n workflows deployed
- [ ] Webhook endpoints tested and working

### Testing
- [ ] Webhook endpoint responds correctly
- [ ] Apify scraper can send data to webhook
- [ ] n8n workflow processes jobs correctly
- [ ] Google Sheets logging works
- [ ] Apify submitter can be triggered

### Production Readiness
- [ ] Security hardening completed
- [ ] SSL certificates configured (if needed)
- [ ] Monitoring and alerting set up
- [ ] Backup procedures tested
- [ ] Documentation reviewed and understood

## Troubleshooting Quick Reference

### Service Issues
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs [service-name]

# Restart services
docker-compose restart
```

### Webhook Issues
```bash
# Test webhook endpoint
curl -X POST http://localhost:5678/webhook/upwork-jobs \
  -H "Content-Type: application/json" \
  -d '{"source":"test","jobs":[]}'
```

### Database Issues
```bash
# Check database connection
docker-compose exec postgres psql -U n8n -d n8n -c "SELECT 1;"

# View database logs
docker-compose logs postgres
```

### Google Sheets Issues
- Verify service account has access to spreadsheet
- Check credentials file path and format
- Verify API quotas and limits

## Maintenance Schedule

### Daily
- [ ] Check service status
- [ ] Review error logs
- [ ] Monitor job processing

### Weekly
- [ ] Create system backup
- [ ] Review performance metrics
- [ ] Update dependencies

### Monthly
- [ ] Clean old backups
- [ ] Review scoring criteria
- [ ] Security audit

## Support Resources

### Documentation
- [n8n Documentation](https://docs.n8n.io/)
- [Apify Documentation](https://docs.apify.com/)
- [Google Sheets API](https://developers.google.com/sheets/api)

### Community
- [n8n Community Forum](https://community.n8n.io/)
- [Apify Community](https://forum.apify.com/)

### Professional Support
- n8n Cloud for managed hosting
- Apify Enterprise for advanced features
- Google Cloud Support for API issues

## Version Information

- **Documentation Version**: 1.0
- **Last Updated**: [Current Date]
- **Next Review**: [Date + 3 months]
- **Compatible With**: Pipeline version 1.0

## Contributing

To update documentation:
1. Edit the relevant Markdown files
2. Test any procedures or commands
3. Update version information
4. Submit changes for review

## License

This documentation is part of the Upwork Automation Pipeline project and follows the same license terms.
