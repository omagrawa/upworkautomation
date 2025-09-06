# Database Schemas

This document describes the database schemas used by the Upwork automation workflow for both Google Sheets and PostgreSQL storage options.

## Google Sheets Schema

The Google Sheets spreadsheet uses the following column structure for the `upwork_automation_log` sheet:

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `timestamp` | DateTime | When the job was processed | 2024-01-01T12:00:00Z |
| `jobUrl` | String | Unique job URL (primary key) | https://www.upwork.com/jobs/~abc123 |
| `title` | String | Job title | React Developer Needed |
| `score` | Integer | AI-generated score (0-100) | 85 |
| `reasons` | String | AI reasoning for the score | High budget, payment verified, US client |
| `proposal` | String | Generated proposal text | Generated proposal content... |
| `budget` | String | Job budget information | $2,500 |
| `proposals_band` | String | Proposal count band | 5-10 proposals |
| `payment_verified` | Boolean | Client payment verification | TRUE |
| `client_spend` | String | Client spending history | $10k+ spent |
| `country` | String | Client country | United States |
| `status` | String | Processing status | scored, submitted, failed |
| `submitted_at` | DateTime | When proposal was submitted | 2024-01-01T12:05:00Z |

### Google Sheets Setup
- **Sheet Name**: `upwork_automation_log`
- **Headers**: Row 1 should contain the column names above
- **Data Types**: Google Sheets will auto-detect types, but ensure consistent formatting
- **Unique Constraint**: `jobUrl` should be unique (handled by upsert operations)

## PostgreSQL Schema

The PostgreSQL database uses the following table structure:

```sql
CREATE TABLE upwork_jobs (
    job_url text PRIMARY KEY,
    title text,
    score int,
    reasons text,
    proposal text,
    budget text,
    proposals_band text,
    payment_verified boolean,
    client_spend text,
    country text,
    status text DEFAULT 'new',
    submitted_at timestamptz
);
```

### PostgreSQL Table Details

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `job_url` | text | PRIMARY KEY | Unique job URL identifier |
| `title` | text | | Job title |
| `score` | int | | AI-generated score (0-100) |
| `reasons` | text | | AI reasoning for the score |
| `proposal` | text | | Generated proposal text |
| `budget` | text | | Job budget information |
| `proposals_band` | text | | Proposal count band (e.g., "5-10 proposals") |
| `payment_verified` | boolean | | Client payment verification status |
| `client_spend` | text | | Client spending history |
| `country` | text | | Client country |
| `status` | text | DEFAULT 'new' | Processing status |
| `submitted_at` | timestamptz | | When proposal was submitted |

### PostgreSQL Indexes

For better performance, consider adding these indexes:

```sql
-- Index on score for filtering high-scoring jobs
CREATE INDEX idx_upwork_jobs_score ON upwork_jobs(score);

-- Index on status for filtering by processing status
CREATE INDEX idx_upwork_jobs_status ON upwork_jobs(status);

-- Index on submitted_at for time-based queries
CREATE INDEX idx_upwork_jobs_submitted_at ON upwork_jobs(submitted_at);

-- Index on payment_verified for filtering verified clients
CREATE INDEX idx_upwork_jobs_payment_verified ON upwork_jobs(payment_verified);
```

## Data Flow

### 1. Job Processing
1. **Job scraped** from Upwork
2. **Data merged** from list and detail pages
3. **Stored** in initial storage (PostgreSQL or Google Sheets)

### 2. AI Scoring
1. **Job scored** by OpenAI (0-100)
2. **Score and reasons** added to record
3. **Status updated** to 'scored'

### 3. Proposal Generation
1. **High-scoring jobs** (≥70) get proposals generated
2. **Proposal text** added to record
3. **Status updated** to 'proposal_generated'

### 4. Submission (Optional)
1. **Auto-submission** triggered if enabled
2. **Submission timestamp** recorded
3. **Status updated** to 'submitted' or 'failed'

## Status Values

The `status` field can have the following values:

- `new` - Job just scraped, not yet processed
- `scored` - Job has been scored by AI
- `proposal_generated` - Proposal has been generated
- `submitted` - Proposal has been submitted to Upwork
- `failed` - Processing or submission failed
- `skipped` - Job was skipped (low score, etc.)

## Data Validation

### Google Sheets Validation
- **jobUrl**: Must be a valid URL format
- **score**: Must be integer between 0-100
- **payment_verified**: Must be TRUE/FALSE
- **timestamp/submitted_at**: Must be valid datetime format

### PostgreSQL Validation
- **job_url**: Must be unique (enforced by PRIMARY KEY)
- **score**: Must be integer between 0-100
- **payment_verified**: Must be boolean
- **status**: Should be one of the defined status values

## Backup and Recovery

### Google Sheets
- **Automatic backups**: Google Sheets has built-in version history
- **Export**: Can export to CSV/Excel for backup
- **Sharing**: Can share with team members for collaboration

### PostgreSQL
- **pg_dump**: Use PostgreSQL dump for backups
- **Point-in-time recovery**: Configure WAL archiving for PITR
- **Replication**: Set up read replicas for high availability

## Performance Considerations

### Google Sheets
- **Row limits**: Google Sheets has a limit of ~10M cells
- **API quotas**: Google Sheets API has rate limits
- **Concurrent access**: Multiple users can access simultaneously

### PostgreSQL
- **Indexing**: Add indexes on frequently queried columns
- **Partitioning**: Consider partitioning by date for large datasets
- **Connection pooling**: Use connection pooling for high concurrency

## Migration Between Storage Types

### From Google Sheets to PostgreSQL
1. Export Google Sheets data to CSV
2. Import CSV into PostgreSQL using COPY command
3. Update n8n workflow to use PostgreSQL storage

### From PostgreSQL to Google Sheets
1. Export PostgreSQL data to CSV using COPY command
2. Import CSV into Google Sheets
3. Update n8n workflow to use Google Sheets storage

## Monitoring and Maintenance

### Google Sheets
- **Monitor API usage**: Check Google Cloud Console for quota usage
- **Review data quality**: Regularly check for data inconsistencies
- **Clean up old data**: Archive or delete old records as needed

### PostgreSQL
- **Monitor performance**: Use pg_stat_statements for query analysis
- **Vacuum and analyze**: Regular maintenance for optimal performance
- **Monitor disk usage**: Ensure adequate storage space

## Security Considerations

### Google Sheets
- **Access control**: Use service accounts with minimal permissions
- **API keys**: Rotate API keys regularly
- **Data encryption**: Google Sheets encrypts data at rest and in transit

### PostgreSQL
- **Authentication**: Use strong passwords and consider certificate auth
- **Network security**: Restrict database access to authorized networks
- **Encryption**: Enable SSL/TLS for connections
- **Backup encryption**: Encrypt database backups
