import { Actor } from 'apify';
import { CheerioCrawler } from 'crawlee';
import { PlaywrightCrawler } from 'crawlee';
import { chromium } from 'playwright';

await Actor.init();

const input = await Actor.getInput();
const {
    searches = [],
    sessionCookie = '',
    maxPagesPerSearch = 3,
    fetchDetails = true,
    maxConcurrency = 5,
    requestDelay = 2000
} = input;

console.log('Starting Upwork job scraper with input:', {
    searches: searches.length,
    maxPagesPerSearch,
    fetchDetails,
    maxConcurrency,
    requestDelay
});

// Validate input
if (!searches.length) {
    throw new Error('At least one search URL is required');
}

if (!sessionCookie) {
    throw new Error('Session cookie is required for authentication');
}

// Storage for job data
const jobData = new Map();
const processedJobs = new Set();

// Parse session cookie into headers
const cookieHeaders = parseCookieString(sessionCookie);

// Configure CheerioCrawler for list pages
const listCrawler = new CheerioCrawler({
    maxConcurrency,
    requestHandlerTimeoutSecs: 60,
    requestHandler: async ({ request, $, response, log }) => {
        log.info(`Processing list page: ${request.url}`);
        
        try {
            // Extract job listings from the page
            const jobs = extractJobListings($, request.url);
            log.info(`Found ${jobs.length} jobs on page`);
            
            // Store job data
            for (const job of jobs) {
                const jobId = extractJobId(job.jobUrl);
                if (jobId && !processedJobs.has(jobId)) {
                    jobData.set(jobId, job);
                    processedJobs.add(jobId);
                }
            }
            
            // Check for next page
            const nextPageUrl = findNextPageUrl($, request.url);
            if (nextPageUrl && shouldContinuePagination(request.url, maxPagesPerSearch)) {
                log.info(`Adding next page: ${nextPageUrl}`);
                await listCrawler.addRequests([{
                    url: nextPageUrl,
                    headers: cookieHeaders,
                    userData: { ...request.userData, page: (request.userData.page || 1) + 1 }
                }]);
            }
            
        } catch (error) {
            log.error(`Error processing list page ${request.url}:`, error);
            throw error;
        }
    },
    failedRequestHandler: async ({ request, error, log }) => {
        log.error(`Failed to process list page ${request.url}:`, error);
    }
});

// Configure PlaywrightCrawler for detail pages
const detailCrawler = new PlaywrightCrawler({
    maxConcurrency: Math.min(maxConcurrency, 3), // Lower concurrency for detail pages
    requestHandlerTimeoutSecs: 120,
    launchContext: {
        launchOptions: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    },
    requestHandler: async ({ request, page, response, log }) => {
        log.info(`Processing detail page: ${request.url}`);
        
        try {
            // Set cookies for authentication
            await setCookiesFromString(page, sessionCookie);
            
            // Wait for page to load
            await page.waitForSelector('[data-test="JobDetails"]', { timeout: 10000 });
            
            // Extract detailed job information
            const jobDetails = await extractJobDetails(page);
            const jobId = extractJobId(request.url);
            
            if (jobId && jobData.has(jobId)) {
                // Merge with existing data, preferring detail fields
                const existingJob = jobData.get(jobId);
                jobData.set(jobId, { ...existingJob, ...jobDetails });
                log.info(`Merged details for job ${jobId}`);
            } else if (jobId) {
                // Store new job data
                jobData.set(jobId, jobDetails);
                log.info(`Stored new job details for ${jobId}`);
            }
            
        } catch (error) {
            log.error(`Error processing detail page ${request.url}:`, error);
            throw error;
        }
    },
    failedRequestHandler: async ({ request, error, log }) => {
        log.error(`Failed to process detail page ${request.url}:`, error);
    }
});

try {
    // Start crawling list pages
    console.log('Starting list page crawling...');
    const listRequests = searches.map((url, index) => ({
        url,
        headers: cookieHeaders,
        userData: { searchIndex: index, page: 1 }
    }));
    
    await listCrawler.run(listRequests);
    
    console.log(`Completed list crawling. Found ${jobData.size} unique jobs.`);
    
    // If detail fetching is enabled, crawl detail pages
    if (fetchDetails && jobData.size > 0) {
        console.log('Starting detail page crawling...');
        
        const detailRequests = Array.from(jobData.values())
            .filter(job => job.jobUrl)
            .map(job => ({
                url: job.jobUrl,
                userData: { jobId: extractJobId(job.jobUrl) }
            }));
        
        await detailCrawler.run(detailRequests);
        console.log('Completed detail page crawling.');
    }
    
    // Push all job data to dataset
    console.log(`Pushing ${jobData.size} jobs to dataset...`);
    const jobsArray = Array.from(jobData.values());
    
    for (const job of jobsArray) {
        await Actor.pushData({
            ...job,
            scrapedAt: new Date().toISOString(),
            source: 'upwork-scraper'
        });
    }
    
    console.log(`Successfully scraped and stored ${jobsArray.length} jobs.`);
    
} catch (error) {
    console.error('Scraping failed:', error);
    throw error;
}

await Actor.exit();

// Helper functions
function parseCookieString(cookieString) {
    const headers = {};
    if (cookieString) {
        headers['Cookie'] = cookieString;
    }
    return headers;
}

function extractJobListings($, pageUrl) {
    const jobs = [];
    
    // Multiple selectors for job listings (Upwork changes these frequently)
    const jobSelectors = [
        '[data-test="JobTile"]',
        '.job-tile',
        '.up-card-section',
        '[data-cy="job-tile"]'
    ];
    
    let jobElements = [];
    for (const selector of jobSelectors) {
        jobElements = $(selector);
        if (jobElements.length > 0) {
            console.log(`Using selector: ${selector} (${jobElements.length} jobs)`);
            break;
        }
    }
    
    if (jobElements.length === 0) {
        console.warn('No job elements found with any selector');
        return jobs;
    }
    
    jobElements.each((index, element) => {
        try {
            const $job = $(element);
            const job = extractJobFromElement($job, pageUrl);
            if (job && job.jobUrl) {
                jobs.push(job);
            }
        } catch (error) {
            console.error(`Error extracting job ${index}:`, error);
        }
    });
    
    return jobs;
}

function extractJobFromElement($job, pageUrl) {
    // Extract title
    const title = $job.find('[data-test="JobTileTitle"] a, .job-tile-title a, h3 a, .up-card-header a')
        .first()
        .text()
        .trim();
    
    // Extract job URL
    let jobUrl = $job.find('[data-test="JobTileTitle"] a, .job-tile-title a, h3 a, .up-card-header a')
        .first()
        .attr('href');
    
    if (jobUrl && !jobUrl.startsWith('http')) {
        jobUrl = new URL(jobUrl, 'https://www.upwork.com').href;
    }
    
    // Extract snippet/description
    const snippet = $job.find('[data-test="JobTileDescription"], .job-tile-description, .up-card-body')
        .text()
        .trim();
    
    // Extract budget
    const budgetText = $job.find('[data-test="JobTileBudget"], .budget, .up-card-footer')
        .text()
        .trim();
    const budget = extractBudgetFromText(budgetText);
    
    // Extract hourly rate
    const hourlyText = $job.find('[data-test="JobTileHourlyRate"], .hourly-rate')
        .text()
        .trim();
    const hourly = extractHourlyFromText(hourlyText);
    
    // Extract posted time
    const posted = $job.find('[data-test="JobTilePostedTime"], .posted-time, .up-card-footer time')
        .text()
        .trim();
    
    // Extract country
    const country = $job.find('[data-test="JobTileCountry"], .country, .up-card-footer .country')
        .text()
        .trim();
    
    // Extract payment verified
    const paymentVerified = $job.find('[data-test="PaymentVerified"], .payment-verified, .up-card-footer .verified')
        .length > 0;
    
    // Extract proposals count
    const proposalsText = $job.find('[data-test="JobTileProposals"], .proposals, .up-card-footer .proposals')
        .text()
        .trim();
    const proposals = extractProposalsFromText(proposalsText);
    
    return {
        title,
        jobUrl,
        snippet,
        budget,
        hourly,
        posted,
        country,
        paymentVerified,
        proposals
    };
}

async function extractJobDetails(page) {
    // Extract full title
    const title = await page.locator('[data-test="JobDetailsTitle"], h1, .job-title')
        .first()
        .textContent()
        .catch(() => '');
    
    // Extract full description
    const description = await page.locator('[data-test="JobDetailsDescription"], .job-description, .up-card-section')
        .first()
        .textContent()
        .catch(() => '');
    
    // Extract skills
    const skills = await page.locator('[data-test="JobDetailsSkills"] .skill-tag, .skills .tag, .up-skill-badge')
        .allTextContents()
        .catch(() => []);
    
    // Extract client spending
    const clientSpending = await page.locator('[data-test="ClientSpending"], .client-spending, .up-card-section .spent')
        .textContent()
        .catch(() => '');
    
    // Extract client jobs count
    const clientJobs = await page.locator('[data-test="ClientJobs"], .client-jobs, .up-card-section .jobs')
        .textContent()
        .catch(() => '');
    
    // Extract location
    const location = await page.locator('[data-test="JobLocation"], .job-location, .up-card-section .location')
        .textContent()
        .catch(() => '');
    
    return {
        title: title.trim(),
        description: description.trim(),
        skills: skills.map(skill => skill.trim()).filter(skill => skill),
        clientSpending: clientSpending.trim(),
        clientJobs: clientJobs.trim(),
        location: location.trim()
    };
}

function extractJobId(jobUrl) {
    if (!jobUrl) return null;
    
    // Extract job ID from URL patterns
    const patterns = [
        /\/jobs\/([^\/\?]+)/,
        /\/nx\/jobs\/([^\/\?]+)/,
        /job\/([^\/\?]+)/,
        /~([^\/\?]+)/
    ];
    
    for (const pattern of patterns) {
        const match = jobUrl.match(pattern);
        if (match) {
            return match[1];
        }
    }
    
    return null;
}

function findNextPageUrl($, currentUrl) {
    // Look for next page link
    const nextSelectors = [
        'a[aria-label="Next page"]',
        'a[data-test="PaginationNext"]',
        '.pagination .next a',
        '.up-pagination .next a'
    ];
    
    for (const selector of nextSelectors) {
        const nextLink = $(selector).attr('href');
        if (nextLink) {
            return new URL(nextLink, 'https://www.upwork.com').href;
        }
    }
    
    return null;
}

function shouldContinuePagination(currentUrl, maxPages) {
    // Extract page number from URL
    const pageMatch = currentUrl.match(/[?&]page=(\d+)/);
    const currentPage = pageMatch ? parseInt(pageMatch[1]) : 1;
    
    return currentPage < maxPages;
}

function extractBudgetFromText(text) {
    if (!text) return null;
    
    // Look for budget patterns like "$500 - $1,000", "$5,000", "Fixed: $2,000"
    const patterns = [
        /\$([\d,]+)\s*-\s*\$([\d,]+)/,  // Range
        /Fixed[:\s]*\$([\d,]+)/,        // Fixed price
        /\$([\d,]+)/                    // Single amount
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            if (match[2]) {
                // Range - return average
                const min = parseInt(match[1].replace(/,/g, ''));
                const max = parseInt(match[2].replace(/,/g, ''));
                return Math.round((min + max) / 2);
            } else {
                return parseInt(match[1].replace(/,/g, ''));
            }
        }
    }
    
    return null;
}

function extractHourlyFromText(text) {
    if (!text) return null;
    
    // Look for hourly rate patterns like "$25/hr", "$50/hour"
    const patterns = [
        /\$([\d.]+)\/hr/,
        /\$([\d.]+)\/hour/
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return parseFloat(match[1]);
        }
    }
    
    return null;
}

function extractProposalsFromText(text) {
    if (!text) return 0;
    
    // Look for proposal count patterns like "15 proposals", "5-10 proposals"
    const patterns = [
        /(\d+)\s*proposals?/i,
        /(\d+)-(\d+)\s*proposals?/i
    ];
    
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            if (match[2]) {
                // Range - return average
                return Math.round((parseInt(match[1]) + parseInt(match[2])) / 2);
            } else {
                return parseInt(match[1]);
            }
        }
    }
    
    return 0;
}

async function setCookiesFromString(page, cookieString) {
    if (!cookieString) return;
    
    try {
        // Parse cookie string and set cookies
        const cookies = cookieString.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=');
            return {
                name: name.trim(),
                value: value ? value.trim() : '',
                domain: '.upwork.com',
                path: '/'
            };
        }).filter(cookie => cookie.name && cookie.value);
        
        await page.context().addCookies(cookies);
    } catch (error) {
        console.error('Error setting cookies:', error);
    }
}
