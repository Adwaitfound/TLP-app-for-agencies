-- Enhanced Ad Analytics Schema
-- Adds detailed tracking fields for comprehensive analytics

-- Add new tracking columns to ad_analytics
ALTER TABLE ad_analytics 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45),
  ADD COLUMN IF NOT EXISTS referrer TEXT,
  ADD COLUMN IF NOT EXISTS device_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS browser VARCHAR(100),
  ADD COLUMN IF NOT EXISTS os VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ad_analytics_user_id ON ad_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_session_id ON ad_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_device_type ON ad_analytics(device_type);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_country ON ad_analytics(country);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_event_created ON ad_analytics(event_type, created_at);

-- Update RLS policies to include super_admin
DROP POLICY IF EXISTS "Only admins can view ad analytics" ON ad_analytics;
CREATE POLICY "Admins and super_admins can view ad analytics" ON ad_analytics
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins can manage advertisements" ON advertisements;
CREATE POLICY "Admins and super_admins can manage advertisements" ON advertisements
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'super_admin')
    )
  ) WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Admins manage ad targets" ON ad_targets;
CREATE POLICY "Admins and super_admins manage ad targets" ON ad_targets
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'super_admin')
    )
  ) WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'super_admin')
    )
  );
