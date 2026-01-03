-- Add metadata and updated_at columns to agency_onboarding_requests table
alter table if exists agency_onboarding_requests add column if not exists metadata jsonb default '{}'::jsonb;
alter table if exists agency_onboarding_requests add column if not exists updated_at timestamptz default now();
