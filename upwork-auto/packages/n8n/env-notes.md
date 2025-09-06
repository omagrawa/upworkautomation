# n8n Environment Configuration Notes

This document outlines the environment variables and configuration needed for the n8n workflow to function properly.

## Required Environment Variables

### n8n Configuration
```bash
# n8n API Configuration
N8N_API_KEY=your_n8n_api_key_here
N8N_WEBHOOK_URL=http://localhost:5678/webhook
N8N_HOST=localhost
N8N_PORT=5678
```

### Database Configuration
```bash
# PostgreSQL Database (for n8n)
POSTGRES_DB=n8n
POSTGRES_USER=n8n
POSTGRES_PASSWORD=your_secure_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
```

### Apify Integration
```bash
# Apify API Configuration
APIFY_TOKEN=your_apify_token_here
APIFY_ACTOR_SCRAPER_ID=your_scraper_actor_id
APIFY_ACTOR_SUBMIT_ID=your_submit_actor_id
```

### Google Sheets Integration
```bash
# Google Sheets API Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_CREDENTIALS_PATH=./credentials/google-sheets.json
```

### Upwork Credentials
```bash
# Upwork Login Credentials (for auto-submission)
UPWORK_USERNAME=your_upwork_username
UPWORK_PASSWORD=your_upwork_password
```

## [MANUAL] Setup Steps

### 1. n8n Setup
1. Start n8n using Docker Compose (see infra package)
2. Access n8n at `http://localhost:5678`
3. Complete initial setup wizard
4. Generate API key in Settings > API Keys
5. Set `N8N_API_KEY` environment variable

### 2. Google Sheets Setup
1. Create a new Google Sheets spreadsheet
2. Set up Google Cloud Project and enable Sheets API
3. Create service account credentials
4. Download JSON credentials file
5. Place credentials in `./credentials/google-sheets.json`
6. Share spreadsheet with service account email
7. Set `GOOGLE_SHEETS_SPREADSHEET_ID` environment variable

### 3. Apify Setup
1. Create Apify account and get API token
2. Deploy scraper and submitter actors
3. Get actor IDs from Apify console
4. Set `APIFY_TOKEN`, `APIFY_ACTOR_SCRAPER_ID`, and `APIFY_ACTOR_SUBMIT_ID`

### 4. Upwork Credentials
1. Use your Upwork login credentials
2. Set `UPWORK_USERNAME` and `UPWORK_PASSWORD`
3. **Note**: Consider using app-specific passwords if available

## Workflow Configuration

### Webhook Endpoint
- **URL**: `http://localhost:5678/webhook/upwork-jobs`
- **Method**: POST
- **Content-Type**: application/json

### Expected Webhook Payload
```json
{
  "source": "upwork-scraper",
  "timestamp": "2024-01-01T12:00:00Z",
  "searchQuery": "React developer",
  "filters": {
    "jobType": "all",
    "experienceLevel": "all",
    "budgetMin": 0,
    "budgetMax": 10000
  },
  "jobs": [
    {
      "id": "job_id",
      "title": "Job Title",
      "description": "Job description...",
      "budget": 5000,
      "hourlyRate": 50,
      "jobType": "fixed",
      "experienceLevel": "intermediate",
      "skills": ["React", "Node.js"],
      "clientInfo": {
        "name": "Client Name",
        "rating": "4.9",
        "totalSpent": "$10k+"
      },
      "postedTime": "2 hours ago",
      "proposals": 15,
      "url": "https://upwork.com/jobs/...",
      "scrapedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

## Job Scoring Algorithm

The workflow uses a scoring algorithm with the following criteria:

### Budget Scoring (0-30 points)
- $1,000-$5,000: 30 points
- $500-$1,000: 20 points
- >$5,000: 25 points
- <$500: 5 points

### Skills Matching (0-25 points)
- 3+ preferred skills: 25 points
- 2 preferred skills: 15 points
- 1 preferred skill: 10 points
- No matches: 0 points

### Client Quality (0-20 points)
- Rating ≥4.5: 15 points
- Rating ≥4.0: 10 points
- Has spending history: 5 points

### Competition Level (0-15 points)
- ≤5 proposals: 15 points
- 6-15 proposals: 10 points
- 16-30 proposals: 5 points
- >30 proposals: 0 points

### Job Type Preference (0-10 points)
- Fixed price: 10 points
- Hourly: 5 points

### Total Score Ranges
- **High Score (70+)**: Auto-submit proposals
- **Medium Score (50-69)**: Log for manual review
- **Low Score (<50)**: Log and skip

## Google Sheets Log Structure

The workflow logs all processed jobs to Google Sheets with the following columns:

| Column | Description |
|--------|-------------|
| timestamp | When the job was processed |
| jobId | Upwork job ID |
| jobTitle | Job title |
| jobUrl | Full URL to job posting |
| score | Calculated score (0-100) |
| reasons | Scoring reasons (semicolon-separated) |
| bidAmount | Proposed bid amount |
| timeline | Estimated completion timeline |
| priority | high/medium/low |
| status | scored/submitted/failed |

## Troubleshooting

### Common Issues

1. **Webhook not receiving data**
   - Check n8n is running and accessible
   - Verify webhook URL is correct
   - Check firewall/network settings

2. **Google Sheets authentication fails**
   - Verify credentials file path
   - Check service account has access to spreadsheet
   - Ensure Sheets API is enabled

3. **Apify actors not triggering**
   - Verify API token and actor IDs
   - Check actor status in Apify console
   - Review actor logs for errors

4. **Job scoring not working**
   - Check JavaScript code in Code nodes
   - Verify input data structure
   - Review n8n execution logs

### Debug Mode

Enable debug mode by setting:
```bash
N8N_LOG_LEVEL=debug
```

This will provide detailed logs for troubleshooting workflow issues.
