-- PostgreSQL Database Initialization Script for Upwork Automation
-- This script creates the required tables and indexes for the n8n workflow

-- Create the main upwork_jobs table
CREATE TABLE IF NOT EXISTS upwork_jobs (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_upwork_jobs_score ON upwork_jobs(score);
CREATE INDEX IF NOT EXISTS idx_upwork_jobs_status ON upwork_jobs(status);
CREATE INDEX IF NOT EXISTS idx_upwork_jobs_submitted_at ON upwork_jobs(submitted_at);
CREATE INDEX IF NOT EXISTS idx_upwork_jobs_payment_verified ON upwork_jobs(payment_verified);

-- Create a view for high-scoring jobs (score >= 70)
CREATE OR REPLACE VIEW high_score_jobs AS
SELECT 
    job_url,
    title,
    score,
    reasons,
    proposal,
    budget,
    proposals_band,
    payment_verified,
    client_spend,
    country,
    status,
    submitted_at
FROM upwork_jobs
WHERE score >= 70
ORDER BY score DESC, submitted_at DESC;

-- Create a view for recent jobs (last 7 days)
CREATE OR REPLACE VIEW recent_jobs AS
SELECT 
    job_url,
    title,
    score,
    reasons,
    proposal,
    budget,
    proposals_band,
    payment_verified,
    client_spend,
    country,
    status,
    submitted_at
FROM upwork_jobs
WHERE submitted_at >= NOW() - INTERVAL '7 days'
ORDER BY submitted_at DESC;

-- Create a function to get job statistics
CREATE OR REPLACE FUNCTION get_job_stats()
RETURNS TABLE (
    total_jobs bigint,
    high_score_jobs bigint,
    submitted_jobs bigint,
    avg_score numeric,
    verified_clients bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE score >= 70) as high_score_jobs,
        COUNT(*) FILTER (WHERE status = 'submitted') as submitted_jobs,
        ROUND(AVG(score), 2) as avg_score,
        COUNT(*) FILTER (WHERE payment_verified = true) as verified_clients
    FROM upwork_jobs;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clean up old jobs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_jobs()
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM upwork_jobs 
    WHERE submitted_at < NOW() - INTERVAL '30 days'
    AND status IN ('failed', 'skipped');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing (optional)
-- Uncomment the following lines if you want to add test data

/*
INSERT INTO upwork_jobs (
    job_url, 
    title, 
    score, 
    reasons, 
    proposal, 
    budget, 
    proposals_band, 
    payment_verified, 
    client_spend, 
    country, 
    status, 
    submitted_at
) VALUES 
(
    'https://www.upwork.com/jobs/~test123',
    'React Developer Needed',
    85,
    'High budget, payment verified, US client, relevant skills',
    'I am a skilled React developer with 5+ years of experience...',
    '$2,500',
    '5-10 proposals',
    true,
    '$10k+ spent',
    'United States',
    'submitted',
    NOW()
),
(
    'https://www.upwork.com/jobs/~test456',
    'Python Automation Script',
    45,
    'Low budget, high competition, unverified client',
    NULL,
    '$300',
    '15-20 proposals',
    false,
    'No spending history',
    'India',
    'skipped',
    NOW()
);
*/

-- Grant permissions to n8n user (adjust username as needed)
-- GRANT ALL PRIVILEGES ON TABLE upwork_jobs TO n8n;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO n8n;
-- GRANT EXECUTE ON FUNCTION get_job_stats() TO n8n;
-- GRANT EXECUTE ON FUNCTION cleanup_old_jobs() TO n8n;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Upwork automation database schema created successfully!';
    RAISE NOTICE 'Tables created: upwork_jobs';
    RAISE NOTICE 'Indexes created: score, status, submitted_at, payment_verified';
    RAISE NOTICE 'Views created: high_score_jobs, recent_jobs';
    RAISE NOTICE 'Functions created: get_job_stats(), cleanup_old_jobs()';
END $$;
