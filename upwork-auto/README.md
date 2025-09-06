# Upwork Automation Pipeline

A comprehensive automation pipeline for Upwork job scraping, scoring, and auto-submission using Apify actors, n8n workflows, and Google Sheets integration.

## Architecture

```
Apify Scraper → Webhook → n8n Flow → Google Sheets → Apify Submitter
     ↓              ↓         ↓           ↓              ↓
  Job Data    →  Trigger  →  Score   →   Log      →  Auto-Submit
```

## Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment:**
   ```bash
   cp env.example .env
   # Edit .env with your credentials
   ```

3. **Start infrastructure:**
   ```bash
   pnpm --filter infra dev
   ```

4. **Deploy n8n workflow:**
   ```bash
   pnpm --filter n8n deploy
   ```

5. **Run the pipeline:**
   ```bash
   pnpm dev
   ```

## Packages

- **`apify-scraper/`** - Upwork job scraping with Playwright + Cheerio
- **`apify-submit/`** - Automated job proposal submission
- **`n8n/`** - Workflow orchestration and job scoring
- **`infra/`** - Docker Compose setup for n8n + Postgres + Adminer
- **`scripts/`** - Helper shell scripts for deployment and maintenance
- **`docs/`** - Documentation and runbooks

## Available Scripts

- `pnpm dev` - Start all packages in development mode
- `pnpm build` - Build all packages
- `pnpm fmt` - Format code with Prettier
- `pnpm lint` - Lint and fix code with ESLint
- `pnpm clean` - Clean all build artifacts and dependencies

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose
- Apify account with API token
- Google Cloud Platform account (for Sheets API)
- Upwork account credentials

## Documentation

See the `docs/` package for detailed setup instructions and operational procedures.

## License

MIT
