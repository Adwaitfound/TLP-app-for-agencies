-- Create advertisements table for storing ad content
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),
  target_role VARCHAR(50), -- 'client', 'all', etc.
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  position VARCHAR(50) DEFAULT 'top', -- 'top', 'bottom', 'sidebar'
  display_frequency VARCHAR(50) DEFAULT 'always', -- 'always', 'once_per_session', 'once_per_day'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ad analytics table for tracking views and clicks
CREATE TABLE IF NOT EXISTS ad_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_type VARCHAR(50), -- 'view', 'click', 'impression'
  event_data JSONB, -- Can store additional data like timestamp, IP, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON advertisements(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_advertisements_role ON advertisements(target_role);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_ad_id ON ad_analytics(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_client_id ON ad_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_event_type ON ad_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_created_at ON ad_analytics(created_at);

-- Enable RLS on advertisements table
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policy for advertisements - admins can create/manage, all authenticated can view active ads
CREATE POLICY "Admins can manage advertisements" ON advertisements
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM users WHERE role = 'admin'
    )
  );

CREATE POLICY "Authenticated users can view active advertisements" ON advertisements
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );

-- RLS Policy for ad_analytics - only admins can read, app can insert
CREATE POLICY "Only insert ad analytics events" ON ad_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can view ad analytics" ON ad_analytics
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM users WHERE role = 'admin'
    )
  );
