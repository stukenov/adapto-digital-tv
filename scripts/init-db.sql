-- ADAPTO Database Initialization Script
-- This script is run when the PostgreSQL container starts for the first time

-- Create additional databases for different environments
CREATE DATABASE adapto_test;
CREATE DATABASE adapto_dev;

-- Create additional user for read-only access
CREATE USER adapto_readonly WITH PASSWORD 'readonly123';

-- Grant permissions
GRANT CONNECT ON DATABASE adapto TO adapto_readonly;
GRANT CONNECT ON DATABASE adapto_test TO adapto_readonly;
GRANT CONNECT ON DATABASE adapto_dev TO adapto_readonly;

-- Connect to main database and set up schema
\c adapto;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO adapto_readonly;

-- Grant select on all existing tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO adapto_readonly;

-- Grant select on all future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO adapto_readonly;

-- Create extension for UUID generation (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extension for full-text search (if needed)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Insert initial data (if any)
-- INSERT INTO your_table (column1, column2) VALUES ('value1', 'value2');

COMMIT;