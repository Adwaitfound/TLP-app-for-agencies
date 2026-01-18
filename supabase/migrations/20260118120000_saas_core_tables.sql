-- ============================================================================
-- SAAS CORE TABLES - Multi-Tenant Foundation (migration)
-- Source: saas_core_tables.sql
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS saas_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    website TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'premium')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
    razorpay_customer_id TEXT UNIQUE,
    razorpay_order_id TEXT,
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_started_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    notes JSONB DEFAULT '{}'::jsonb,
    settings JSONB DEFAULT '{
        "color_scheme": "blue",
        "timezone": "UTC",
        "date_format": "DD-MM-YYYY"
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_saas_organizations_slug ON saas_organizations(slug);
CREATE INDEX IF NOT EXISTS idx_saas_organizations_plan ON saas_organizations(plan);
CREATE INDEX IF NOT EXISTS idx_saas_organizations_status ON saas_organizations(status);
CREATE INDEX IF NOT EXISTS idx_saas_organizations_razorpay_customer ON saas_organizations(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_saas_organizations_created_at ON saas_organizations(created_at DESC);

-- 2. ORGANIZATION MEMBERS TABLE
CREATE TABLE IF NOT EXISTS saas_organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'client')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    invited_at TIMESTAMP WITH TIME ZONE,
    invited_by UUID REFERENCES auth.users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    permissions JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_user_per_org UNIQUE (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_saas_org_members_org_id ON saas_organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_saas_org_members_user_id ON saas_organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_saas_org_members_role ON saas_organization_members(role);
CREATE INDEX IF NOT EXISTS idx_saas_org_members_status ON saas_organization_members(status);
CREATE INDEX IF NOT EXISTS idx_saas_org_members_org_user ON saas_organization_members(org_id, user_id);

-- 3. MAGIC LINKS TABLE
CREATE TABLE IF NOT EXISTS saas_magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('signup', 'password_reset', 'admin_invite')),
    email TEXT NOT NULL,
    org_id UUID REFERENCES saas_organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_magic_links_token ON saas_magic_links(token);
CREATE INDEX IF NOT EXISTS idx_saas_magic_links_email ON saas_magic_links(email);
CREATE INDEX IF NOT EXISTS idx_saas_magic_links_org_id ON saas_magic_links(org_id);
CREATE INDEX IF NOT EXISTS idx_saas_magic_links_expires_at ON saas_magic_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_saas_magic_links_type ON saas_magic_links(type);

-- 4. ORGANIZATION USAGE TABLE
CREATE TABLE IF NOT EXISTS saas_organization_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
    projects_count INTEGER DEFAULT 0,
    team_members_count INTEGER DEFAULT 0,
    clients_count INTEGER DEFAULT 0,
    storage_used_bytes BIGINT DEFAULT 0,
    api_calls_this_month INTEGER DEFAULT 0,
    plan TEXT NOT NULL,
    max_team_members INTEGER,
    max_clients INTEGER,
    max_storage_bytes BIGINT,
    period TEXT DEFAULT 'current' CHECK (period IN ('current', 'historical')),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_usage_org_id ON saas_organization_usage(org_id);
CREATE INDEX IF NOT EXISTS idx_saas_usage_recorded_at ON saas_organization_usage(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_usage_org_recorded ON saas_organization_usage(org_id, recorded_at DESC);

-- 5. ORGANIZATION PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS saas_organization_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES saas_organizations(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'standard', 'premium')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')),
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    error_details JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    notes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saas_payments_org_id ON saas_organization_payments(org_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_razorpay_order ON saas_organization_payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_razorpay_payment ON saas_organization_payments(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_saas_payments_status ON saas_organization_payments(status);
CREATE INDEX IF NOT EXISTS idx_saas_payments_created_at ON saas_organization_payments(created_at DESC);

-- RLS POLICIES
ALTER TABLE saas_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view own organization" ON saas_organizations;
CREATE POLICY "Admins can view own organization" ON saas_organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM saas_organization_members
            WHERE saas_organization_members.org_id = saas_organizations.id
            AND saas_organization_members.user_id = auth.uid()
            AND saas_organization_members.role = 'admin'
            AND saas_organization_members.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Admins can update own organization" ON saas_organizations;
CREATE POLICY "Admins can update own organization" ON saas_organizations
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM saas_organization_members
            WHERE saas_organization_members.org_id = saas_organizations.id
            AND saas_organization_members.user_id = auth.uid()
            AND saas_organization_members.role = 'admin'
            AND saas_organization_members.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM saas_organization_members
            WHERE saas_organization_members.org_id = saas_organizations.id
            AND saas_organization_members.user_id = auth.uid()
            AND saas_organization_members.role = 'admin'
            AND saas_organization_members.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Members can view own organization" ON saas_organizations;
CREATE POLICY "Members can view own organization" ON saas_organizations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM saas_organization_members
            WHERE saas_organization_members.org_id = saas_organizations.id
            AND saas_organization_members.user_id = auth.uid()
            AND saas_organization_members.status = 'active'
        )
    );

ALTER TABLE saas_organization_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_org_member(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM saas_organization_members
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_org_admin(check_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM saas_organization_members
        WHERE org_id = check_org_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "View members of own organization" ON saas_organization_members;
CREATE POLICY "View members of own organization" ON saas_organization_members
    FOR SELECT USING (is_org_member(org_id));

DROP POLICY IF EXISTS "Admins can manage members" ON saas_organization_members;
CREATE POLICY "Admins can manage members" ON saas_organization_members
    FOR ALL USING (is_org_admin(org_id)) WITH CHECK (is_org_admin(org_id));

DROP POLICY IF EXISTS "View own membership" ON saas_organization_members;
CREATE POLICY "View own membership" ON saas_organization_members
    FOR SELECT USING (user_id = auth.uid());

ALTER TABLE saas_magic_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only" ON saas_magic_links;
CREATE POLICY "Service role only" ON saas_magic_links
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE saas_organization_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own organization usage" ON saas_organization_usage;
CREATE POLICY "View own organization usage" ON saas_organization_usage
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM saas_organization_members
            WHERE saas_organization_members.org_id = saas_organization_usage.org_id
            AND saas_organization_members.user_id = auth.uid()
            AND saas_organization_members.status = 'active'
        )
    );
DROP POLICY IF EXISTS "Service role can manage usage" ON saas_organization_usage;
CREATE POLICY "Service role can manage usage" ON saas_organization_usage
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

ALTER TABLE saas_organization_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view payments" ON saas_organization_payments;
CREATE POLICY "Admins can view payments" ON saas_organization_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM saas_organization_members
            WHERE saas_organization_members.org_id = saas_organization_payments.org_id
            AND saas_organization_members.user_id = auth.uid()
            AND saas_organization_members.role = 'admin'
            AND saas_organization_members.status = 'active'
        )
    );
DROP POLICY IF EXISTS "Service role manages payments" ON saas_organization_payments;
CREATE POLICY "Service role manages payments" ON saas_organization_payments
    FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Utility functions
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS UUID AS $$
DECLARE org_id UUID; BEGIN
    SELECT saas_organization_members.org_id INTO org_id
    FROM saas_organization_members
    WHERE saas_organization_members.user_id = auth.uid()
      AND saas_organization_members.status = 'active'
    LIMIT 1;
    RETURN org_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_plan_features(plan_name TEXT)
RETURNS TABLE (
    plan TEXT,
    max_team_members INTEGER,
    max_clients INTEGER,
    max_storage_gb DECIMAL,
    has_payments BOOLEAN,
    has_vendors BOOLEAN,
    has_invoices BOOLEAN,
    has_analytics BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        plan_name,
        CASE 
            WHEN plan_name = 'free' THEN 2
            WHEN plan_name = 'standard' THEN 5
            WHEN plan_name = 'premium' THEN 20
            ELSE 1
        END,
        CASE 
            WHEN plan_name = 'free' THEN 2
            WHEN plan_name = 'standard' THEN 10
            WHEN plan_name = 'premium' THEN 100
            ELSE 1
        END,
        CASE 
            WHEN plan_name = 'free' THEN 5::DECIMAL
            WHEN plan_name = 'standard' THEN 50::DECIMAL
            WHEN plan_name = 'premium' THEN 500::DECIMAL
            ELSE 1::DECIMAL
        END,
        plan_name IN ('standard', 'premium'),
        plan_name IN ('premium'),
        plan_name IN ('standard', 'premium'),
        plan_name IN ('premium');
END; $$ LANGUAGE plpgsql IMMUTABLE;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_saas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_saas_organizations_updated_at ON saas_organizations;
CREATE TRIGGER trigger_update_saas_organizations_updated_at
    BEFORE UPDATE ON saas_organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_saas();

DROP TRIGGER IF EXISTS trigger_update_saas_org_members_updated_at ON saas_organization_members;
CREATE TRIGGER trigger_update_saas_org_members_updated_at
    BEFORE UPDATE ON saas_organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_saas();

DROP TRIGGER IF EXISTS trigger_update_saas_usage_updated_at ON saas_organization_usage;
CREATE TRIGGER trigger_update_saas_usage_updated_at
    BEFORE UPDATE ON saas_organization_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_saas();

DROP TRIGGER IF EXISTS trigger_update_saas_payments_updated_at ON saas_organization_payments;
CREATE TRIGGER trigger_update_saas_payments_updated_at
    BEFORE UPDATE ON saas_organization_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_saas();
