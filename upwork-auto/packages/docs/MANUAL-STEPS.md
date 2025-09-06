# Manual Setup Steps

This document outlines all the manual steps required to set up and configure the Upwork automation pipeline. Steps marked with `[MANUAL]` require human intervention and cannot be automated.

## Prerequisites

### System Requirements
- **Operating System**: Linux, macOS, or Windows with WSL2
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 10GB free space
- **Network**: Stable internet connection

### Software Dependencies
- **Node.js**: Version 18.0.0 or higher
- **pnpm**: Version 8.0.0 or higher
- **Docker**: Version 20.10.0 or higher
- **Docker Compose**: Version 2.0.0 or higher

## [MANUAL] Step 1: Install Dependencies

### Install Node.js and pnpm
```bash
# Install Node.js (using NodeSource repository for Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm
```

### Install Docker and Docker Compose
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in to apply group changes
```

## [MANUAL] Step 2: Create Accounts and Get Credentials

### 1. Apify Account
1. Go to [apify.com](https://apify.com)
2. Create a free account
3. Navigate to Settings → Integrations → API tokens
4. Create a new API token
5. **Save the token** - you'll need it for configuration

### 2. Google Cloud Platform Account
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google Sheets API:
   - Go to APIs & Services → Library
   - Search for "Google Sheets API"
   - Click Enable
4. Create a service account:
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "Service Account"
   - Fill in the details and create
5. Generate a JSON key:
   - Click on the created service account
   - Go to Keys tab
   - Click "Add Key" → "Create new key" → JSON
   - **Download and save the JSON file**

### 3. Upwork Account
1. Go to [upwork.com](https://upwork.com)
2. Create an account or use existing
3. **Note your username and password** for automation

### 4. Create Google Sheets Spreadsheet
1. Go to [sheets.google.com](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Upwork Automation Log"
4. Create the following columns in row 1:
   - A: timestamp
   - B: jobId
   - C: jobTitle
   - D: jobUrl
   - E: score
   - F: reasons
   - G: bidAmount
   - H: timeline
   - I: priority
   - J: status
5. **Copy the spreadsheet ID** from the URL (the long string between `/d/` and `/edit`)

## [MANUAL] Step 3: Configure Environment Variables

### 1. Root Environment File
Edit `upwork-auto/.env`:
```bash
# Apify Configuration
APIFY_TOKEN=your_apify_token_here
APIFY_ACTOR_SCRAPER_ID=your_scraper_actor_id
APIFY_ACTOR_SUBMIT_ID=your_submit_actor_id

# n8n Configuration
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_WEBHOOK_URL=http://localhost:5678/webhook

# Database Configuration
POSTGRES_DB=n8n
POSTGRES_USER=n8n
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Google Sheets Configuration
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials/google-sheets.json
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id

# Upwork Configuration
UPWORK_USERNAME=your_upwork_username
UPWORK_PASSWORD=your_upwork_password

# Webhook Configuration
WEBHOOK_SECRET=your_webhook_secret_key
```

### 2. Infrastructure Environment File
Edit `upwork-auto/packages/infra/.env`:
```bash
# Database Configuration
POSTGRES_DB=n8n
POSTGRES_USER=n8n
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_NON_ROOT_USER=n8n
POSTGRES_NON_ROOT_PASSWORD=your_secure_password_here
POSTGRES_PORT=5432

# n8n Configuration
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_WEBHOOK_URL=http://localhost:5678
N8N_API_KEY=your_n8n_api_key_here

# n8n Security
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin123

# n8n Logging
N8N_LOG_LEVEL=info
N8N_METRICS=false

# Adminer Configuration
ADMINER_PORT=8080

# Redis Configuration (Optional)
REDIS_PASSWORD=redis_password_here
REDIS_PORT=6379

# Timezone
TIMEZONE=UTC

# Apify Integration
APIFY_TOKEN=your_apify_token_here
APIFY_ACTOR_SCRAPER_ID=your_scraper_actor_id
APIFY_ACTOR_SUBMIT_ID=your_submit_actor_id

# Google Sheets Integration
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials/google-sheets.json

# Upwork Credentials
UPWORK_USERNAME=your_upwork_username
UPWORK_PASSWORD=your_upwork_password
```

## [MANUAL] Step 4: Set Up Google Sheets Credentials

### 1. Place Credentials File
1. Copy your downloaded Google service account JSON file
2. Rename it to `google-sheets.json`
3. Place it in `upwork-auto/packages/infra/credentials/google-sheets.json`

### 2. Share Spreadsheet
1. Open your Google Sheets spreadsheet
2. Click "Share" button
3. Add the service account email (from the JSON file, field `client_email`)
4. Give it "Editor" permissions
5. Click "Send"

## [MANUAL] Step 5: Deploy Apify Actors

### 1. Install Apify CLI
```bash
npm install -g apify-cli
```

### 2. Login to Apify
```bash
apify login
# Enter your Apify API token when prompted
```

### 3. Deploy Scraper Actor
```bash
cd upwork-auto/packages/apify-scraper
apify push
# Note the actor ID from the output
```

### 4. Deploy Submitter Actor
```bash
cd upwork-auto/packages/apify-submit
apify push
# Note the actor ID from the output
```

### 5. Update Environment Variables
Update the actor IDs in your `.env` files:
```bash
APIFY_ACTOR_SCRAPER_ID=your_actual_scraper_actor_id
APIFY_ACTOR_SUBMIT_ID=your_actual_submitter_actor_id
```

## [MANUAL] Step 6: Configure n8n

### 1. Start Infrastructure
```bash
cd upwork-auto/packages/infra
docker-compose up -d
```

### 2. Access n8n
1. Open browser to `http://localhost:5678`
2. Complete the initial setup wizard
3. Create an admin account

### 3. Generate API Key
1. Go to Settings → API Keys
2. Create a new API key
3. **Copy the API key** and update your `.env` files

### 4. Deploy Workflow
```bash
cd upwork-auto/packages/n8n
pnpm deploy
```

### 5. Configure Google Sheets Credentials in n8n
1. In n8n UI, go to Settings → Credentials
2. Create new Google Sheets credential
3. Upload your service account JSON file
4. Test the connection

## [MANUAL] Step 7: Test the Pipeline

### 1. Test Webhook Endpoint
```bash
curl -X POST http://localhost:5678/webhook/upwork-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "source": "upwork-scraper",
    "timestamp": "2024-01-01T12:00:00Z",
    "searchQuery": "test",
    "filters": {},
    "jobs": []
  }'
```

### 2. Test Apify Scraper
1. Go to Apify console
2. Find your scraper actor
3. Run it with test parameters:
   ```json
   {
     "searchQuery": "React developer",
     "maxResults": 5,
     "webhookUrl": "http://localhost:5678/webhook/upwork-jobs"
   }
   ```

### 3. Verify Google Sheets Logging
1. Check your Google Sheets spreadsheet
2. Verify that test data appears in the log

## [MANUAL] Step 8: Production Configuration

### 1. Security Hardening
- Change all default passwords
- Use strong, unique passwords
- Enable SSL/TLS if exposing to internet
- Set up firewall rules

### 2. SSL Certificates (Optional)
If exposing to internet:
1. Obtain SSL certificates
2. Place in `packages/infra/nginx/ssl/`
3. Update nginx configuration
4. Start with production profile: `docker-compose --profile production up -d`

### 3. Monitoring Setup
1. Set up log monitoring
2. Configure alerting for service failures
3. Set up backup schedules

## [MANUAL] Step 9: Ongoing Maintenance

### 1. Regular Backups
Set up automated backups:
```bash
# Add to crontab
0 2 * * * /path/to/upwork-auto/packages/scripts/backup.sh
```

### 2. Monitoring
Set up regular monitoring:
```bash
# Add to crontab
0 */6 * * * /path/to/upwork-auto/packages/scripts/monitor.sh report
```

### 3. Updates
Regularly update:
- Docker images
- Node.js dependencies
- Apify actors
- n8n workflows

## Troubleshooting Common Issues

### 1. Services Won't Start
- Check Docker is running: `sudo systemctl status docker`
- Check port conflicts: `netstat -tulpn | grep :5678`
- Check logs: `docker-compose logs`

### 2. Webhook Not Working
- Verify n8n is accessible: `curl http://localhost:5678`
- Check firewall settings
- Verify webhook URL in Apify actors

### 3. Google Sheets Not Updating
- Verify service account has access to spreadsheet
- Check credentials file path
- Verify API quotas

### 4. Apify Actors Failing
- Check actor logs in Apify console
- Verify input parameters
- Check webhook URL configuration

## Security Considerations

### 1. Credential Management
- Never commit credentials to version control
- Use environment variables for sensitive data
- Regularly rotate API keys and passwords

### 2. Network Security
- Use HTTPS in production
- Implement proper firewall rules
- Consider VPN for remote access

### 3. Data Protection
- Regular backups of all data
- Encrypt sensitive data at rest
- Monitor access logs

## Support and Resources

### Documentation
- [n8n Documentation](https://docs.n8n.io/)
- [Apify Documentation](https://docs.apify.com/)
- [Google Sheets API Documentation](https://developers.google.com/sheets/api)

### Community Support
- [n8n Community](https://community.n8n.io/)
- [Apify Community](https://forum.apify.com/)

### Professional Support
- n8n Cloud for managed hosting
- Apify Enterprise for advanced features
- Google Cloud Support for Sheets API issues

---

**Important Notes:**
- Always test in a development environment first
- Keep backups of all configurations
- Monitor the system regularly
- Update dependencies and security patches promptly
- Review and adjust scoring criteria based on results

**Last Updated**: [Current Date]
**Version**: 1.0
