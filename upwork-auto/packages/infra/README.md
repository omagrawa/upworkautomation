# Infrastructure Package

This package contains Docker Compose configuration for running the complete Upwork automation infrastructure, including n8n, PostgreSQL, Adminer, Redis, and Nginx.

## Purpose

- Provides complete infrastructure setup for the automation pipeline
- Manages all services with Docker Compose
- Includes database, workflow engine, and web interfaces
- Supports both development and production configurations
- Handles service dependencies and health checks

## Services

### Core Services
- **n8n**: Workflow automation platform
- **PostgreSQL**: Database for n8n and custom logging
- **Adminer**: Web-based database management interface

### Optional Services
- **Redis**: Caching and queue management for n8n
- **Nginx**: Reverse proxy with SSL termination (production)

## Commands

```bash
# Start all services in development mode
pnpm dev

# Start all services in background
pnpm start

# Stop all services
pnpm stop

# Restart all services
pnpm restart

# View logs from all services
pnpm logs

# Clean up (remove volumes and containers)
pnpm clean

# Reset everything (clean + start)
pnpm reset

# Build custom images
pnpm build
```

## Quick Start

1. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

2. **Start infrastructure:**
   ```bash
   pnpm dev
   ```

3. **Access services:**
   - n8n: http://localhost:5678
   - Adminer: http://localhost:8080
   - PostgreSQL: localhost:5432

## Service Details

### n8n (Port 5678)
- **Purpose**: Workflow automation and orchestration
- **Access**: http://localhost:5678
- **Default Credentials**: admin / admin123
- **Features**: Webhook endpoints, job scoring, proposal generation

### PostgreSQL (Port 5432)
- **Purpose**: Database for n8n workflows and custom logging
- **Database**: n8n
- **User**: n8n
- **Features**: Automated backups, health checks, custom tables

### Adminer (Port 8080)
- **Purpose**: Web-based database management
- **Access**: http://localhost:8080
- **Features**: Query interface, table management, data export

### Redis (Port 6379)
- **Purpose**: Caching and queue management
- **Features**: Session storage, workflow queues, performance optimization

### Nginx (Ports 80/443)
- **Purpose**: Reverse proxy and SSL termination
- **Features**: Rate limiting, security headers, load balancing
- **Profile**: production (use `--profile production` to enable)

## Configuration

### Environment Variables
See `env.example` for complete configuration options.

### Key Settings
- **Database**: PostgreSQL with custom initialization scripts
- **Security**: Basic auth for n8n, SSL for production
- **Logging**: Configurable log levels and output
- **Performance**: Optimized for automation workloads

### Volume Mounts
- **n8n_data**: Persistent workflow and credential storage
- **postgres_data**: Database persistence
- **redis_data**: Cache persistence
- **credentials**: Google Sheets and API credentials

## [MANUAL] Setup Steps

### 1. Environment Configuration
1. Copy `env.example` to `.env`
2. Set secure passwords for all services
3. Configure n8n API key and webhook URL
4. Set up Google Sheets credentials path
5. Configure Upwork credentials

### 2. SSL Certificates (Production)
1. Generate SSL certificates for HTTPS
2. Place certificates in `nginx/ssl/` directory
3. Update nginx configuration if needed
4. Enable production profile: `--profile production`

### 3. Google Sheets Credentials
1. Create Google Cloud service account
2. Download JSON credentials file
3. Place in `credentials/google-sheets.json`
4. Share spreadsheet with service account

### 4. Database Initialization
1. Start services: `pnpm start`
2. Wait for PostgreSQL to initialize
3. Verify custom tables are created
4. Check n8n can connect to database

### 5. n8n Configuration
1. Access n8n at http://localhost:5678
2. Complete initial setup wizard
3. Generate API key in Settings
4. Update environment variables
5. Deploy workflows from n8n package

## Production Deployment

### Using Nginx Profile
```bash
# Start with production profile
docker-compose --profile production up -d
```

### SSL Configuration
1. Obtain SSL certificates
2. Place in `nginx/ssl/` directory:
   - `cert.pem`: Certificate file
   - `key.pem`: Private key file
3. Update nginx configuration as needed

### Security Considerations
- Change default passwords
- Use strong database passwords
- Enable SSL in production
- Configure firewall rules
- Regular security updates

## Monitoring and Maintenance

### Health Checks
All services include health checks:
- PostgreSQL: Connection and query tests
- n8n: HTTP endpoint availability
- Redis: Connection and ping tests

### Logging
- Centralized logging via Docker Compose
- Configurable log levels per service
- Log rotation and retention policies

### Backups
- Database backups via PostgreSQL dumps
- n8n workflow exports
- Credential and configuration backups

## Troubleshooting

### Common Issues

1. **Services won't start**
   - Check port conflicts
   - Verify environment variables
   - Review Docker logs

2. **Database connection fails**
   - Wait for PostgreSQL initialization
   - Check credentials and permissions
   - Verify network connectivity

3. **n8n webhook not accessible**
   - Check firewall settings
   - Verify port forwarding
   - Test webhook endpoint

4. **SSL certificate errors**
   - Verify certificate files
   - Check file permissions
   - Update nginx configuration

### Debug Commands
```bash
# Check service status
docker-compose ps

# View specific service logs
docker-compose logs n8n
docker-compose logs postgres

# Execute commands in containers
docker-compose exec n8n sh
docker-compose exec postgres psql -U n8n -d n8n

# Check network connectivity
docker-compose exec n8n ping postgres
```

## Dependencies

- Docker and Docker Compose
- SSL certificates (for production)
- Google Sheets credentials
- Environment configuration
