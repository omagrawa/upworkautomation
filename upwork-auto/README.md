# 🚀 Upwork Automation Pipeline

A comprehensive automation pipeline for Upwork job scraping, scoring, and auto-submission using Apify actors, n8n workflows, and Google Sheets integration.

## 🏗️ Architecture

```
Apify Scraper → Webhook → n8n Flow → Google Sheets → Apify Submitter
     ↓              ↓         ↓           ↓              ↓
  Job Data    →  Trigger  →  Score   →   Log      →  Auto-Submit
```

## ⚡ Quick Start Checklist

### Prerequisites Setup
- [ ] **Node.js 18+** installed
- [ ] **pnpm** package manager installed
- [ ] **Docker & Docker Compose** installed
- [ ] **Apify account** with API token
- [ ] **OpenAI API key** for AI scoring
- [ ] **Upwork account** with active session
- [ ] **Google Cloud account** (optional, for Sheets)

### Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in `APIFY_TOKEN` from Apify console
- [ ] Fill in `UPWORK_SESSION_COOKIE` from browser
- [ ] Fill in `OPENAI_API_KEY` from OpenAI
- [ ] Set `STORAGE_TARGET` (sheets|postgres)
- [ ] Configure database credentials if using postgres

### Infrastructure Setup
- [ ] Run `pnpm install` to install dependencies
- [ ] Start services: `cd packages/infra && docker compose up -d`
- [ ] Verify n8n accessible at `http://localhost:5678`
- [ ] Verify Adminer accessible at `http://localhost:8080`

### n8n Workflow Setup
- [ ] **MANUAL**: Create n8n account (first-time setup)
- [ ] **MANUAL**: Import workflow from `packages/n8n/upwork_automation_workflow.json`
- [ ] **MANUAL**: Configure OpenAI credentials in n8n
- [ ] **MANUAL**: Configure Google Sheets credentials (if using sheets)
- [ ] Test workflow execution

### Apify Actors Deployment
- [ ] Install Apify CLI: `npm install -g apify-cli`
- [ ] Login to Apify: `apify login`
- [ ] Deploy scraper: `cd packages/apify-scraper && apify push`
- [ ] Deploy submitter: `cd packages/apify-submit && apify push`
- [ ] Update `.env` with actor IDs

### Testing Pipeline
- [ ] Run scraper: `./scripts/run-scrape-once.sh`
- [ ] Fetch results: `./scripts/fetch-dataset.sh`
- [ ] Test submission: `./scripts/trigger-submit.sh <job_url> <proposal>`
- [ ] Verify n8n workflow processes data
- [ ] Check database/sheets for logged results

## 🛠️ Helper Scripts

### `scripts/run-scrape-once.sh`
Starts the Apify scraper with input from `input.json`
```bash
./scripts/run-scrape-once.sh
```

### `scripts/fetch-dataset.sh`
Fetches items from an Apify dataset
```bash
./scripts/fetch-dataset.sh [DATASET_ID]
```

### `scripts/trigger-submit.sh`
Triggers the submitter actor with job data
```bash
./scripts/trigger-submit.sh <JOB_URL> <PROPOSAL_TEXT> [HOURLY_RATE]
```

## 📋 [MANUAL] Tasks Required

### Session Cookie Extraction
1. **MANUAL**: Login to Upwork in browser
2. **MANUAL**: Open Developer Tools (F12)
3. **MANUAL**: Go to Application → Cookies → upwork.com
4. **MANUAL**: Copy all cookie values as `name1=value1; name2=value2; ...`
5. **MANUAL**: Paste into `.env` as `UPWORK_SESSION_COOKIE`

### n8n First-Time Setup
1. **MANUAL**: Access `http://localhost:5678`
2. **MANUAL**: Create admin account
3. **MANUAL**: Complete setup wizard
4. **MANUAL**: Import workflow JSON file
5. **MANUAL**: Configure credentials for each service

### Google Sheets Setup (if using)
1. **MANUAL**: Create Google Cloud Project
2. **MANUAL**: Enable Sheets API
3. **MANUAL**: Create service account
4. **MANUAL**: Download credentials JSON
5. **MANUAL**: Create spreadsheet and share with service account
6. **MANUAL**: Configure n8n with credentials

### Apify Actor Configuration
1. **MANUAL**: Get actor IDs after deployment
2. **MANUAL**: Update `.env` with actor IDs
3. **MANUAL**: Configure webhook URLs in Apify console
4. **MANUAL**: Test actor runs manually

## 📦 Packages

- **`apify-scraper/`** - Upwork job scraping with Playwright + Cheerio
- **`apify-submit/`** - Automated job proposal submission
- **`n8n/`** - Workflow orchestration and job scoring
- **`infra/`** - Docker Compose setup for n8n + Postgres + Adminer
- **`scripts/`** - Helper shell scripts for deployment and maintenance
- **`docs/`** - Documentation and runbooks

## 🔧 Available Scripts

- `pnpm dev` - Start all packages in development mode
- `pnpm build` - Build all packages
- `pnpm fmt` - Format code with Prettier
- `pnpm lint` - Lint and fix code with ESLint
- `pnpm clean` - Clean all build artifacts and dependencies

## 📚 Documentation

- **`README2.md`** - Complete step-by-step setup guide
- **`packages/docs/`** - Detailed documentation and runbooks
- **`packages/n8n/README.md`** - n8n workflow setup
- **`packages/apify-scraper/README.md`** - Scraper configuration
- **`packages/apify-submit/README.md`** - Submitter configuration
- **`packages/infra/README.md`** - Infrastructure setup

## 🚨 Important Notes

- **Session cookies expire** - refresh them periodically
- **Monitor API usage** - OpenAI and Apify have rate limits
- **Test regularly** - ensure all components work together
- **Keep backups** - database and configuration files
- **Update dependencies** - keep packages up to date

## 📄 License

MIT
