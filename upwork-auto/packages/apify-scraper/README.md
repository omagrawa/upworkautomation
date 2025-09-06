# Upwork Job Scraper - Production Apify Actor

A production-ready Apify actor that scrapes Upwork job listings using CheerioCrawler for list pages and PlaywrightCrawler for detailed job information.

## Purpose

- Scrapes Upwork job listings from multiple search URLs
- Extracts comprehensive job data from both list and detail pages
- Handles authentication via session cookies
- Merges data from list and detail pages intelligently
- Stores all data in Apify Dataset for further processing

## Features

- **Dual Crawler Architecture**: CheerioCrawler for fast list scraping, PlaywrightCrawler for detailed pages
- **Session Authentication**: Uses Upwork session cookies for authenticated access
- **Smart Data Merging**: Combines list and detail data, preferring detail fields
- **Robust Selectors**: Multiple fallback selectors for Upwork's changing DOM structure
- **Pagination Support**: Automatically follows pagination links
- **Error Handling**: Comprehensive error handling with retries
- **Configurable**: Adjustable concurrency, delays, and page limits

## Input Schema

```json
{
  "searches": [
    "https://www.upwork.com/nx/search/jobs/?q=react%20developer&sort=recency",
    "https://www.upwork.com/nx/search/jobs/?q=nodejs&budget=1000-5000"
  ],
  "sessionCookie": "odesk=...; session=...; other_cookies=...",
  "maxPagesPerSearch": 3,
  "fetchDetails": true,
  "maxConcurrency": 5,
  "requestDelay": 2000
}
```

### Input Parameters

- **`searches`** (required): Array of Upwork search URLs with filters
- **`sessionCookie`** (required): Raw cookie string from Upwork session
- **`maxPagesPerSearch`**: Maximum pages to scrape per search (default: 3)
- **`fetchDetails`**: Whether to fetch detailed job information (default: true)
- **`maxConcurrency`**: Maximum concurrent requests (default: 5)
- **`requestDelay`**: Delay between requests in milliseconds (default: 2000)

## Output Data

The actor pushes the following data to the Apify dataset:

### Sample Dataset Items

#### Job Listing (from list page)
```json
{
  "title": "DevOps Engineer for AWS Infrastructure",
  "jobUrl": "https://www.upwork.com/jobs/~abc123def456/",
  "snippet": "Looking for an experienced DevOps engineer to help with AWS infrastructure setup and automation. Must have experience with Docker, Kubernetes, and CI/CD pipelines.",
  "budget": 5000,
  "hourly": 75,
  "posted": "2 hours ago",
  "country": "United States",
  "paymentVerified": true,
  "proposals": 8,
  "scrapedAt": "2024-01-01T12:00:00Z",
  "source": "upwork-scraper"
}
```

#### Job with Details (merged from list + detail pages)
```json
{
  "title": "Senior Full-Stack Developer - React & Node.js",
  "jobUrl": "https://www.upwork.com/jobs/~xyz789abc123/",
  "snippet": "We need a senior full-stack developer to build a modern web application using React and Node.js. Experience with TypeScript and PostgreSQL required.",
  "budget": 8000,
  "hourly": 85,
  "posted": "1 hour ago",
  "country": "Canada",
  "paymentVerified": true,
  "proposals": 12,
  "description": "We are a fast-growing startup looking for a senior full-stack developer to join our team. You will be responsible for building and maintaining our core web application using modern technologies.\n\nRequirements:\n- 5+ years experience with React and Node.js\n- Strong TypeScript skills\n- PostgreSQL database experience\n- Experience with AWS or similar cloud platforms\n- Git workflow proficiency\n\nNice to have:\n- Experience with Docker and Kubernetes\n- GraphQL knowledge\n- Testing frameworks (Jest, Cypress)\n- CI/CD pipeline experience",
  "skills": ["React", "Node.js", "TypeScript", "PostgreSQL", "AWS", "Docker", "GraphQL"],
  "clientSpending": "$25,000+",
  "clientJobs": "8+",
  "location": "Remote",
  "scrapedAt": "2024-01-01T12:00:00Z",
  "source": "upwork-scraper"
}
```

#### Fixed Price Job
```json
{
  "title": "WordPress Website Redesign",
  "jobUrl": "https://www.upwork.com/jobs/~def456ghi789/",
  "snippet": "Need a WordPress website redesigned with modern UI/UX. Must include custom theme development and plugin integration.",
  "budget": 2500,
  "hourly": null,
  "posted": "3 hours ago",
  "country": "United Kingdom",
  "paymentVerified": false,
  "proposals": 25,
  "description": "We need to completely redesign our existing WordPress website with a modern, responsive design. The project includes:\n\n- Custom theme development\n- UI/UX design improvements\n- Plugin integration and customization\n- Performance optimization\n- SEO improvements\n\nBudget: $2,500\nTimeline: 2-3 weeks\n\nPlease provide examples of similar WordPress projects you've completed.",
  "skills": ["WordPress", "PHP", "CSS", "JavaScript", "UI/UX Design"],
  "clientSpending": "$5,000+",
  "clientJobs": "3+",
  "location": "London, UK",
  "scrapedAt": "2024-01-01T12:00:00Z",
  "source": "upwork-scraper"
}
```

#### Hourly Rate Job
```json
{
  "title": "Python Data Analyst - Machine Learning",
  "jobUrl": "https://www.upwork.com/jobs/~ghi789jkl012/",
  "snippet": "Looking for a Python data analyst with machine learning experience to analyze customer data and build predictive models.",
  "budget": null,
  "hourly": 60,
  "posted": "4 hours ago",
  "country": "Australia",
  "paymentVerified": true,
  "proposals": 6,
  "description": "We need a skilled Python data analyst to help us analyze our customer data and build machine learning models for predictive analytics.\n\nKey responsibilities:\n- Analyze large datasets using Python (pandas, numpy)\n- Build and train machine learning models (scikit-learn, TensorFlow)\n- Create data visualizations (matplotlib, seaborn)\n- Generate insights and recommendations\n- Collaborate with our data science team\n\nRequirements:\n- 3+ years Python experience\n- Strong background in statistics and ML\n- Experience with SQL databases\n- Data visualization skills\n- Strong communication skills",
  "skills": ["Python", "Machine Learning", "Pandas", "NumPy", "Scikit-learn", "SQL", "Data Visualization"],
  "clientSpending": "$100,000+",
  "clientJobs": "25+",
  "location": "Sydney, Australia",
  "scrapedAt": "2024-01-01T12:00:00Z",
  "source": "upwork-scraper"
}
```

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

## Recommended Search URL Examples

### Basic Search URLs
```json
{
  "searches": [
    "https://www.upwork.com/nx/search/jobs/?q=react%20developer",
    "https://www.upwork.com/nx/search/jobs/?q=nodejs%20backend",
    "https://www.upwork.com/nx/search/jobs/?q=python%20automation"
  ]
}
```

### Advanced Search URLs with Filters
```json
{
  "searches": [
    "https://www.upwork.com/nx/search/jobs/?q=react&budget=1000-5000&sort=recency",
    "https://www.upwork.com/nx/search/jobs/?q=nodejs&job_type=hourly&experience_level=intermediate",
    "https://www.upwork.com/nx/search/jobs/?q=python&budget=500-2000&payment_verified=1",
    "https://www.upwork.com/nx/search/jobs/?q=javascript&sort=recency&proposals=0-5"
  ]
}
```

### URL Parameters Reference
- **`q`**: Search query (URL encoded)
- **`budget`**: Budget range (e.g., `1000-5000`, `500-2000`)
- **`job_type`**: `hourly` or `fixed`
- **`experience_level`**: `entry`, `intermediate`, or `expert`
- **`payment_verified`**: `1` for verified clients only
- **`proposals`**: Proposal count range (e.g., `0-5`, `5-15`)
- **`sort`**: `recency`, `relevance`, or `budget`

## Data Structure

### List Page Data
```json
{
  "title": "React Developer Needed",
  "jobUrl": "https://www.upwork.com/jobs/~abc123",
  "snippet": "Looking for a skilled React developer...",
  "budget": 2500,
  "hourly": null,
  "posted": "2 hours ago",
  "country": "United States",
  "paymentVerified": true,
  "proposals": 8
}
```

### Detail Page Data (merged with list data)
```json
{
  "title": "React Developer Needed",
  "description": "Full job description with requirements...",
  "skills": ["React", "JavaScript", "Node.js"],
  "clientSpending": "$10k+ spent",
  "clientJobs": "15 jobs posted",
  "location": "New York, NY"
}
```

### Final Merged Data
```json
{
  "title": "React Developer Needed",
  "jobUrl": "https://www.upwork.com/jobs/~abc123",
  "snippet": "Looking for a skilled React developer...",
  "description": "Full job description with requirements...",
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
  "scrapedAt": "2024-01-01T12:00:00Z",
  "source": "upwork-scraper"
}
```

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
  "searches": ["https://www.upwork.com/nx/search/jobs/?q=react"],
  "sessionCookie": "your_cookie_string_here",
  "maxPagesPerSearch": 1,
  "fetchDetails": true
}' > input.json

# Run with input
node main.js
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
     "searches": ["https://www.upwork.com/nx/search/jobs/?q=react"],
     "sessionCookie": "your_cookie_string",
     "maxPagesPerSearch": 3,
     "fetchDetails": true
   }
   ```
3. **Click "Start"** to run the actor
4. **Monitor progress** in the logs
5. **Download results** from the Dataset

### Scheduled Runs
1. **Go to actor settings**
2. **Set up schedule** (e.g., every 6 hours)
3. **Configure input** for scheduled runs
4. **Enable notifications** for run results

## Commands

```bash
# Start the scraper
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

- **Retry Logic**: Failed requests are automatically retried
- **Fallback Selectors**: Multiple CSS selectors for robust data extraction
- **Graceful Degradation**: Continues processing even if some jobs fail
- **Detailed Logging**: Comprehensive logs for debugging

## Performance Optimization

### Recommended Settings
- **`maxConcurrency`**: 3-5 for detail pages, 5-10 for list pages
- **`requestDelay`**: 2000ms to avoid rate limiting
- **`maxPagesPerSearch`**: 3-5 pages for good coverage without overloading

### Rate Limiting
- Upwork has rate limits - use appropriate delays
- Monitor for 429 (Too Many Requests) errors
- Adjust concurrency and delays if needed

## Troubleshooting

### Common Issues

1. **No jobs found**
   - Check if selectors are still valid
   - Verify search URLs are accessible
   - Check if session cookie is valid

2. **Authentication errors**
   - Refresh session cookie
   - Ensure cookie format is correct
   - Check if account is not restricted

3. **Rate limiting**
   - Increase `requestDelay`
   - Decrease `maxConcurrency`
   - Add delays between searches

4. **Detail page failures**
   - Check if `fetchDetails` is enabled
   - Verify job URLs are valid
   - Check Playwright browser logs

### Debug Mode
Enable debug logging by setting environment variable:
```bash
export APIFY_LOG_LEVEL=DEBUG
```

## Dependencies

- **`apify`**: Apify SDK for actor management
- **`crawlee`**: Modern web scraping framework
- **`cheerio`**: Server-side jQuery implementation
- **`playwright`**: Browser automation for dynamic content

## Security Considerations

- **Session cookies** contain authentication tokens - keep them secure
- **Don't commit cookies** to version control
- **Rotate cookies** regularly
- **Use environment variables** for sensitive data in production

## License

MIT License - see LICENSE file for details.
