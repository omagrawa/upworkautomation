import { Actor } from 'apify';
import { chromium } from 'playwright';
import axios from 'axios';

await Actor.init();

const input = await Actor.getInput();
const {
    upworkCredentials,
    jobData,
    proposalData,
    settings = {}
} = input;

const {
    maxRetries = 3,
    delayBetweenActions = 2000,
    headless = true
} = settings;

console.log('Starting Upwork job submission with input:', {
    jobId: jobData.jobId,
    jobTitle: jobData.title,
    bidAmount: proposalData.bidAmount
});

// Initialize Playwright browser
const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
});

const page = await context.newPage();

try {
    // Step 1: Login to Upwork
    console.log('Logging into Upwork...');
    await loginToUpwork(page, upworkCredentials);
    
    // Step 2: Navigate to job page
    console.log('Navigating to job page...');
    await navigateToJob(page, jobData.jobUrl);
    
    // Step 3: Submit proposal
    console.log('Submitting proposal...');
    const submissionResult = await submitProposal(page, proposalData, delayBetweenActions);
    
    // Step 4: Log results
    console.log('Submission completed:', submissionResult);
    
    // Store results in Apify dataset
    await Actor.pushData({
        jobId: jobData.jobId,
        jobTitle: jobData.title,
        jobUrl: jobData.jobUrl,
        submissionResult,
        submittedAt: new Date().toISOString(),
        success: submissionResult.success
    });
    
    console.log('Job submission completed successfully');
    
} catch (error) {
    console.error('Job submission failed:', error);
    
    // Store error in dataset
    await Actor.pushData({
        jobId: jobData.jobId,
        jobTitle: jobData.title,
        jobUrl: jobData.jobUrl,
        error: error.message,
        failedAt: new Date().toISOString(),
        success: false
    });
    
    throw error;
} finally {
    await browser.close();
}

await Actor.exit();

// Helper functions
async function loginToUpwork(page, credentials) {
    const { username, password } = credentials;
    
    // Navigate to login page
    await page.goto('https://www.upwork.com/ab/account-security/login', { 
        waitUntil: 'networkidle' 
    });
    
    // Wait for login form
    await page.waitForSelector('input[name="login[username]"]', { timeout: 10000 });
    
    // Fill login form
    await page.fill('input[name="login[username]"]', username);
    await page.fill('input[name="login[password]"]', password);
    
    // Submit login form
    await page.click('button[type="submit"]');
    
    // Wait for successful login (redirect to dashboard or profile)
    try {
        await page.waitForURL(/upwork\.com\/(nx\/)?(dashboard|freelancer)/, { 
            timeout: 15000 
        });
        console.log('Successfully logged into Upwork');
    } catch (error) {
        // Check for login errors
        const errorMessage = await page.locator('.error-message, .alert-danger').textContent().catch(() => '');
        if (errorMessage) {
            throw new Error(`Login failed: ${errorMessage}`);
        }
        throw new Error('Login failed: Could not verify successful login');
    }
}

async function navigateToJob(page, jobUrl) {
    await page.goto(jobUrl, { waitUntil: 'networkidle' });
    
    // Wait for job page to load
    await page.waitForSelector('[data-test="JobDetails"]', { timeout: 10000 });
    
    // Check if job is still available
    const jobUnavailable = await page.locator('text=This job is no longer available').isVisible();
    if (jobUnavailable) {
        throw new Error('Job is no longer available');
    }
    
    // Check if already applied
    const alreadyApplied = await page.locator('text=You have already submitted a proposal').isVisible();
    if (alreadyApplied) {
        throw new Error('Already applied to this job');
    }
}

async function submitProposal(page, proposalData, delayBetweenActions) {
    const { coverLetter, bidAmount, timeline, attachments = [] } = proposalData;
    
    try {
        // Click "Submit a Proposal" button
        await page.click('[data-test="SubmitProposalButton"]');
        await page.waitForTimeout(delayBetweenActions);
        
        // Wait for proposal form to load
        await page.waitForSelector('[data-test="ProposalForm"]', { timeout: 10000 });
        
        // Fill cover letter
        await page.fill('[data-test="CoverLetterTextarea"]', coverLetter);
        await page.waitForTimeout(delayBetweenActions);
        
        // Set bid amount
        await page.fill('[data-test="BidAmountInput"]', bidAmount.toString());
        await page.waitForTimeout(delayBetweenActions);
        
        // Set timeline if provided
        if (timeline) {
            await page.selectOption('[data-test="TimelineSelect"]', timeline);
            await page.waitForTimeout(delayBetweenActions);
        }
        
        // Handle attachments if provided
        if (attachments.length > 0) {
            for (const attachment of attachments) {
                await page.setInputFiles('[data-test="FileUploadInput"]', attachment);
                await page.waitForTimeout(delayBetweenActions);
            }
        }
        
        // Submit proposal
        await page.click('[data-test="SubmitProposalButton"]');
        
        // Wait for submission confirmation
        await page.waitForSelector('[data-test="SubmissionConfirmation"]', { timeout: 15000 });
        
        const confirmationMessage = await page.locator('[data-test="SubmissionConfirmation"]').textContent();
        
        return {
            success: true,
            confirmationMessage: confirmationMessage?.trim(),
            submittedAt: new Date().toISOString()
        };
        
    } catch (error) {
        // Check for specific error messages
        const errorSelectors = [
            '[data-test="ErrorMessage"]',
            '.error-message',
            '.alert-danger',
            '[role="alert"]'
        ];
        
        let errorMessage = '';
        for (const selector of errorSelectors) {
            const errorElement = await page.locator(selector).first();
            if (await errorElement.isVisible()) {
                errorMessage = await errorElement.textContent();
                break;
            }
        }
        
        return {
            success: false,
            error: errorMessage || error.message,
            failedAt: new Date().toISOString()
        };
    }
}

// Utility function to add delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
