-- Add missing columns to calendar_events table
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS media_type text check (media_type in ('static','video','carousel','reel','story')),
ADD COLUMN IF NOT EXISTS format_type text check (format_type in ('reel','story','post','carousel','static','video')),
ADD COLUMN IF NOT EXISTS drive_link text,
ADD COLUMN IF NOT EXISTS caption text;

-- Update platform check constraint to include all platforms
ALTER TABLE public.calendar_events 
DROP CONSTRAINT IF EXISTS calendar_events_platform_check;

ALTER TABLE public.calendar_events
ADD CONSTRAINT calendar_events_platform_check 
CHECK (platform in ('instagram','facebook','youtube','linkedin','twitter','tiktok'));
