import { Actor } from 'apify';
import { chromium } from 'playwright';

await Actor.init();

const input = await Actor.getInput();
const {
    sessionCookie = '',
    jobUrl = '',
    proposalText = '',
    hourlyRate = 40,
    connectsConfirm = true,
    maxRetries = 3,
    delayBetweenActions = 2000,
    headless = true,
    takeScreenshot = true
} = input;

console.log('Starting Upwork job submission with input:', {
    jobUrl,
    hourlyRate,
    connectsConfirm,
    headless
});

// Validate input
if (!sessionCookie) {
    throw new Error('Session cookie is required for authentication');
}

if (!jobUrl) {
    throw new Error('Job URL is required');
}

if (!proposalText) {
    throw new Error('Proposal text is required');
}

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

let result = {
    status: 'failed',
    finalUrl: '',
    screenshotPath: '',
    error: '',
    submittedAt: new Date().toISOString()
};

try {
    // Step 1: Set up authentication
    console.log('Setting up authentication...');
    await setCookiesFromString(page, sessionCookie);
    
    // Step 2: Navigate to job page
    console.log('Navigating to job page...');
    await navigateToJob(page, jobUrl);
    
    // Step 3: Click Apply button
    console.log('Clicking Apply button...');
    await clickApplyButton(page);
    
    // Step 4: Wait for and fill cover letter
    console.log('Filling cover letter...');
    await fillCoverLetter(page, proposalText);
    
    // Step 5: Set hourly rate if applicable
    console.log('Setting hourly rate...');
    await setHourlyRate(page, hourlyRate);
    
    // Step 6: Submit proposal
    console.log('Submitting proposal...');
    await submitProposal(page, connectsConfirm);
    
    // Step 7: Take screenshot if requested
    if (takeScreenshot) {
        console.log('Taking screenshot...');
        result.screenshotPath = await takeScreenshotOfResult(page);
    }
    
    // Step 8: Get final URL
    result.finalUrl = page.url();
    result.status = 'success';
    
    console.log('Proposal submitted successfully!');
    
} catch (error) {
    console.error('Submission failed:', error);
    result.error = error.message;
    result.status = 'failed';
    
    // Take error screenshot if requested
    if (takeScreenshot) {
        try {
            result.screenshotPath = await takeScreenshotOfResult(page);
        } catch (screenshotError) {
            console.error('Failed to take error screenshot:', screenshotError);
        }
    }
} finally {
    await browser.close();
}

// Push result to dataset
await Actor.pushData(result);

console.log('Submission completed with result:', result);

await Actor.exit();

// Helper functions
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
        console.log(`Set ${cookies.length} cookies for authentication`);
    } catch (error) {
        console.error('Error setting cookies:', error);
        throw new Error('Failed to set authentication cookies');
    }
}

async function navigateToJob(page, jobUrl) {
    try {
        await page.goto(jobUrl, { waitUntil: 'networkidle', timeout: 30000 });
        
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
        
        console.log('Successfully navigated to job page');
    } catch (error) {
        console.error('Error navigating to job page:', error);
        throw new Error(`Failed to navigate to job page: ${error.message}`);
    }
}

async function clickApplyButton(page) {
    try {
        // Multiple selectors for Apply button
        const applySelectors = [
            '[data-test="SubmitProposalButton"]',
            'button:has-text("Submit a Proposal")',
            'button:has-text("Apply")',
            'a:has-text("Submit a Proposal")',
            'a:has-text("Apply")',
            '.submit-proposal-button',
            '.apply-button'
        ];
        
        let applyButton = null;
        for (const selector of applySelectors) {
            try {
                applyButton = page.locator(selector).first();
                if (await applyButton.isVisible({ timeout: 2000 })) {
                    console.log(`Found Apply button with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!applyButton || !(await applyButton.isVisible())) {
            throw new Error('Apply button not found');
        }
        
        await applyButton.click();
        await page.waitForTimeout(delayBetweenActions);
        
        console.log('Apply button clicked successfully');
    } catch (error) {
        console.error('Error clicking Apply button:', error);
        throw new Error(`Failed to click Apply button: ${error.message}`);
    }
}

async function fillCoverLetter(page, proposalText) {
    try {
        // Wait for cover letter textarea to appear
        const coverLetterSelectors = [
            '[data-test="CoverLetterTextarea"]',
            'textarea[name="coverLetter"]',
            'textarea[placeholder*="cover letter"]',
            'textarea[placeholder*="proposal"]',
            '.cover-letter textarea',
            '.proposal-text textarea'
        ];
        
        let coverLetterField = null;
        for (const selector of coverLetterSelectors) {
            try {
                coverLetterField = page.locator(selector).first();
                await coverLetterField.waitFor({ timeout: 5000 });
                if (await coverLetterField.isVisible()) {
                    console.log(`Found cover letter field with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!coverLetterField || !(await coverLetterField.isVisible())) {
            throw new Error('Cover letter field not found');
        }
        
        // Clear existing text and fill with proposal
        await coverLetterField.clear();
        await coverLetterField.fill(proposalText);
        await page.waitForTimeout(delayBetweenActions);
        
        console.log('Cover letter filled successfully');
    } catch (error) {
        console.error('Error filling cover letter:', error);
        throw new Error(`Failed to fill cover letter: ${error.message}`);
    }
}

async function setHourlyRate(page, hourlyRate) {
    try {
        // Look for hourly rate input field
        const rateSelectors = [
            '[data-test="HourlyRateInput"]',
            'input[name="hourlyRate"]',
            'input[placeholder*="hourly rate"]',
            'input[placeholder*="rate"]',
            '.hourly-rate input',
            '.rate-input input'
        ];
        
        let rateField = null;
        for (const selector of rateSelectors) {
            try {
                rateField = page.locator(selector).first();
                if (await rateField.isVisible({ timeout: 2000 })) {
                    console.log(`Found hourly rate field with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (rateField && await rateField.isVisible()) {
            await rateField.clear();
            await rateField.fill(hourlyRate.toString());
            await page.waitForTimeout(delayBetweenActions);
            console.log(`Hourly rate set to ${hourlyRate}`);
        } else {
            console.log('No hourly rate field found - job might be fixed price');
        }
    } catch (error) {
        console.error('Error setting hourly rate:', error);
        // Don't throw error for hourly rate - it's optional
        console.log('Continuing without setting hourly rate');
    }
}

async function submitProposal(page, connectsConfirm) {
    try {
        // Look for submit/continue button
        const submitSelectors = [
            '[data-test="SubmitProposalButton"]',
            'button:has-text("Submit Proposal")',
            'button:has-text("Continue")',
            'button:has-text("Submit")',
            '.submit-proposal-button',
            '.continue-button'
        ];
        
        let submitButton = null;
        for (const selector of submitSelectors) {
            try {
                submitButton = page.locator(selector).first();
                if (await submitButton.isVisible({ timeout: 2000 })) {
                    console.log(`Found submit button with selector: ${selector}`);
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!submitButton || !(await submitButton.isVisible())) {
            throw new Error('Submit button not found');
        }
        
        await submitButton.click();
        await page.waitForTimeout(delayBetweenActions);
        
        // Handle connects confirmation if prompted
        if (connectsConfirm) {
            await handleConnectsConfirmation(page);
        }
        
        // Wait for submission to complete
        await page.waitForTimeout(delayBetweenActions * 2);
        
        console.log('Proposal submitted successfully');
    } catch (error) {
        console.error('Error submitting proposal:', error);
        throw new Error(`Failed to submit proposal: ${error.message}`);
    }
}

async function handleConnectsConfirmation(page) {
    try {
        // Look for connects confirmation dialog
        const connectsSelectors = [
            'button:has-text("Confirm")',
            'button:has-text("Use Connects")',
            'button:has-text("Continue")',
            '.confirm-connects-button',
            '.use-connects-button'
        ];
        
        for (const selector of connectsSelectors) {
            try {
                const button = page.locator(selector).first();
                if (await button.isVisible({ timeout: 3000 })) {
                    console.log(`Found connects confirmation button: ${selector}`);
                    await button.click();
                    await page.waitForTimeout(delayBetweenActions);
                    return;
                }
            } catch (e) {
                continue;
            }
        }
        
        console.log('No connects confirmation dialog found');
    } catch (error) {
        console.error('Error handling connects confirmation:', error);
        // Don't throw error - this is optional
    }
}

async function takeScreenshotOfResult(page) {
    try {
        const screenshot = await page.screenshot({
            fullPage: true,
            type: 'png'
        });
        
        const screenshotPath = `screenshot-${Date.now()}.png`;
        await Actor.setValue(screenshotPath, screenshot);
        
        console.log(`Screenshot saved: ${screenshotPath}`);
        return screenshotPath;
    } catch (error) {
        console.error('Error taking screenshot:', error);
        return '';
    }
}

// Utility function to add delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
