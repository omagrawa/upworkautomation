-- Initialize n8n database
-- This script runs when the PostgreSQL container starts for the first time

-- Create additional databases if needed
-- CREATE DATABASE IF NOT EXISTS upwork_automation;

-- Create additional users if needed
-- CREATE USER IF NOT EXISTS upwork_user WITH PASSWORD 'upwork_password';

-- Grant permissions
-- GRANT ALL PRIVILEGES ON DATABASE upwork_automation TO upwork_user;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance
-- These will be created by n8n automatically, but we can pre-create them

-- Log table for tracking automation runs
CREATE TABLE IF NOT EXISTS automation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(50) NOT NULL,
    job_id VARCHAR(100),
    job_title TEXT,
    job_url TEXT,
    score INTEGER,
    status VARCHAR(20),
    error_message TEXT,
    metadata JSONB
);

-- Create index on automation_logs
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON automation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_source ON automation_logs(source);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_job_id ON automation_logs(job_id);

-- Create a view for recent automation activity
CREATE OR REPLACE VIEW recent_automation_activity AS
SELECT 
    source,
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_jobs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
    AVG(score) as average_score,
    MAX(created_at) as last_activity
FROM automation_logs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY source;

-- Grant permissions to n8n user
GRANT ALL PRIVILEGES ON TABLE automation_logs TO n8n;
GRANT ALL PRIVILEGES ON VIEW recent_automation_activity TO n8n;
