# n8n Workflow Package

This package contains the n8n workflow configuration for the Upwork automation pipeline, including job scoring, proposal generation, and integration with Google Sheets and Apify actors.

## Purpose

- Receives scraped job data from Apify scraper via webhook
- Scores jobs based on budget, skills, client quality, and competition
- Generates personalized proposals for high-scoring jobs
- Logs all processed jobs to Google Sheets
- Triggers Apify submitter for auto-submission
- Provides comprehensive workflow orchestration

## Features

- **Webhook Integration**: Receives job data from Apify scraper
- **Smart Job Scoring**: Multi-criteria scoring algorithm (0-100 points)
- **Proposal Generation**: AI-powered proposal content creation
- **Google Sheets Logging**: Comprehensive job tracking and analytics
- **Auto-Submission**: Triggers Apify actor for proposal submission
- **Error Handling**: Robust error handling and logging
- **Configurable**: Easy to modify scoring criteria and thresholds

## Commands

```bash
# Deploy workflow to n8n instance
pnpm deploy

# Export existing workflows from n8n
pnpm export

# Development (n8n runs via Docker Compose)
pnpm dev

# Build (no build step required)
pnpm build

# Clean exports
pnpm clean
```

## Workflow Structure

### 1. Webhook Trigger
- Receives POST requests from Apify scraper
- Validates incoming data structure
- Triggers workflow execution

### 2. Data Validation
- Validates webhook source is "upwork-scraper"
- Ensures required data fields are present
- Routes to error handling if invalid

### 3. Job Scoring
- Applies multi-criteria scoring algorithm
- Categorizes jobs into high/medium/low score buckets
- Provides detailed scoring reasons

### 4. High-Score Job Processing
- Filters jobs with score ≥70
- Generates personalized proposals
- Calculates optimal bid amounts
- Estimates project timelines

### 5. Google Sheets Logging
- Logs all processed jobs with scores and reasons
- Tracks submission status and results
- Provides analytics and reporting data

### 6. Auto-Submission
- Triggers Apify submitter actor
- Passes job data and proposal content
- Handles submission results

## Scoring Algorithm

The workflow uses a comprehensive scoring system:

### Budget Scoring (0-30 points)
- **$1,000-$5,000**: 30 points (optimal range)
- **$500-$1,000**: 20 points (decent budget)
- **>$5,000**: 25 points (high budget)
- **<$500**: 5 points (low budget)

### Skills Matching (0-25 points)
- **3+ preferred skills**: 25 points
- **2 preferred skills**: 15 points
- **1 preferred skill**: 10 points
- **No matches**: 0 points

### Client Quality (0-20 points)
- **Rating ≥4.5**: 15 points
- **Rating ≥4.0**: 10 points
- **Has spending history**: 5 points

### Competition Level (0-15 points)
- **≤5 proposals**: 15 points (low competition)
- **6-15 proposals**: 10 points (moderate)
- **16-30 proposals**: 5 points (high)
- **>30 proposals**: 0 points (very high)

### Job Type Preference (0-10 points)
- **Fixed price**: 10 points
- **Hourly**: 5 points

## Configuration

### Environment Variables
See `env-notes.md` for complete environment configuration.

### Key Settings
- **High Score Threshold**: 70+ points (auto-submit)
- **Medium Score Threshold**: 50-69 points (manual review)
- **Low Score Threshold**: <50 points (skip)

### Preferred Skills
The workflow looks for these skills in job descriptions:
- React, Node.js, JavaScript, TypeScript
- Python, API, Database
- (Customizable in the Code node)

## [MANUAL] Setup Steps

1. **Start n8n Infrastructure**
   ```bash
   cd ../infra
   docker-compose up -d
   ```

2. **Configure Environment Variables**
   - Copy `env.example` to `.env`
   - Fill in all required values (see `env-notes.md`)

3. **Set up Google Sheets**
   - Create spreadsheet and service account
   - Download credentials JSON
   - Share spreadsheet with service account

4. **Deploy Workflow**
   ```bash
   pnpm deploy
   ```

5. **Test Webhook**
   - Send test POST request to webhook URL
   - Verify workflow execution in n8n UI

6. **Monitor and Adjust**
   - Review job scoring results
   - Adjust scoring criteria as needed
   - Monitor submission success rates

## Workflow Files

- `workflows/upwork-automation.json`: Main workflow definition
- `scripts/deploy-workflow.js`: Deployment script
- `scripts/export-workflow.js`: Export script
- `env-notes.md`: Environment configuration guide

## Integration Points

### Input (Webhook)
- Receives job data from Apify scraper
- Validates data structure and source

### Output (Google Sheets)
- Logs all processed jobs
- Tracks scores, reasons, and status

### Output (Apify Submitter)
- Triggers proposal submission
- Passes job data and proposal content

## Dependencies

- `axios`: HTTP requests for API calls
- `dotenv`: Environment variable management
- n8n platform for workflow execution
- Google Sheets API for logging
- Apify API for actor triggering
