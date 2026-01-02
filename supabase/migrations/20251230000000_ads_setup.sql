-- Advertising system schema
CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  cta_text VARCHAR(100),
  cta_url VARCHAR(500),
  target_role VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  position VARCHAR(50) DEFAULT 'top',
  display_frequency VARCHAR(50) DEFAULT 'always',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  event_type VARCHAR(50),
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure client_id exists on ad_analytics for older projects
ALTER TABLE ad_analytics
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Backfill missing columns on ad_analytics if the table existed previously
ALTER TABLE ad_analytics
  ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);
ALTER TABLE ad_analytics
  ADD COLUMN IF NOT EXISTS event_data JSONB;
ALTER TABLE ad_analytics
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Per-client targets
CREATE TABLE IF NOT EXISTS ad_targets (
  ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (ad_id, client_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_advertisements_active ON advertisements(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_advertisements_role ON advertisements(target_role);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_ad_id ON ad_analytics(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_client_id ON ad_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_event_type ON ad_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_created_at ON ad_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_targets_ad ON ad_targets(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_targets_client ON ad_targets(client_id);

-- RLS
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_targets ENABLE ROW LEVEL SECURITY;

-- Admins manage advertisements
DO $$ BEGIN
  CREATE POLICY "Admins can manage advertisements" ON advertisements
    FOR ALL USING (
      auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    ) WITH CHECK (
      auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Authenticated can view advertisements
DO $$ BEGIN
  CREATE POLICY "Authenticated users can view active advertisements" ON advertisements
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ad_analytics policies
DO $$ BEGIN
  CREATE POLICY "Only insert ad analytics events" ON ad_analytics
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Only admins can view ad analytics" ON ad_analytics
    FOR SELECT USING (
      auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ad_targets policies
DO $$ BEGIN
  CREATE POLICY "Admins manage ad targets" ON ad_targets
    FOR ALL USING (
      auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    ) WITH CHECK (
      auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can read ad targets" ON ad_targets
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
