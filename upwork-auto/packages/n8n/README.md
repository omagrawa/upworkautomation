# n8n Upwork Automation Workflow

This package contains a comprehensive n8n workflow for processing Upwork job data from Apify scrapers, scoring jobs with AI, generating proposals, and optionally auto-submitting them.

## Purpose

- Processes job data from Apify scrapers via webhook
- Merges list and detail job data intelligently
- Scores jobs using OpenAI for DevOps/AI/n8n expertise
- Generates personalized proposals for high-scoring jobs
- Logs all processed jobs to Google Sheets
- Optionally triggers auto-submission via Apify actors

## Workflow Overview

```
Webhook → Fetch Apify Data → Merge Jobs → Store → AI Score → Generate Proposal → Log → Auto Submit
```

### Node Flow
1. **Webhook Trigger** - Receives datasetId from Apify scraper
2. **Fetch Apify Dataset** - Retrieves job data from Apify API
3. **Merge Job Data** - Combines list and detail data by jobUrl
4. **Storage Target Check** - Routes to PostgreSQL or Google Sheets
5. **OpenAI Lead Score** - Scores jobs 0-100 for DevOps/AI expertise
6. **Score Threshold Check** - Continues only if score >= 70
7. **OpenAI Proposal Draft** - Generates 120-180 word proposals
8. **Log to Google Sheets** - Records all processed jobs
9. **Auto Submit Check** - Optionally triggers Apify submitter
10. **Webhook Response** - Returns processing results

## [MANUAL] Import and Setup Instructions

### 1. Import Workflow into n8n

#### Method 1: Direct Import
1. **Open n8n interface** (usually http://localhost:5678)
2. **Click "Import from File"** or use Ctrl+O
3. **Select** `upwork_automation_workflow.json`
4. **Click "Import"** to add the workflow

#### Method 2: Copy/Paste
1. **Open n8n interface**
2. **Click "New Workflow"**
3. **Click the three dots menu** → "Import from Clipboard"
4. **Copy the contents** of `upwork_automation_workflow.json`
5. **Paste and click "Import"**

### 2. Set Up Environment Variables

Configure the following environment variables in n8n:

#### Required Variables
```bash
# Apify Configuration
APIFY_TOKEN=your_apify_api_token
APIFY_SUBMIT_ACTOR_ID=your_submit_actor_id
APIFY_USERNAME=your_upwork_username
APIFY_PASSWORD=your_upwork_password

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Storage Configuration
STORAGE_TARGET=postgres  # or "sheets"
SHEETS_ID=your_google_sheets_id

# PostgreSQL Configuration (if using postgres)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=n8n
PG_USER=n8n
PG_PASSWORD=your_postgres_password

# Optional Configuration
AUTO_SUBMIT=false  # Set to "true" to enable auto-submission
```

### 3. Configure Credentials

#### OpenAI Credentials
1. **Go to Settings** → **Credentials**
2. **Click "Add Credential"**
3. **Select "OpenAI"**
4. **Enter your OpenAI API key**
5. **Test the connection**
6. **Save the credential**

#### Google Sheets Credentials
1. **Go to Settings** → **Credentials**
2. **Click "Add Credential"**
3. **Select "Google Sheets OAuth2 API"**
4. **Follow the OAuth flow** or upload service account JSON
5. **Test the connection**
6. **Save the credential**

#### PostgreSQL Credentials (if using postgres)
1. **Go to Settings** → **Credentials**
2. **Click "Add Credential"**
3. **Select "Postgres"**
4. **Enter database connection details**
5. **Test the connection**
6. **Save the credential**

### 4. Set Up Google Sheets

#### Create Spreadsheet
1. **Create a new Google Sheets spreadsheet**
2. **Name it** "Upwork Automation Log"
3. **Create the following sheets**:
   - `upwork_jobs` (for job data storage)
   - `upwork_automation_log` (for processing logs)

#### Set Up Headers
**upwork_jobs sheet:**
```
jobUrl | title | description | budget | hourly | posted | country | paymentVerified | proposals | skills | clientSpending | clientJobs | location | scrapedAt | mergedAt
```

**upwork_automation_log sheet:**
```
timestamp | jobUrl | title | aiScore | aiReasons | proposal | budget | hourly | proposals | paymentVerified | country | clientSpending | skills | scrapedAt | scoredAt | proposalGeneratedAt
```

#### Share with Service Account
1. **Get your service account email** from the credentials
2. **Share the spreadsheet** with the service account email
3. **Give "Editor" permissions**

### 5. Test the Workflow

#### Test Webhook Endpoint
```bash
curl -X POST http://localhost:5678/webhook/upwork_ingest \
  -H "Content-Type: application/json" \
  -d '{"datasetId": "your_test_dataset_id"}'
```

#### Monitor Execution
1. **Go to Executions tab** in n8n
2. **Check for successful runs**
3. **Review any error messages**
4. **Verify data in Google Sheets**

## Workflow Configuration

### AI Scoring System

The workflow uses two AI prompts for job processing:

#### Lead Scoring Prompt
```
You score Upwork jobs 0–100 for a DevOps + AI/n8n expert. 
Penalize low budget (<$500 fixed or <$30/hr), >15 proposals. 
Boost payment verified, Jenkins/Maximo/n8n/LLMs/Docker/Cloudflare Workers/Supabase, US/UK/EU clients, client spend >$10k. 
Return JSON: {"score": int, "reasons": "..."} only.
```

#### Proposal Generation Prompt
```
Write a concise Upwork proposal (120–180 words). 
Sections: (1) one-line value proposition tailored to the job, 
(2) three bullet wins aligned to requirements, 
(3) a 3-step mini-plan, 
(4) one relevant case link placeholder: {{CASE_LINK}}. 
No fluff. Mirror client keywords. Output plain text.
```

### Scoring Criteria

**Positive Factors (+points):**
- Payment verified clients
- DevOps/AI skills (Jenkins, Docker, n8n, LLMs, etc.)
- US/UK/EU clients
- Client spending >$10k
- Budget >$500 fixed or >$30/hr

**Negative Factors (-points):**
- Low budget (<$500 fixed or <$30/hr)
- High competition (>15 proposals)
- Unverified clients
- Non-US/UK/EU clients

### Thresholds
- **Score >= 70**: Generate proposal and optionally auto-submit
- **Score < 70**: Log job but skip proposal generation

## Data Flow

### Input Data
```json
{
  "datasetId": "apify_dataset_id_here"
}
```

### Processed Job Data
```json
{
  "jobUrl": "https://www.upwork.com/jobs/~abc123",
  "title": "React Developer Needed",
  "description": "Full job description...",
  "budget": 2500,
  "hourly": null,
  "posted": "2 hours ago",
  "country": "United States",
  "paymentVerified": true,
  "proposals": 8,
  "skills": ["React", "JavaScript", "Node.js"],
  "clientSpending": "$10k+ spent",
  "clientJobs": "15 jobs posted",
  "location": "New York, NY",
  "aiScore": 85,
  "aiReasons": "High budget, payment verified, US client, relevant skills",
  "proposal": "Generated proposal text...",
  "scrapedAt": "2024-01-01T12:00:00Z",
  "scoredAt": "2024-01-01T12:05:00Z",
  "proposalGeneratedAt": "2024-01-01T12:06:00Z"
}
```

## Error Handling

### OpenAI Failures
- If OpenAI API fails, score is set to 0
- Job is still logged with error message
- Workflow continues processing other jobs

### Storage Failures
- PostgreSQL and Google Sheets have separate error handling
- Failed storage operations are logged
- Workflow continues with other jobs

### Webhook Failures
- Invalid input returns error response
- Missing datasetId triggers error response
- All errors are logged for debugging

## Monitoring and Maintenance

### Regular Checks
1. **Monitor execution logs** for errors
2. **Check Google Sheets** for data quality
3. **Review AI scoring** accuracy
4. **Update scoring criteria** as needed

### Performance Optimization
- **Adjust OpenAI model** (gpt-4 vs gpt-3.5-turbo)
- **Modify scoring thresholds** based on results
- **Optimize proposal templates** for better conversion
- **Fine-tune AI prompts** for better accuracy

### Troubleshooting

#### Common Issues
1. **OpenAI API errors**
   - Check API key validity
   - Verify rate limits
   - Check model availability

2. **Google Sheets errors**
   - Verify credentials
   - Check sheet permissions
   - Ensure headers match

3. **Apify integration errors**
   - Verify API token
   - Check actor IDs
   - Confirm dataset exists

#### Debug Mode
Enable debug logging in n8n:
1. **Go to Settings** → **Log Level**
2. **Set to "Debug"**
3. **Restart n8n**
4. **Check detailed logs**

## Security Considerations

### API Keys
- **Store securely** in n8n credentials
- **Rotate regularly** for security
- **Use environment variables** in production

### Data Privacy
- **Job data** may contain sensitive information
- **Proposals** should be reviewed before submission
- **Logs** should be secured and monitored

### Rate Limiting
- **OpenAI API** has rate limits
- **Apify API** has usage limits
- **Monitor usage** and adjust accordingly

## Integration with Apify Scraper

### Webhook Configuration
The workflow expects webhook calls with:
```json
{
  "datasetId": "apify_dataset_id"
}
```

### Apify Scraper Setup
Configure your Apify scraper to call the webhook:
```javascript
// In your Apify scraper
await Actor.pushData({
  // ... job data
});

// Call webhook after scraping
await axios.post('http://your-n8n-instance/webhook/upwork_ingest', {
  datasetId: Actor.getDatasetId()
});
```

## Customization

### Modify Scoring Criteria
Edit the OpenAI system prompt in the "OpenAI Lead Score" node to adjust scoring criteria.

### Change Proposal Template
Modify the "OpenAI Proposal Draft" node system prompt to change proposal format.

### Add New Storage Options
Add new nodes after "Storage Target Check" for additional storage options (e.g., Airtable, Notion).

### Custom Notifications
Add Slack/Telegram nodes after "Log to Google Sheets" for custom notifications.

## Dependencies

- **n8n**: Workflow automation platform
- **OpenAI API**: AI scoring and proposal generation
- **Google Sheets API**: Data logging and storage
- **PostgreSQL**: Optional database storage
- **Apify API**: Job data retrieval and submission

## License

MIT License - see LICENSE file for details.