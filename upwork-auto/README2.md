# 🚀 Upwork Automation Project - Complete Setup Guide

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Environment Configuration](#environment-configuration)
5. [Infrastructure Setup](#infrastructure-setup)
6. [n8n Workflow Setup](#n8n-workflow-setup)
7. [Apify Actors Deployment](#apify-actors-deployment)
8. [Running the Pipeline](#running-the-pipeline)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)
11. [Production Deployment](#production-deployment)

## 🔧 Prerequisites

### Required Software
- **Node.js** (v18 or higher)
- **pnpm** package manager
- **Docker** and **Docker Compose**
- **Git** (for version control)

### Required Accounts
- **Upwork account** with active session
- **OpenAI API key** (for AI scoring/proposals)
- **Apify account** (for running scrapers)
- **Google Cloud account** (for Google Sheets API, optional)

## 📁 Project Structure

```
upwork-auto/
├── packages/
│   ├── apify-scraper/          # Scrapes Upwork job listings
│   ├── apify-submit/           # Submits proposals to jobs
│   ├── n8n/                    # Workflow automation (AI scoring + proposal generation)
│   ├── infra/                  # Docker setup for n8n, PostgreSQL, and Adminer
│   ├── scripts/                # Helper shell scripts
│   └── docs/                   # Documentation
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── package.json                # Root package configuration
├── pnpm-workspace.yaml         # pnpm workspace configuration
└── README.md                   # Project overview
```

## 🚀 Step-by-Step Setup

### Step 1: Install Prerequisites

#### Install Node.js
```bash
# Update package list
sudo apt update

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Install pnpm
```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

#### Install Docker
```bash
# Install Docker
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group (optional, for running without sudo)
sudo usermod -aG docker $USER

# Verify installation
docker --version
docker-compose --version
```

#### Install Git (if not already installed)
```bash
sudo apt-get install git
```

### Step 2: Clone and Setup Project

#### Navigate to Project Directory
```bash
cd /home/om/Desktop/upworkautomation/upwork-auto
```

#### Install All Dependencies
```bash
# Install dependencies for all packages in the monorepo
pnpm install

# This will install dependencies for:
# - apify-scraper
# - apify-submit
# - n8n
# - infra
# - scripts
# - docs
```

#### Verify Installation
```bash
# Check if all packages are installed
pnpm list

# Run a test command
pnpm run dev
```

### Step 3: Environment Configuration

#### Create Environment Files
```bash
# Copy example environment files
cp .env.example .env
cp packages/infra/.env.example packages/infra/.env
```

#### Edit Root Environment File (.env)
```bash
# Open the root .env file
nano .env

# Add your actual values:
APIFY_TOKEN=your_apify_token_here
OPENAI_API_KEY=your_openai_api_key_here
UPWORK_SESSION_COOKIE=your_upwork_session_cookie_here
```

#### Edit Infrastructure Environment File (packages/infra/.env)
```bash
# Open the infra .env file
nano packages/infra/.env

# Add your actual values:
# PostgreSQL Database Configuration
POSTGRES_USER=n8n
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=n8n

# n8n Configuration
N8N_PORT=5678
N8N_WEBHOOK_URL=http://localhost:5678

# Apify Integration
APIFY_TOKEN=your_apify_token_here
APIFY_USERNAME=your_upwork_username
APIFY_SUBMIT_ACTOR_ID=your_submit_actor_id

# OpenAI Integration
OPENAI_API_KEY=your_openai_api_key_here

# Storage Configuration
STORAGE_TARGET=postgres
SHEETS_ID=your_google_sheets_id_here

# PostgreSQL Connection
PGHOST=postgres
PGUSER=n8n
PGPASSWORD=your_secure_password_here
PGDATABASE=n8n
PGPORT=5432

# Auto-submission Configuration
AUTO_SUBMIT=false
```

### Step 4: Infrastructure Setup

#### Navigate to Infrastructure Package
```bash
cd packages/infra
```

#### Start All Services
```bash
# Start PostgreSQL, n8n, and Adminer
docker compose up -d

# Check if services are running
docker compose ps
```

#### Verify Services
```bash
# Check PostgreSQL
docker exec -it upwork-auto-postgres psql -U n8n -d n8n -c "SELECT version();"

# Check n8n
curl http://localhost:5678

# Check Adminer
curl http://localhost:8080
```

#### Expected Output
You should see:
- **PostgreSQL** running on port 5432
- **n8n** running on port 5678
- **Adminer** running on port 8080

### Step 5: n8n Workflow Setup

#### Access n8n Interface
1. Open browser: `http://localhost:5678`
2. Create your n8n account (first time setup)
3. Complete the initial setup wizard

#### Import Workflow
1. Go to **Workflows** → **Import from File**
2. Select: `packages/n8n/upwork_automation_workflow.json`
3. Click **Import**

#### Configure Credentials
1. **OpenAI Credential**:
   - Go to **Credentials** → **Add Credential**
   - Select **OpenAI**
   - Add your OpenAI API key
   - Save as "OpenAI API"

2. **Google Sheets Credential** (if using):
   - Go to **Credentials** → **Add Credential**
   - Select **Google Sheets**
   - Add service account credentials
   - Save as "Google Sheets API"

3. **PostgreSQL Credential**:
   - Should auto-configure from environment variables
   - Verify connection in workflow

#### Test Workflow
1. Open the imported workflow
2. Click **Test** on individual nodes
3. Check logs for any errors
4. Fix any credential issues

### Step 6: Apify Actors Deployment

#### Install Apify CLI
```bash
# Install Apify CLI globally
npm install -g apify-cli

# Verify installation
apify --version
```

#### Login to Apify
```bash
# Login to your Apify account
apify login

# Enter your Apify credentials when prompted
```

#### Deploy the Scraper Actor
```bash
# Navigate to scraper package
cd packages/apify-scraper

# Deploy the scraper actor
apify push

# Note the actor ID for later use
```

#### Deploy the Submitter Actor
```bash
# Navigate to submitter package
cd packages/apify-submit

# Deploy the submitter actor
apify push

# Note the actor ID for later use
```

#### Update Environment with Actor IDs
```bash
# Go back to infra directory
cd ../infra

# Edit .env file to add actor IDs
nano .env

# Add these lines:
APIFY_SCRAPER_ACTOR_ID=your_scraper_actor_id_here
APIFY_SUBMIT_ACTOR_ID=your_submitter_actor_id_here
```

### Step 7: Running the Pipeline

#### Method 1: Manual Trigger (Recommended for Testing)

##### Run the Scraper
1. Go to your Apify console: `https://console.apify.com/`
2. Find your deployed scraper actor
3. Click **Start**
4. Set input parameters:
```json
{
  "searches": [
    "https://www.upwork.com/nx/search/jobs/?q=devops&sort=recency",
    "https://www.upwork.com/nx/search/jobs/?q=n8n&sort=recency"
  ],
  "sessionCookie": "your_upwork_session_cookie_here",
  "maxPagesPerSearch": 3,
  "fetchDetails": true
}
```
5. Click **Start**

##### Trigger n8n Workflow
1. Go to n8n: `http://localhost:5678`
2. Open your imported workflow
3. Click **Execute Workflow**
4. The workflow will:
   - Fetch data from Apify dataset
   - Score jobs with AI
   - Generate proposals for high-scoring jobs
   - Log results to PostgreSQL/Google Sheets

#### Method 2: Automated Pipeline

##### Setup Webhook Integration
1. In your Apify scraper, set webhook URL: `http://localhost:5678/webhook/upwork_ingest`
2. Enable webhook in scraper settings
3. Now when scraper finishes, it automatically triggers n8n workflow

##### Test Automated Pipeline
1. Run the scraper with webhook enabled
2. Monitor n8n workflow execution
3. Check logs for any errors

### Step 8: Testing

#### Test 1: Infrastructure
```bash
# Check if all services are running
docker compose ps

# Test n8n access
curl http://localhost:5678

# Test PostgreSQL connection
docker exec -it upwork-auto-postgres psql -U n8n -d n8n -c "SELECT version();"

# Test Adminer access
curl http://localhost:8080
```

#### Test 2: Apify Actors
```bash
# Test scraper locally
cd packages/apify-scraper
node main.js

# Test submitter locally
cd packages/apify-submit
node submit.js
```

#### Test 3: n8n Workflow
1. Go to n8n: `http://localhost:5678`
2. Open your workflow
3. Click **Test** on individual nodes
4. Check logs for any errors

#### Test 4: Complete Pipeline
1. Run scraper with test data
2. Verify n8n workflow execution
3. Check database for logged results
4. Verify proposal generation

### Step 9: Troubleshooting

#### Common Issues and Solutions

##### Issue 1: "Services not starting"
```bash
# Check Docker status
sudo systemctl status docker

# Restart services
cd packages/infra
docker compose down
docker compose up -d

# Check logs
docker compose logs
```

##### Issue 2: "n8n not accessible"
```bash
# Check if port is in use
sudo netstat -tlnp | grep 5678

# Change port in .env if needed
nano packages/infra/.env
# Change: N8N_PORT=5679

# Restart services
docker compose down
docker compose up -d
```

##### Issue 3: "Apify deployment failed"
```bash
# Check Apify CLI login
apify whoami

# Re-login if needed
apify login

# Check actor status
apify list
```

##### Issue 4: "OpenAI API errors"
- Verify your OpenAI API key is correct
- Check if you have sufficient credits
- Ensure the key has access to GPT-4

##### Issue 5: "Database connection failed"
```bash
# Check PostgreSQL logs
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres

# Check database status
docker exec -it upwork-auto-postgres psql -U n8n -d n8n -c "SELECT 1;"
```

#### View Logs
```bash
# n8n logs
docker compose logs n8n

# PostgreSQL logs
docker compose logs postgres

# All services logs
docker compose logs

# Follow logs in real-time
docker compose logs -f
```

#### Monitor Progress
1. **n8n**: Check workflow execution history
2. **Apify**: Monitor actor runs in console
3. **Database**: Use Adminer at `http://localhost:8080`

### Step 10: Production Deployment

#### Environment Security
```bash
# Use environment variables for all secrets
export APIFY_TOKEN="your_token"
export OPENAI_API_KEY="your_key"
export UPWORK_SESSION_COOKIE="your_cookie"

# Don't commit .env files to version control
echo ".env" >> .gitignore
echo "packages/infra/.env" >> .gitignore
```

#### Production Configuration
```bash
# Set production environment
export NODE_ENV=production

# Use HTTPS for webhooks
export N8N_WEBHOOK_URL=https://your-domain.com

# Configure proper logging
export APIFY_LOG_LEVEL=INFO
```

#### Scaling Setup
```bash
# Multiple n8n instances
docker compose up -d --scale n8n=3

# Database clustering
# Configure PostgreSQL clustering for high availability

# Load balancing
# Set up nginx or similar for webhook load balancing
```

## 🔧 Development Commands

```bash
# Run all packages in development mode
pnpm dev

# Build all packages
pnpm build

# Format code
pnpm fmt

# Lint code
pnpm lint

# Clean build artifacts
pnpm clean

# Run specific package
pnpm --filter @upwork-auto/apify-scraper dev
pnpm --filter @upwork-auto/apify-submit dev
```

## 📊 Monitoring and Maintenance

### Daily Operations
```bash
# Check service status
docker compose ps

# View recent logs
docker compose logs --tail=100

# Check disk usage
docker system df

# Clean up unused containers
docker system prune
```

### Weekly Maintenance
```bash
# Update dependencies
pnpm update

# Backup database
docker exec upwork-auto-postgres pg_dump -U n8n n8n > backup.sql

# Check for security updates
docker compose pull
docker compose up -d
```

### Monthly Maintenance
```bash
# Review logs for errors
docker compose logs | grep ERROR

# Check resource usage
docker stats

# Update Apify actors
cd packages/apify-scraper && apify push
cd packages/apify-submit && apify push
```

## 🆘 Getting Help

### If You Encounter Issues:
1. **Check logs first**: `docker compose logs`
2. **Verify environment variables** are set correctly
3. **Test individual components** before running the full pipeline
4. **Check the README files** in each package for specific instructions
5. **Review the troubleshooting section** above

### Useful Commands for Debugging:
```bash
# Check all running containers
docker ps

# Check container logs
docker logs <container_name>

# Execute commands in container
docker exec -it <container_name> /bin/bash

# Check network connectivity
docker network ls
docker network inspect upwork-auto-network
```

## 📝 Notes

- **Session cookies expire** - refresh them periodically
- **Monitor API usage** - OpenAI and Apify have rate limits
- **Keep backups** - database and configuration files
- **Test regularly** - ensure all components work together
- **Update dependencies** - keep packages up to date

## 🎯 Success Criteria

Your setup is successful when:
- ✅ All Docker services are running
- ✅ n8n is accessible and workflow imported
- ✅ Apify actors are deployed and functional
- ✅ Database connection is working
- ✅ OpenAI integration is configured
- ✅ Complete pipeline runs without errors
- ✅ Jobs are scraped, scored, and proposals generated
- ✅ Results are logged to database/sheets

---

**🎉 Congratulations! You now have a fully functional Upwork automation pipeline!**
