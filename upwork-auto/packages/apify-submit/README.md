# Apify Submitter Package

This package contains an Apify actor that automatically submits proposals to Upwork jobs using Playwright for browser automation.

## Purpose

- Automatically logs into Upwork using provided credentials
- Navigates to specific job postings
- Submits proposals with custom cover letters, bid amounts, and attachments
- Handles form validation and error checking
- Logs submission results for tracking

## Features

- **Automated Login**: Secure login to Upwork platform
- **Smart Navigation**: Handles job page navigation and availability checks
- **Proposal Submission**: Fills and submits proposal forms with custom data
- **Error Handling**: Comprehensive error detection and reporting
- **Retry Logic**: Configurable retry attempts for failed submissions
- **Result Tracking**: Logs all submission attempts and results

## Commands

```bash
# Start the submitter
pnpm start

# Run in development mode with file watching
pnpm dev

# Build (no build step required for this package)
pnpm build

# Clean build artifacts
pnpm clean
```

## Configuration

The submitter accepts the following input parameters:

### Required Parameters

- `upworkCredentials`: Login credentials
  - `username`: Upwork username or email
  - `password`: Upwork password
- `jobData`: Job information
  - `jobId`: Upwork job ID
  - `jobUrl`: Full URL to the job posting
  - `title`: Job title (optional, for reference)
- `proposalData`: Proposal content
  - `coverLetter`: Proposal cover letter text
  - `bidAmount`: Bid amount for the job
  - `timeline`: Estimated completion timeline (optional)
  - `attachments`: Array of file paths to attach (optional)

### Optional Settings

- `maxRetries`: Maximum retry attempts (default: 3)
- `delayBetweenActions`: Delay between browser actions in ms (default: 2000)
- `headless`: Run browser in headless mode (default: true)

## Data Structure

Submission results include:

```json
{
  "jobId": "job_id",
  "jobTitle": "Job Title",
  "jobUrl": "https://upwork.com/jobs/...",
  "submissionResult": {
    "success": true,
    "confirmationMessage": "Proposal submitted successfully",
    "submittedAt": "2024-01-01T12:00:00Z"
  },
  "submittedAt": "2024-01-01T12:00:00Z",
  "success": true
}
```

## Error Handling

The actor handles various error scenarios:

- **Login Failures**: Invalid credentials or account issues
- **Job Unavailable**: Job no longer exists or is closed
- **Already Applied**: Duplicate proposal prevention
- **Form Validation**: Missing required fields or invalid data
- **Network Issues**: Connection problems or timeouts

## Security Considerations

- Credentials are passed securely through Apify input
- Browser sessions are properly cleaned up
- No sensitive data is logged or stored
- Headless mode recommended for production

## [MANUAL] Setup Steps

1. Create an Apify account and get your API token
2. Deploy this actor to Apify platform
3. Prepare proposal templates and cover letters
4. Set up job data input (from n8n workflow or manual input)
5. Configure retry settings and delays
6. Test with a small batch of jobs first
7. Monitor submission success rates and adjust settings

## Integration with Pipeline

This actor is typically triggered by the n8n workflow after job scoring:

1. n8n receives scraped jobs from scraper
2. Jobs are scored and filtered
3. High-scoring jobs are queued for submission
4. This actor is called with job data and proposal content
5. Results are logged back to Google Sheets

## Dependencies

- `apify`: Apify SDK for actor management
- `playwright`: Browser automation for Upwork interaction
- `axios`: HTTP requests (if needed for additional API calls)
