-- =====================================================
-- ENHANCE CONTENT CALENDAR FOR SOCIAL MEDIA
-- Add caption, media_type, drive_link, format fields
-- =====================================================

-- Add new columns to calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT CHECK (media_type IN ('static', 'video', 'carousel', 'reel', 'story')),
  ADD COLUMN IF NOT EXISTS drive_link TEXT,
  ADD COLUMN IF NOT EXISTS format_type TEXT CHECK (format_type IN ('reel', 'story', 'post', 'carousel', 'static', 'video'));

-- Add index for filtering by media_type and format_type
CREATE INDEX IF NOT EXISTS idx_calendar_events_media_type ON public.calendar_events(media_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_format_type ON public.calendar_events(format_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_project_date ON public.calendar_events(project_id, event_date DESC);

-- Add comment for documentation
COMMENT ON COLUMN public.calendar_events.caption IS 'Full caption/copy for the social media post';
COMMENT ON COLUMN public.calendar_events.media_type IS 'Type of media content: static, video, carousel, reel, story';
COMMENT ON COLUMN public.calendar_events.drive_link IS 'Google Drive or external link to media files';
COMMENT ON COLUMN public.calendar_events.format_type IS 'Content format for platform: reel, story, post, carousel, static, video';

-- Migrate existing content_type to format_type if needed
UPDATE public.calendar_events
SET format_type = content_type
WHERE format_type IS NULL AND content_type IS NOT NULL;
