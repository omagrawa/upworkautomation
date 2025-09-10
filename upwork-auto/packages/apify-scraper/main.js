// main.js
import { Actor, log } from 'apify';
import { PuppeteerCrawler } from '@crawlee/puppeteer';

await Actor.init();

// Use residential proxies if you have them; Upwork is strict.
const proxyConfiguration = await Actor.createProxyConfiguration({
  groups: ['RESIDENTIAL'], // remove if you only have DC proxies
  // countryCode: 'US',
});

const crawler = new PuppeteerCrawler({
  proxyConfiguration,
  maxConcurrency: 2,
  requestHandlerTimeoutSecs: 120,

  // Realistic fingerprints help reduce 403s
  browserPoolOptions: {
    useFingerprints: true,
    fingerprintOptions: {
      fingerprintGeneratorOptions: {
        browsers: [{ name: 'chrome', minVersion: 120 }],
        operatingSystems: ['windows', 'macos'],
        locales: ['en-US'],
        devices: ['desktop'],
      },
      useFingerprintPerProxyCache: true,
    },
  },

  launchContext: {
    launchOptions: {
      headless: true,
       executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },

  useSessionPool: true,
  sessionPoolOptions: { maxPoolSize: 20, sessionOptions: { maxUsageCount: 40 } },

  // Hooks MUST be arrays
  preNavigationHooks: [
    async ({ page }, gotoOptions) => {
      // Optional: inject a valid logged-in Upwork cookie stored as raw "a=b; c=d" in KV store
      // const rawCookie = (await Actor.getValue('UPWORK_COOKIE'))?.toString();
      // if (rawCookie) {
      //   const cookies = rawCookie.split(';').map((c) => {
      //     const [name, ...rest] = c.trim().split('=');
      //     return { name, value: rest.join('='), domain: '.upwork.com', path: '/' };
      //   });
      //   await page.setCookie(...cookies);
      // }

      await page.setViewport({ width: 1366, height: 768 });
      gotoOptions.waitUntil = 'networkidle0';
    },
  ],

  async requestHandler({ page, request, session }) {
    // Let SPA render
    await page.waitForTimeout(2000);

    const html = await page.content();
    if (/access denied|forbidden|verify you|captcha/i.test(html)) {
      log.warning(`Bot challenge on ${request.url} → retiring session`);
      session.retire();
      throw new Error('Bot challenge detected');
    }

    // Extract job tiles from rendered DOM
    const jobs = await page.$$eval(
      '[data-test="job-tile-list"] [data-test="job-tile"]',
      (cards) =>
        cards.map((card) => {
          const a = card.querySelector('a[data-test="job-title-link"]');
          const title = a?.textContent?.trim() || '';
          const url = a?.href || '';
          const desc = card.querySelector('[data-test="job-description-text"]')?.textContent?.trim() || '';
          const posted = card.querySelector('[data-test="posted-on"]')?.textContent?.trim() || '';
          const jobType = card.querySelector('[data-test="job-type"]')?.textContent?.trim() || '';
          return { title, url, desc, posted, jobType };
        })
    );

    if (!jobs.length) log.warning(`No jobs found on ${request.url}`);
    else {
      await Actor.pushData(jobs.map(j => ({ ...j, source: request.url })));
      log.info(`Pushed ${jobs.length} jobs from ${request.url}`);
    }

    // Politeness
    await page.waitForTimeout(1000 + Math.floor(Math.random() * 1000));
  },

  async failedRequestHandler({ request, session, error }) {
    log.error(`Failed ${request.url}: ${error?.message}`);
    session?.retire();
  },
});

// Seed a public search page (avoid JSON/XHR endpoints directly)
await crawler.run([
  { url: 'https://www.upwork.com/nx/search/jobs/?q=react%20developer&sort=recency' },
]);

await Actor.exit();
