# Advertising System - Setup Instructions

## Step 1: Create Ads Tables in Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor** → Click **New Query**
4. Copy and paste this entire SQL:

```sql
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

-- Optional: Ad targets table for per-client targeting
CREATE TABLE IF NOT EXISTS ad_targets (
  ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (ad_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_targets_ad ON ad_targets(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_targets_client ON ad_targets(client_id);

-- Enable RLS on advertisements table
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_targets ENABLE ROW LEVEL SECURITY;

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

-- RLS Policies for ad_targets - only admins manage
CREATE POLICY "Admins manage ad targets" ON ad_targets
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM users WHERE role = 'admin'
    )
  ) WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM users WHERE role = 'admin'
    )
  );

-- Read-only for authenticated users to allow client-side filtering
CREATE POLICY "Authenticated can read ad targets" ON ad_targets
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policy for ad_analytics - only insert, admins can read
CREATE POLICY "Only insert ad analytics events" ON ad_analytics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins can view ad analytics" ON ad_analytics
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM users WHERE role = 'admin'
    )
  );
```

5. Click **Run** (or Cmd+Enter)
6. Wait for "Success" message

## Step 2: Verify Client Records Exist

The error "[1/6] No client record found for user" means the logged-in user doesn't have a client profile.

**Option A: Create Client Record in Database**

1. In Supabase, go to **Table Editor**
2. Find the `clients` table
3. Click **Insert row** and add:
   - `user_id`: (the user's ID from users table - usually 21d53f2d-0c24-4a3c-a4d1-fdc99381639c)
   - `company_name`: "Your Company Name"
   - `email`: (the user's email)
   - `status`: "active"

**Option B: Check if Client Record Already Exists**

1. Go to Supabase **Table Editor** → `clients` table
2. Search for the user ID: `21d53f2d-0c24-4a3c-a4d1-fdc99381639c`
3. If not found, create it using Option A above

## Step 3: Test the Advertising System

### Admin: Create an Ad

1. Log in as admin
2. Go to `/dashboard/advertisements`
3. Click **New Advertisement**
4. Fill in:
   - **Title**: "Test Ad"
   - **Description**: "This is a test advertisement"
   - **Image URL**: `https://via.placeholder.com/300x200`
   - **CTA Text**: "Learn More"
   - **CTA URL**: `https://example.com`
   - **Position**: "top"
   - **Target Role**: "client"
   - **Is Active**: ON
5. Click **Create Advertisement**
6. You should see it appear in the list with "0 views" and "0 clicks"

### Client: See the Ad

1. Log out and log in as the client (swatishelgikar@gmail.com)
2. Go to `/dashboard/client`
3. You should see the ad at the top of the page as a blue banner
4. Click the ad button to increment clicks in analytics
5. Close/dismiss the ad

### Admin: Check Analytics

1. Log back in as admin
2. Go to `/dashboard/ad-analytics`
3. Select your ad from the dropdown
4. See:
   - **Total Views**: 1+ (you viewed it)
   - **Total Clicks**: 1+ (if you clicked it)
   - **Unique Clients**: 1 (the client company)
   - **Detailed Events**: Shows each view/click with client name and timestamp

## Troubleshooting

### "Module not found: Can't resolve '@/lib/supabase/client'"

- ✅ Already fixed in code - just refresh the page

### Ad doesn't appear on client dashboard

- Check that ads table exists (Step 1)
- Check that an ad is marked `is_active = true` (Step 3)
- Check browser console for errors
- Refresh page with Cmd+Shift+R (hard refresh)

### "Error fetching ad: {}"

- The ads table doesn't exist yet
- Run the SQL migration in Step 1

### "[1/6] No client record found for user"

- The user doesn't have a client profile
- Create one in Step 2, Option A

### Analytics not showing up

- Make sure you're logged in as admin
- Go to `/dashboard/ad-analytics` (not `/dashboard/advertisements`)
- Select the ad from the dropdown
- Click on a row in the events table to see details

## File Locations

- **Ad Manager**: `/dashboard/advertisements`
- **Ad Analytics**: `/dashboard/ad-analytics`
- **Client Sees Ads Here**: `/dashboard/client`
- **Ad Display Component**: `components/client/ad-display.tsx`
- **Database Setup**: Run the SQL migration in Supabase
