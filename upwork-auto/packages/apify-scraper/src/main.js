import { Actor } from 'apify';
import { chromium } from 'playwright';
import * as cheerio from 'cheerio';
import axios from 'axios';

await Actor.init();

const input = await Actor.getInput();
const {
    searchQuery,
    maxResults = 50,
    webhookUrl,
    filters = {}
} = input;

const {
    jobType = 'all',
    experienceLevel = 'all',
    budgetMin = 0,
    budgetMax = 10000
} = filters;

console.log('Starting Upwork job scraper with input:', input);

// Initialize Playwright browser
const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
});

const page = await context.newPage();

try {
    // Navigate to Upwork search page
    const searchUrl = buildSearchUrl(searchQuery, filters);
    console.log('Navigating to:', searchUrl);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle' });
    
    // Wait for job listings to load
    await page.waitForSelector('[data-test="JobTile"]', { timeout: 10000 });
    
    // Scroll to load more jobs if needed
    await scrollToLoadJobs(page, maxResults);
    
    // Get page content and parse with Cheerio
    const content = await page.content();
    const $ = cheerio.load(content);
    
    const jobs = [];
    
    // Extract job data
    $('[data-test="JobTile"]').each((index, element) => {
        if (jobs.length >= maxResults) return false;
        
        const $job = $(element);
        
        try {
            const job = {
                id: extractJobId($job),
                title: extractTitle($job),
                description: extractDescription($job),
                budget: extractBudget($job),
                hourlyRate: extractHourlyRate($job),
                jobType: extractJobType($job),
                experienceLevel: extractExperienceLevel($job),
                skills: extractSkills($job),
                clientInfo: extractClientInfo($job),
                postedTime: extractPostedTime($job),
                proposals: extractProposals($job),
                url: extractJobUrl($job),
                scrapedAt: new Date().toISOString()
            };
            
            // Filter jobs based on criteria
            if (shouldIncludeJob(job, filters)) {
                jobs.push(job);
            }
        } catch (error) {
            console.error('Error extracting job data:', error);
        }
    });
    
    console.log(`Scraped ${jobs.length} jobs`);
    
    // Send data to webhook
    if (webhookUrl && jobs.length > 0) {
        try {
            await axios.post(webhookUrl, {
                source: 'upwork-scraper',
                timestamp: new Date().toISOString(),
                searchQuery,
                filters,
                jobs
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Upwork-Auto-Scraper/1.0'
                },
                timeout: 30000
            });
            
            console.log(`Successfully sent ${jobs.length} jobs to webhook`);
        } catch (error) {
            console.error('Error sending data to webhook:', error);
            throw error;
        }
    }
    
    // Store results in Apify dataset
    await Actor.pushData(jobs);
    
    console.log('Scraping completed successfully');
    
} catch (error) {
    console.error('Scraping failed:', error);
    throw error;
} finally {
    await browser.close();
}

await Actor.exit();

// Helper functions
function buildSearchUrl(query, filters) {
    const baseUrl = 'https://www.upwork.com/nx/search/jobs/';
    const params = new URLSearchParams({
        q: query,
        sort: 'recency'
    });
    
    if (filters.jobType && filters.jobType !== 'all') {
        params.append('job_type', filters.jobType);
    }
    
    if (filters.experienceLevel && filters.experienceLevel !== 'all') {
        params.append('experience_level', filters.experienceLevel);
    }
    
    return `${baseUrl}?${params.toString()}`;
}

async function scrollToLoadJobs(page, maxResults) {
    let previousCount = 0;
    let currentCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;
    
    do {
        previousCount = currentCount;
        
        // Scroll to bottom
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        
        // Wait for new content to load
        await page.waitForTimeout(2000);
        
        // Count current jobs
        currentCount = await page.locator('[data-test="JobTile"]').count();
        
        scrollAttempts++;
        
        console.log(`Scroll attempt ${scrollAttempts}: ${currentCount} jobs loaded`);
        
    } while (currentCount > previousCount && currentCount < maxResults && scrollAttempts < maxScrollAttempts);
}

function extractJobId($job) {
    return $job.attr('data-job-id') || $job.find('a').attr('href')?.split('/').pop() || '';
}

function extractTitle($job) {
    return $job.find('[data-test="JobTileTitle"]').text().trim() || 
           $job.find('h3 a').text().trim() || '';
}

function extractDescription($job) {
    return $job.find('[data-test="JobTileDescription"]').text().trim() || 
           $job.find('.job-description').text().trim() || '';
}

function extractBudget($job) {
    const budgetText = $job.find('[data-test="JobTileBudget"]').text().trim() ||
                      $job.find('.budget').text().trim() || '';
    
    if (budgetText.includes('$')) {
        const match = budgetText.match(/\$([\d,]+)/);
        return match ? parseInt(match[1].replace(/,/g, '')) : null;
    }
    
    return null;
}

function extractHourlyRate($job) {
    const rateText = $job.find('[data-test="JobTileHourlyRate"]').text().trim() ||
                    $job.find('.hourly-rate').text().trim() || '';
    
    if (rateText.includes('$')) {
        const match = rateText.match(/\$([\d.]+)/);
        return match ? parseFloat(match[1]) : null;
    }
    
    return null;
}

function extractJobType($job) {
    const typeText = $job.find('[data-test="JobTileType"]').text().trim() ||
                    $job.find('.job-type').text().trim() || '';
    
    if (typeText.toLowerCase().includes('hourly')) return 'hourly';
    if (typeText.toLowerCase().includes('fixed')) return 'fixed';
    
    return 'unknown';
}

function extractExperienceLevel($job) {
    const levelText = $job.find('[data-test="JobTileExperienceLevel"]').text().trim() ||
                     $job.find('.experience-level').text().trim() || '';
    
    if (levelText.toLowerCase().includes('entry')) return 'entry';
    if (levelText.toLowerCase().includes('intermediate')) return 'intermediate';
    if (levelText.toLowerCase().includes('expert')) return 'expert';
    
    return 'unknown';
}

function extractSkills($job) {
    const skills = [];
    $job.find('[data-test="JobTileSkills"] .skill-tag, .skills .tag').each((i, el) => {
        const skill = $(el).text().trim();
        if (skill) skills.push(skill);
    });
    return skills;
}

function extractClientInfo($job) {
    return {
        name: $job.find('[data-test="JobTileClientName"]').text().trim() || 
              $job.find('.client-name').text().trim() || '',
        rating: $job.find('[data-test="JobTileClientRating"]').text().trim() || 
                $job.find('.client-rating').text().trim() || '',
        totalSpent: $job.find('[data-test="JobTileClientSpent"]').text().trim() || 
                   $job.find('.client-spent').text().trim() || ''
    };
}

function extractPostedTime($job) {
    return $job.find('[data-test="JobTilePostedTime"]').text().trim() ||
           $job.find('.posted-time').text().trim() || '';
}

function extractProposals($job) {
    const proposalsText = $job.find('[data-test="JobTileProposals"]').text().trim() ||
                         $job.find('.proposals').text().trim() || '';
    
    const match = proposalsText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function extractJobUrl($job) {
    const href = $job.find('a').attr('href');
    return href ? (href.startsWith('http') ? href : `https://www.upwork.com${href}`) : '';
}

function shouldIncludeJob(job, filters) {
    // Filter by budget range for fixed-price jobs
    if (job.jobType === 'fixed' && job.budget) {
        if (job.budget < filters.budgetMin || job.budget > filters.budgetMax) {
            return false;
        }
    }
    
    // Filter by hourly rate for hourly jobs
    if (job.jobType === 'hourly' && job.hourlyRate) {
        const hourlyBudget = job.hourlyRate * 40; // Assume 40 hours
        if (hourlyBudget < filters.budgetMin || hourlyBudget > filters.budgetMax) {
            return false;
        }
    }
    
    return true;
}
