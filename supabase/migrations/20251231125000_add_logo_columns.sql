-- Add logo_url column to agencies table
alter table if exists agencies add column if not exists logo_url text;

-- Add logo_url column to agency_onboarding_requests table
alter table if exists agency_onboarding_requests add column if not exists logo_url text;

-- Create agency-logos storage bucket (if it doesn't exist)
-- Note: Storage buckets must be created via the Supabase dashboard or via direct INSERT
-- This is a comment reminder that the bucket should exist
