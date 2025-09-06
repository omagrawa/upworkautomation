# Apify Scraper Package

This package contains an Apify actor that scrapes Upwork job listings using Playwright for browser automation and Cheerio for HTML parsing.

## Purpose

- Scrapes Upwork job listings based on search criteria
- Extracts comprehensive job data including title, description, budget, skills, client info
- Sends scraped data to webhook for further processing
- Filters jobs based on budget, experience level, and job type

## Features

- **Playwright Integration**: Handles dynamic content loading and JavaScript rendering
- **Cheerio Parsing**: Fast HTML parsing for data extraction
- **Smart Filtering**: Filters jobs based on budget range, experience level, and job type
- **Webhook Integration**: Sends data to n8n webhook for pipeline processing
- **Error Handling**: Robust error handling and logging
- **Configurable**: Customizable search queries and filters

## Commands

```bash
# Start the scraper
pnpm start

# Run in development mode with file watching
pnpm dev

# Build (no build step required for this package)
pnpm build

# Clean build artifacts
pnpm clean
```

## Configuration

The scraper accepts the following input parameters:

- `searchQuery` (required): Job search query (e.g., "React developer")
- `maxResults`: Maximum number of jobs to scrape (default: 50)
- `webhookUrl` (required): URL to send scraped data via webhook
- `filters`: Additional filters for job search
  - `jobType`: "all", "hourly", or "fixed"
  - `experienceLevel`: "all", "entry", "intermediate", or "expert"
  - `budgetMin`: Minimum budget for jobs
  - `budgetMax`: Maximum budget for jobs

## Data Structure

Each scraped job includes:

```json
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
```

## Deployment

1. **Apify Platform**: Deploy to Apify platform using the Dockerfile
2. **Local Testing**: Run locally with `pnpm dev`
3. **Webhook Setup**: Configure webhook URL in n8n workflow

## [MANUAL] Setup Steps

1. Create an Apify account and get your API token
2. Deploy this actor to Apify platform
3. Configure the actor with your webhook URL
4. Set up scheduled runs or trigger manually
5. Monitor logs for successful scraping and webhook delivery

## Dependencies

- `apify`: Apify SDK for actor management
- `playwright`: Browser automation
- `cheerio`: HTML parsing
- `axios`: HTTP requests for webhook delivery
