# Infrastructure Package

This package contains Docker Compose configuration for running the Upwork automation infrastructure with n8n, PostgreSQL, and Adminer.

## Purpose

- Provides infrastructure setup for the automation pipeline
- Manages services with Docker Compose
- Includes database, workflow engine, and web interfaces
- Handles service dependencies and health checks

## Services

- **PostgreSQL**: Database for n8n workflows and data storage
- **n8n**: Workflow automation platform
- **Adminer**: Web-based database management interface

## Quick Start

1. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

2. **Start infrastructure:**
   ```bash
   docker compose up -d
   ```

3. **Access services:**
   - n8n: http://localhost:5678
   - Adminer: http://localhost:8080
   - PostgreSQL: localhost:5432

## Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# View logs
docker compose logs -f

# Restart services
docker compose restart

# Check service status
docker compose ps
```

## Service Details

### PostgreSQL (Port 5432)
- **Purpose**: Database for n8n workflows and job data
- **Database**: n8n
- **User**: n8n
- **Features**: Health checks, persistent storage

### n8n (Port 5678)
- **Purpose**: Workflow automation and orchestration
- **Access**: http://localhost:5678
- **Features**: Webhook endpoints, AI job scoring, proposal generation

### Adminer (Port 8080)
- **Purpose**: Web-based database management
- **Access**: http://localhost:8080
- **Features**: Query interface, table management, data export

## [MANUAL] Setup Steps

### 1. Environment Configuration
1. Copy `env.example` to `.env`
2. Set secure passwords for PostgreSQL
3. Configure all required environment variables:
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
   - `N8N_PORT`, `N8N_WEBHOOK_URL`
   - `APIFY_TOKEN`, `OPENAI_API_KEY`
   - `STORAGE_TARGET`, `SHEETS_ID`
   - `AUTO_SUBMIT`, `APIFY_USERNAME`, `APIFY_SUBMIT_ACTOR_ID`

### 2. Start Services
```bash
docker compose up -d
```

### 3. n8n First-Run UI Credential Setup
1. **Access n8n**: Open http://localhost:5678
2. **Complete setup wizard**:
   - Create admin account
   - Set up initial configuration
   - Choose database (PostgreSQL is already configured)
3. **Generate API key**:
   - Go to Settings → API Keys
   - Create new API key
   - Copy and save the key
4. **Configure credentials**:
   - Go to Settings → Credentials
   - Add OpenAI credentials with your API key
   - Add Google Sheets credentials (if using sheets storage)

### 4. Import Workflow JSON
1. **In n8n interface**:
   - Click "Import from File" or use Ctrl+O
   - Select `../n8n/upwork_automation_workflow.json`
   - Click "Import"
2. **Verify workflow**:
   - Check all nodes are properly connected
   - Verify environment variables are set
   - Test webhook endpoint

### 5. Configure Google Sheets or Postgres Credentials

#### For Google Sheets Storage:
1. **Create Google Sheets spreadsheet**
2. **Set up service account**:
   - Go to Google Cloud Console
   - Create service account
   - Download JSON credentials
3. **In n8n**:
   - Go to Settings → Credentials
   - Add Google Sheets credential
   - Upload service account JSON
4. **Share spreadsheet** with service account email

#### For PostgreSQL Storage:
1. **PostgreSQL is already configured** in Docker Compose
2. **Create required tables**:
   ```sql
   CREATE TABLE IF NOT EXISTS upwork_jobs (
     jobUrl VARCHAR(500) PRIMARY KEY,
     title TEXT,
     description TEXT,
     budget INTEGER,
     hourly DECIMAL,
     posted VARCHAR(100),
     country VARCHAR(100),
     paymentVerified BOOLEAN,
     proposals INTEGER,
     skills TEXT,
     clientSpending VARCHAR(100),
     clientJobs VARCHAR(100),
     location VARCHAR(200),
     scrapedAt TIMESTAMP,
     mergedAt TIMESTAMP
   );
   ```
3. **Test connection** in n8n credentials

## Environment Variables

### Required Variables
```bash
# PostgreSQL Database
POSTGRES_USER=n8n
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=n8n

# n8n Configuration
N8N_PORT=5678
N8N_WEBHOOK_URL=http://localhost:5678

# Apify Integration
APIFY_TOKEN=your_apify_token
APIFY_USERNAME=your_upwork_username
APIFY_SUBMIT_ACTOR_ID=your_submit_actor_id

# OpenAI Integration
OPENAI_API_KEY=your_openai_api_key

# Storage Configuration
STORAGE_TARGET=postgres  # or "sheets"
SHEETS_ID=your_google_sheets_id

# PostgreSQL Connection (for n8n workflow)
PGHOST=postgres
PGUSER=n8n
PGPASSWORD=your_secure_password
PGDATABASE=n8n
PGPORT=5432

# Auto-submission
AUTO_SUBMIT=false  # Set to "true" to enable
```

## Testing the Setup

### 1. Test Webhook Endpoint
```bash
curl -X POST http://localhost:5678/webhook/upwork_ingest \
  -H "Content-Type: application/json" \
  -d '{"datasetId": "test_dataset_id"}'
```

### 2. Check Service Health
```bash
# Check all services are running
docker compose ps

# Check n8n health
curl http://localhost:5678/healthz

# Check PostgreSQL connection
docker compose exec postgres pg_isready -U n8n -d n8n
```

### 3. Verify Database
1. **Access Adminer**: http://localhost:8080
2. **Login with**:
   - Server: postgres
   - Username: n8n
   - Password: your_postgres_password
   - Database: n8n
3. **Check tables** are created properly

## Troubleshooting

### Common Issues

1. **Services won't start**
   ```bash
   # Check logs
   docker compose logs
   
   # Check environment variables
   cat .env
   ```

2. **n8n can't connect to database**
   ```bash
   # Check PostgreSQL is running
   docker compose ps postgres
   
   # Check database logs
   docker compose logs postgres
   ```

3. **Webhook not accessible**
   ```bash
   # Check n8n is running
   docker compose ps n8n
   
   # Check n8n logs
   docker compose logs n8n
   ```

### Debug Commands
```bash
# View service logs
docker compose logs -f [service_name]

# Execute commands in containers
docker compose exec postgres psql -U n8n -d n8n
docker compose exec n8n sh

# Restart specific service
docker compose restart [service_name]
```

## Dependencies

- Docker and Docker Compose
- Environment configuration
- API keys and credentials
