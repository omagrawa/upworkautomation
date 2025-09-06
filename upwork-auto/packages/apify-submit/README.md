# Upwork Job Submitter - Apify Actor

A production-ready Apify actor that automatically submits proposals to Upwork jobs using session authentication and Playwright browser automation.

## Purpose

- Automatically submits proposals to Upwork job postings
- Handles authentication via session cookies
- Fills cover letters and sets hourly rates
- Manages connects confirmation
- Provides detailed submission results and screenshots

## Features

- **Session Authentication**: Uses Upwork session cookies for authenticated access
- **Smart Form Filling**: Automatically fills cover letter and hourly rate fields
- **Connects Management**: Handles connects confirmation prompts
- **Error Handling**: Comprehensive error handling with retry logic
- **Screenshot Capture**: Optional screenshot capture for debugging
- **Flexible Configuration**: Configurable delays, retries, and behavior

## Input Schema

```json
{
  "sessionCookie": "odesk=...; session=...; other_cookies=...",
  "jobUrl": "https://www.upwork.com/jobs/~XXXX/",
  "proposalText": "Your proposal text here...",
  "hourlyRate": 40,
  "connectsConfirm": true,
  "maxRetries": 3,
  "delayBetweenActions": 2000,
  "headless": true,
  "takeScreenshot": true
}
```

### Input Parameters

- **`sessionCookie`** (required): Raw cookie string from Upwork session
- **`jobUrl`** (required): Full URL to the Upwork job posting
- **`proposalText`** (required): Cover letter/proposal text to submit
- **`hourlyRate`**: Hourly rate to bid (default: 40)
- **`connectsConfirm`**: Whether to confirm connects usage (default: true)
- **`maxRetries`**: Maximum retry attempts (default: 3)
- **`delayBetweenActions`**: Delay between actions in ms (default: 2000)
- **`headless`**: Run browser in headless mode (default: true)
- **`takeScreenshot`**: Take screenshot of result (default: true)

## [MANUAL] How to Obtain Upwork Session Cookie

### Method 1: Browser Developer Tools
1. **Login to Upwork** in your browser
2. **Open Developer Tools** (F12 or right-click → Inspect)
3. **Go to Application/Storage tab**
4. **Find Cookies** section
5. **Select upwork.com domain**
6. **Copy all cookie values** in the format: `name1=value1; name2=value2; ...`

### Method 2: Browser Extension
1. **Install a cookie export extension** (e.g., "Cookie Editor")
2. **Login to Upwork**
3. **Use the extension** to export cookies for upwork.com
4. **Copy the cookie string**

### Method 3: Network Tab
1. **Login to Upwork**
2. **Open Developer Tools → Network tab**
3. **Make any request** to Upwork
4. **Find the request** and look at Request Headers
5. **Copy the Cookie header value**

### Important Notes
- **Session cookies expire** - you'll need to refresh them periodically
- **Don't share cookies** - they contain authentication tokens
- **Use fresh cookies** for each run to avoid rate limiting

## Behavior Flow

### 1. Authentication Setup
- Parses session cookie string
- Sets cookies in browser context
- Validates authentication

### 2. Job Page Navigation
- Navigates to the specified job URL
- Waits for page to load completely
- Checks if job is still available
- Verifies user hasn't already applied

### 3. Apply Button Click
- Locates and clicks the "Apply" or "Submit a Proposal" button
- Uses multiple fallback selectors for reliability
- Waits for application form to load

### 4. Form Filling
- **Cover Letter**: Fills the cover letter textarea with proposal text
- **Hourly Rate**: Sets hourly rate if the field exists (for hourly jobs)
- Uses smart selectors to find form fields

### 5. Submission Process
- Clicks submit/continue button
- Handles connects confirmation if prompted
- Waits for submission to complete

### 6. Result Capture
- Takes screenshot of final result (optional)
- Captures final URL
- Records submission status

## Output Data

The actor pushes the following data to the Apify dataset:

```json
{
  "status": "success",
  "finalUrl": "https://www.upwork.com/jobs/~XXXX/",
  "screenshotPath": "screenshot-1234567890.png",
  "error": "",
  "submittedAt": "2024-01-01T12:00:00Z"
}
```

### Output Fields
- **`status`**: "success" or "failed"
- **`finalUrl`**: Final URL after submission
- **`screenshotPath`**: Path to screenshot file (if taken)
- **`error`**: Error message (if failed)
- **`submittedAt`**: Timestamp of submission attempt

## Running Locally

### Prerequisites
```bash
# Install dependencies
npm install

# Or with pnpm
pnpm install
```

### Local Development
```bash
# Run with file watching
pnpm dev

# Run once
pnpm start
```

### Local Testing with Input
```bash
# Create input.json file
echo '{
  "sessionCookie": "your_cookie_string_here",
  "jobUrl": "https://www.upwork.com/jobs/~test123/",
  "proposalText": "I am interested in this project...",
  "hourlyRate": 50,
  "connectsConfirm": true
}' > input.json

# Run with input
node submit.js
```

## Running on Apify Platform

### Deploy to Apify
```bash
# Install Apify CLI
npm install -g apify-cli

# Login to Apify
apify login

# Deploy the actor
apify push
```

### Run on Apify Platform
1. **Go to your actor** in Apify console
2. **Set input parameters**:
   ```json
   {
     "sessionCookie": "your_cookie_string",
     "jobUrl": "https://www.upwork.com/jobs/~XXXX/",
     "proposalText": "Your proposal text...",
     "hourlyRate": 40,
     "connectsConfirm": true
   }
   ```
3. **Click "Start"** to run the actor
4. **Monitor progress** in the logs
5. **Download results** from the Dataset

### Scheduled Runs
1. **Go to actor settings**
2. **Set up schedule** (e.g., every hour)
3. **Configure input** for scheduled runs
4. **Enable notifications** for run results

## Commands

```bash
# Start the submitter
pnpm start

# Run in development mode
pnpm dev

# Build (no build step required)
pnpm build

# Clean build artifacts
pnpm clean
```

## Error Handling

The actor includes comprehensive error handling:

- **Authentication Errors**: Invalid or expired cookies
- **Navigation Errors**: Job page not accessible or changed
- **Form Errors**: Missing form fields or validation failures
- **Submission Errors**: Network issues or Upwork restrictions
- **Screenshot Errors**: Failed screenshot capture (non-critical)

### Common Error Scenarios
- **"Job is no longer available"**: Job has been closed or removed
- **"Already applied"**: User has already submitted a proposal
- **"Apply button not found"**: Page structure has changed
- **"Cover letter field not found"**: Form structure has changed
- **"Submit button not found"**: Submission form not accessible

## Performance Optimization

### Recommended Settings
- **`delayBetweenActions`**: 2000ms to avoid rate limiting
- **`maxRetries`**: 3 attempts for failed operations
- **`headless`**: true for production, false for debugging
- **`takeScreenshot`**: true for debugging, false for production

### Rate Limiting
- Upwork has rate limits - use appropriate delays
- Monitor for 429 (Too Many Requests) errors
- Adjust delays if needed

## Troubleshooting

### Common Issues

1. **Authentication failures**
   - Refresh session cookie
   - Ensure cookie format is correct
   - Check if account is not restricted

2. **Form field not found**
   - Upwork may have changed page structure
   - Check selectors in the code
   - Update selectors if needed

3. **Submission failures**
   - Check if job is still available
   - Verify user hasn't already applied
   - Check for Upwork restrictions

4. **Rate limiting**
   - Increase `delayBetweenActions`
   - Reduce concurrent submissions
   - Check Upwork account status

### Debug Mode
Enable debug mode by setting:
```bash
export APIFY_LOG_LEVEL=DEBUG
```

### Screenshot Analysis
- Screenshots are saved to Apify Key-Value Store
- Download screenshots to analyze failures
- Use screenshots to debug form field issues

## Security Considerations

- **Session cookies** contain authentication tokens - keep them secure
- **Don't commit cookies** to version control
- **Rotate cookies** regularly
- **Use environment variables** for sensitive data in production

## Integration with n8n Workflow

This actor is typically triggered by the n8n workflow:

1. n8n receives high-scoring jobs
2. n8n generates proposals
3. n8n calls this actor with job data and proposal
4. Actor submits proposal to Upwork
5. Results are logged back to n8n

### n8n Integration Example
```javascript
// In n8n HTTP Request node
{
  "url": "https://api.apify.com/v2/acts/your-actor-id/runs",
  "method": "POST",
  "body": {
    "sessionCookie": "{{ $env.UPWORK_SESSION_COOKIE }}",
    "jobUrl": "{{ $json.jobUrl }}",
    "proposalText": "{{ $json.proposal }}",
    "hourlyRate": "{{ $json.hourlyRate }}",
    "connectsConfirm": true
  }
}
```

## Dependencies

- **`apify`**: Apify SDK for actor management
- **`playwright`**: Browser automation for Upwork interaction

## License

MIT License - see LICENSE file for details.