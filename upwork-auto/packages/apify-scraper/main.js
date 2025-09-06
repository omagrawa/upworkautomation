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
    requestDelay = 2000,
    maxRetries = 3,
    retryDelay = 5000
} = input;

// User agent rotation list
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
];

// Retry with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            
            const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
            console.log(`Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Get random user agent
function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

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
    maxRequestRetries: maxRetries,
    requestHandler: async ({ request, $, response, log }) => {
        log.info(`Processing list page: ${request.url}`);
        
        try {
            // Extract job listings from the page with retry
            const jobs = await retryWithBackoff(
                () => extractJobListings($, request.url),
                maxRetries,
                retryDelay
            );
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
                    headers: { ...cookieHeaders, 'User-Agent': getRandomUserAgent() },
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
    maxRequestRetries: maxRetries,
    launchContext: {
        launchOptions: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    },
    requestHandler: async ({ request, page, response, log }) => {
        log.info(`Processing detail page: ${request.url}`);
        
        try {
            // Set random user agent
            await page.setUserAgent(getRandomUserAgent());
            
            // Set cookies for authentication with retry
            await retryWithBackoff(
                () => setCookiesFromString(page, sessionCookie),
                maxRetries,
                retryDelay
            );
            
            // Wait for page to load with multiple selector fallbacks
            await retryWithBackoff(
                () => waitForPageLoad(page),
                maxRetries,
                retryDelay
            );
            
            // Extract detailed job information with retry
            const jobDetails = await retryWithBackoff(
                () => extractJobDetails(page),
                maxRetries,
                retryDelay
            );
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
        headers: { ...cookieHeaders, 'User-Agent': getRandomUserAgent() },
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
        '[data-cy="job-tile"]',
        '.job-tile-wrapper',
        '.up-card',
        '.job-card',
        '[data-test="JobCard"]',
        '.search-result-item',
        '.job-listing'
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
    // Extract title with multiple fallback selectors
    const titleSelectors = [
        '[data-test="JobTileTitle"] a',
        '.job-tile-title a',
        'h3 a',
        '.up-card-header a',
        '.job-title a',
        '.title a',
        'a[data-test="JobTitle"]',
        '.job-link'
    ];
    const title = findFirstText($job, titleSelectors);
    
    // Extract job URL with multiple fallback selectors
    const urlSelectors = [
        '[data-test="JobTileTitle"] a',
        '.job-tile-title a',
        'h3 a',
        '.up-card-header a',
        '.job-title a',
        '.title a',
        'a[data-test="JobTitle"]',
        '.job-link'
    ];
    let jobUrl = findFirstAttr($job, urlSelectors, 'href');
    
    if (jobUrl && !jobUrl.startsWith('http')) {
        jobUrl = new URL(jobUrl, 'https://www.upwork.com').href;
    }
    
    // Extract snippet/description with multiple fallback selectors
    const snippetSelectors = [
        '[data-test="JobTileDescription"]',
        '.job-tile-description',
        '.up-card-body',
        '.job-description',
        '.description',
        '.snippet',
        '.job-summary'
    ];
    const snippet = findFirstText($job, snippetSelectors);
    
    // Extract budget with multiple fallback selectors
    const budgetSelectors = [
        '[data-test="JobTileBudget"]',
        '.budget',
        '.up-card-footer',
        '.job-budget',
        '.price',
        '.amount'
    ];
    const budgetText = findFirstText($job, budgetSelectors);
    const budget = extractBudgetFromText(budgetText);
    
    // Extract hourly rate with multiple fallback selectors
    const hourlySelectors = [
        '[data-test="JobTileHourlyRate"]',
        '.hourly-rate',
        '.rate',
        '.hourly',
        '.per-hour'
    ];
    const hourlyText = findFirstText($job, hourlySelectors);
    const hourly = extractHourlyFromText(hourlyText);
    
    // Extract posted time with multiple fallback selectors
    const postedSelectors = [
        '[data-test="JobTilePostedTime"]',
        '.posted-time',
        '.up-card-footer time',
        '.posted',
        '.time',
        '.date'
    ];
    const posted = findFirstText($job, postedSelectors);
    
    // Extract country with multiple fallback selectors
    const countrySelectors = [
        '[data-test="JobTileCountry"]',
        '.country',
        '.up-card-footer .country',
        '.location',
        '.client-location'
    ];
    const country = findFirstText($job, countrySelectors);
    
    // Extract payment verified with multiple fallback selectors
    const verifiedSelectors = [
        '[data-test="PaymentVerified"]',
        '.payment-verified',
        '.up-card-footer .verified',
        '.verified',
        '.payment-verified-icon'
    ];
    const paymentVerified = $job.find(verifiedSelectors.join(', ')).length > 0;
    
    // Extract proposals count with multiple fallback selectors
    const proposalsSelectors = [
        '[data-test="JobTileProposals"]',
        '.proposals',
        '.up-card-footer .proposals',
        '.proposal-count',
        '.bids'
    ];
    const proposalsText = findFirstText($job, proposalsSelectors);
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
    // Extract full title with multiple fallback selectors
    const titleSelectors = [
        '[data-test="JobDetailsTitle"]',
        'h1',
        '.job-title',
        '.title',
        '.job-header h1',
        '.job-details-title'
    ];
    const title = await findFirstTextContent(page, titleSelectors);
    
    // Extract full description with multiple fallback selectors
    const descriptionSelectors = [
        '[data-test="JobDetailsDescription"]',
        '.job-description',
        '.up-card-section',
        '.description',
        '.job-content',
        '.job-details-description'
    ];
    const description = await findFirstTextContent(page, descriptionSelectors);
    
    // Extract skills with multiple fallback selectors
    const skillsSelectors = [
        '[data-test="JobDetailsSkills"] .skill-tag',
        '.skills .tag',
        '.up-skill-badge',
        '.skill-badge',
        '.tag',
        '.skill'
    ];
    const skills = await findAllTextContents(page, skillsSelectors);
    
    // Extract client spending with multiple fallback selectors
    const spendingSelectors = [
        '[data-test="ClientSpending"]',
        '.client-spending',
        '.up-card-section .spent',
        '.spent',
        '.client-total-spent',
        '.total-spent'
    ];
    const clientSpending = await findFirstTextContent(page, spendingSelectors);
    
    // Extract client jobs count with multiple fallback selectors
    const jobsSelectors = [
        '[data-test="ClientJobs"]',
        '.client-jobs',
        '.up-card-section .jobs',
        '.jobs-count',
        '.client-jobs-count',
        '.total-jobs'
    ];
    const clientJobs = await findFirstTextContent(page, jobsSelectors);
    
    // Extract location with multiple fallback selectors
    const locationSelectors = [
        '[data-test="JobLocation"]',
        '.job-location',
        '.up-card-section .location',
        '.location',
        '.client-location',
        '.job-location-info'
    ];
    const location = await findFirstTextContent(page, locationSelectors);
    
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

// Helper functions for defensive selectors
function findFirstText($, selectors) {
    for (const selector of selectors) {
        const text = $.find(selector).first().text().trim();
        if (text) return text;
    }
    return '';
}

function findFirstAttr($, selectors, attr) {
    for (const selector of selectors) {
        const value = $.find(selector).first().attr(attr);
        if (value) return value;
    }
    return '';
}

async function findFirstTextContent(page, selectors) {
    for (const selector of selectors) {
        try {
            const text = await page.locator(selector).first().textContent();
            if (text && text.trim()) return text;
        } catch (error) {
            continue;
        }
    }
    return '';
}

async function findAllTextContents(page, selectors) {
    for (const selector of selectors) {
        try {
            const texts = await page.locator(selector).allTextContents();
            if (texts && texts.length > 0) return texts;
        } catch (error) {
            continue;
        }
    }
    return [];
}

async function waitForPageLoad(page) {
    const selectors = [
        '[data-test="JobDetails"]',
        '.job-details',
        '.job-content',
        'main',
        'body'
    ];
    
    for (const selector of selectors) {
        try {
            await page.waitForSelector(selector, { timeout: 5000 });
            return;
        } catch (error) {
            continue;
        }
    }
    
    // Fallback: wait for any content
    await page.waitForLoadState('domcontentloaded');
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
