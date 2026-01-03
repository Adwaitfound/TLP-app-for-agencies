-- Add agency subscription tiers
CREATE TYPE agency_tier AS ENUM ('standard', 'premium');
ALTER TYPE agency_tier OWNER TO postgres;

-- Add tier info to agencies table
ALTER TABLE agencies ADD COLUMN tier agency_tier DEFAULT 'standard';
ALTER TABLE agencies ADD COLUMN employee_seats INT DEFAULT 2;
ALTER TABLE agencies ADD COLUMN client_seats INT DEFAULT 2;
ALTER TABLE agencies ADD COLUMN admin_seats INT DEFAULT 1;
ALTER TABLE agencies ADD COLUMN additional_employees INT DEFAULT 0;
ALTER TABLE agencies ADD COLUMN additional_clients INT DEFAULT 0;

-- Create subscription tracking
CREATE TABLE agency_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  tier agency_tier NOT NULL DEFAULT 'standard',
  status TEXT DEFAULT 'active', -- active, trialing, past_due, canceled
  stripe_subscription_id TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agency_subscriptions_agency_id ON agency_subscriptions(agency_id);
CREATE INDEX idx_agency_subscriptions_stripe_id ON agency_subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE agency_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see subscription of their agency"
  ON agency_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agencies
      WHERE agencies.id = agency_subscriptions.agency_id
      AND agencies.id IN (
        SELECT agency_id FROM user_memberships
        WHERE user_id = auth.uid()
      )
    )
  );

-- Add tier info to user_memberships
ALTER TABLE user_memberships ADD COLUMN role TEXT DEFAULT 'employee'; -- admin, employee, client

-- Constraints for seat limits
CREATE FUNCTION check_seat_limits() RETURNS TRIGGER AS $$
BEGIN
  DECLARE
    agency_record RECORD;
    employee_count INT;
    client_count INT;
    admin_count INT;
  BEGIN
    SELECT * INTO agency_record FROM agencies WHERE id = NEW.agency_id;
    
    IF NEW.role = 'employee' THEN
      SELECT COUNT(*) INTO employee_count FROM user_memberships 
      WHERE agency_id = NEW.agency_id AND role = 'employee';
      
      IF employee_count >= (agency_record.employee_seats + agency_record.additional_employees) THEN
        RAISE EXCEPTION 'Employee seat limit reached for this agency';
      END IF;
    ELSIF NEW.role = 'client' THEN
      SELECT COUNT(*) INTO client_count FROM user_memberships 
      WHERE agency_id = NEW.agency_id AND role = 'client';
      
      IF client_count >= (agency_record.client_seats + agency_record.additional_clients) THEN
        RAISE EXCEPTION 'Client seat limit reached for this agency';
      END IF;
    ELSIF NEW.role = 'admin' THEN
      SELECT COUNT(*) INTO admin_count FROM user_memberships 
      WHERE agency_id = NEW.agency_id AND role = 'admin';
      
      IF admin_count >= agency_record.admin_seats THEN
        RAISE EXCEPTION 'Admin seat limit reached for this agency';
      END IF;
    END IF;
    
    RETURN NEW;
  END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_seat_limits
BEFORE INSERT ON user_memberships
FOR EACH ROW
EXECUTE FUNCTION check_seat_limits();

-- Update agency_onboarding_requests to include tier
ALTER TABLE agency_onboarding_requests ADD COLUMN tier agency_tier DEFAULT 'standard';
