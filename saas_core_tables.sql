-- ============================================================================
-- SAAS CORE TABLES - Multi-Tenant Foundation
-- ============================================================================
-- This file creates the core multi-tenant infrastructure with strict RLS
-- All data access is controlled at the database level, never on the frontend

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ORGANIZATIONS TABLE (Tenant Container)
-- ============================================================================
-- One row per agency/organization
CREATE TABLE IF NOT EXISTS saas_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core info from onboarding
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- For subdomains/URLs (lowercase, unique)
    logo_url TEXT, -- Uploaded during onboarding
    website TEXT,
    
    -- Plan & subscription
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'premium')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
    
    -- Payment tracking (Razorpay)
    razorpay_customer_id TEXT UNIQUE, -- Razorpay customer ID
    razorpay_order_id TEXT, -- Latest order ID
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    
    -- Subscription cycle
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_started_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    
    -- Metadata
    notes JSONB DEFAULT '{}'::jsonb, -- Custom data, admin notes
    settings JSONB DEFAULT '{
        "color_scheme": "blue",
        "timezone": "UTC",
        "date_format": "DD-MM-YYYY"
    }'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete for audit trails
);

CREATE INDEX idx_saas_organizations_slug ON saas_organizations(slug);
CREATE INDEX idx_saas_organizations_plan ON saas_organizations(plan);
CREATE INDEX idx_saas_organizations_status ON saas_organizations(status);
CREATE INDEX idx_saas_organizations_razorpay_customer ON saas_organizations(razorpay_customer_id);
CREATE INDEX idx_saas_organizations_created_at ON saas_organizations(created_at DESC);

-- ============================================================================
-- 2. ORGANIZATION MEMBERS TABLE (User → Org + Roles)
-- ============================================================================
-- Maps users to organizations with role-based access
CREATE TABLE IF NOT EXISTS saas_organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    org_id UUID NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role within this organization
    -- admin: Full access, can manage team, billing, settings
    -- member/employee: Can access assigned resources
    -- client: Can only view assigned projects
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'client')),
    
    -- Status: active, invited (awaiting acceptance), suspended
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    
    -- Invitation tracking
    invited_at TIMESTAMP WITH TIME ZONE,
    invited_by UUID REFERENCES auth.users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Permission scope (for future granular permissions)
    permissions JSONB DEFAULT '[]'::jsonb, -- e.g., ["projects:read", "projects:write", "invoices:read"]
    
    -- Metadata
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: One user per org (no duplicates)
    CONSTRAINT unique_user_per_org UNIQUE (org_id, user_id)
);

CREATE INDEX idx_saas_org_members_org_id ON saas_organization_members(org_id);
CREATE INDEX idx_saas_org_members_user_id ON saas_organization_members(user_id);
CREATE INDEX idx_saas_org_members_role ON saas_organization_members(role);
CREATE INDEX idx_saas_org_members_status ON saas_organization_members(status);
CREATE INDEX idx_saas_org_members_org_user ON saas_organization_members(org_id, user_id);

-- ============================================================================
-- 3. MAGIC LINKS TABLE (One-time Setup + Invite Links)
-- ============================================================================
-- For secure onboarding without passwords initially
CREATE TABLE IF NOT EXISTS saas_magic_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link type
    type TEXT NOT NULL CHECK (type IN ('signup', 'password_reset', 'admin_invite')),
    
    -- Who this link is for
    email TEXT NOT NULL,
    org_id UUID REFERENCES saas_organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Link validity
    token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    used_at TIMESTAMP WITH TIME ZONE,
    
    -- Context data
    metadata JSONB DEFAULT '{}'::jsonb, -- e.g., {"role": "admin", "from_user_id": "..."}
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saas_magic_links_token ON saas_magic_links(token);
CREATE INDEX idx_saas_magic_links_email ON saas_magic_links(email);
CREATE INDEX idx_saas_magic_links_org_id ON saas_magic_links(org_id);
CREATE INDEX idx_saas_magic_links_expires_at ON saas_magic_links(expires_at);
CREATE INDEX idx_saas_magic_links_type ON saas_magic_links(type);

-- ============================================================================
-- 4. ORGANIZATION USAGE TRACKING TABLE
-- ============================================================================
-- Track usage metrics for analytics, limits, and analytics
CREATE TABLE IF NOT EXISTS saas_organization_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    org_id UUID NOT NULL REFERENCES saas_organizations(id) ON DELETE CASCADE,
    
    -- Feature usage counts
    projects_count INTEGER DEFAULT 0,
    team_members_count INTEGER DEFAULT 0,
    clients_count INTEGER DEFAULT 0,
    storage_used_bytes BIGINT DEFAULT 0, -- In bytes
    api_calls_this_month INTEGER DEFAULT 0,
    
    -- Plan limits (copied from saas_organizations.plan for quick checks)
    plan TEXT NOT NULL,
    max_team_members INTEGER,
    max_clients INTEGER,
    max_storage_bytes BIGINT,
    
    -- Time period
    period TEXT DEFAULT 'current' CHECK (period IN ('current', 'historical')),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saas_usage_org_id ON saas_organization_usage(org_id);
CREATE INDEX idx_saas_usage_recorded_at ON saas_organization_usage(recorded_at DESC);
CREATE INDEX idx_saas_usage_org_recorded ON saas_organization_usage(org_id, recorded_at DESC);

-- ============================================================================
-- 5. ORGANIZATION PAYMENTS TABLE
-- ============================================================================
-- Track all payment attempts and transactions
CREATE TABLE IF NOT EXISTS saas_organization_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    org_id UUID REFERENCES saas_organizations(id) ON DELETE CASCADE, -- Nullable: payment created before org
    
    -- Plan being paid for
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'standard', 'premium')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    
    -- Amount
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    
    -- Razorpay tracking
    razorpay_order_id TEXT UNIQUE NOT NULL,
    razorpay_payment_id TEXT UNIQUE,
    razorpay_signature TEXT,
    
    -- Payment status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'refunded')),
    
    -- Timeline
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error tracking
    error_message TEXT,
    error_details JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    description TEXT,
    notes JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saas_payments_org_id ON saas_organization_payments(org_id);
CREATE INDEX idx_saas_payments_razorpay_order ON saas_organization_payments(razorpay_order_id);
CREATE INDEX idx_saas_payments_razorpay_payment ON saas_organization_payments(razorpay_payment_id);
CREATE INDEX idx_saas_payments_status ON saas_organization_payments(status);
CREATE INDEX idx_saas_payments_created_at ON saas_organization_payments(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- --- saas_organizations ---
ALTER TABLE saas_organizations ENABLE ROW LEVEL SECURITY;

-- Admins can view/edit their own organization
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

-- Members can view their organization
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

-- --- saas_organization_members ---
ALTER TABLE saas_organization_members ENABLE ROW LEVEL SECURITY;

-- Users can view members in their organization (uses SECURITY DEFINER function to avoid recursion)
CREATE POLICY "View members of own organization" ON saas_organization_members
    FOR SELECT
    USING (is_org_member(org_id));

-- Admins can manage members (uses SECURITY DEFINER function to avoid recursion)
CREATE POLICY "Admins can manage members" ON saas_organization_members
    FOR ALL
    USING (is_org_admin(org_id))
    WITH CHECK (is_org_admin(org_id));

-- Users can view their own membership
CREATE POLICY "View own membership" ON saas_organization_members
    FOR SELECT
    USING (user_id = auth.uid());

-- --- saas_magic_links ---
ALTER TABLE saas_magic_links ENABLE ROW LEVEL SECURITY;

-- Only service role can manage magic links (via API)
CREATE POLICY "Service role only" ON saas_magic_links
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- --- saas_organization_usage ---
ALTER TABLE saas_organization_usage ENABLE ROW LEVEL SECURITY;

-- Members can view usage of their organization
CREATE POLICY "View own organization usage" ON saas_organization_usage
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM saas_organization_members
            WHERE saas_organization_members.org_id = saas_organization_usage.org_id
            AND saas_organization_members.user_id = auth.uid()
            AND saas_organization_members.status = 'active'
        )
    );

-- Only service role can insert/update (via cron or API)
CREATE POLICY "Service role can manage usage" ON saas_organization_usage
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- --- saas_organization_payments ---
ALTER TABLE saas_organization_payments ENABLE ROW LEVEL SECURITY;

-- Admins can view payments for their organization
CREATE POLICY "Admins can view payments" ON saas_organization_payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM saas_organization_members
            WHERE saas_organization_members.org_id = saas_organization_payments.org_id
            AND saas_organization_members.user_id = auth.uid()
            AND saas_organization_members.role = 'admin'
            AND saas_organization_members.status = 'active'
        )
    );

-- Only service role can insert/update payments (via webhook)
CREATE POLICY "Service role manages payments" ON saas_organization_payments
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get current user's organization ID
CREATE OR REPLACE FUNCTION get_current_org_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Get the first active organization membership for current user
    SELECT saas_organization_members.org_id INTO org_id
    FROM saas_organization_members
    WHERE saas_organization_members.user_id = auth.uid()
    AND saas_organization_members.status = 'active'
    LIMIT 1;
    
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to check if user is member of organization (SECURITY DEFINER to bypass RLS)
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

-- Function to check if user is admin of organization (SECURITY DEFINER to bypass RLS)
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

-- Function to get plan feature access
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
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_saas()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saas_organizations_updated_at
    BEFORE UPDATE ON saas_organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_saas();

CREATE TRIGGER trigger_update_saas_org_members_updated_at
    BEFORE UPDATE ON saas_organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_saas();

CREATE TRIGGER trigger_update_saas_usage_updated_at
    BEFORE UPDATE ON saas_organization_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_saas();

CREATE TRIGGER trigger_update_saas_payments_updated_at
    BEFORE UPDATE ON saas_organization_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_saas();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE saas_organizations IS 'Core tenant/organization table. One row per agency.';
COMMENT ON TABLE saas_organization_members IS 'Maps users to organizations with roles. Controls data access.';
COMMENT ON TABLE saas_magic_links IS 'One-time use links for secure onboarding and admin invites.';
COMMENT ON TABLE saas_organization_usage IS 'Tracks usage metrics for analytics and plan enforcement.';
COMMENT ON TABLE saas_organization_payments IS 'Tracks all Razorpay payment transactions per organization.';

COMMENT ON COLUMN saas_organizations.slug IS 'URL-friendly unique identifier for the organization.';
COMMENT ON COLUMN saas_organizations.plan IS 'Pricing tier: free, standard, or premium.';
COMMENT ON COLUMN saas_organization_members.role IS 'admin (full access), member (assigned resources), client (project view-only).';
COMMENT ON COLUMN saas_magic_links.token IS 'Hex-encoded 32-byte random token. Include in URLs sent to users.';
COMMENT ON COLUMN saas_organization_payments.razorpay_order_id IS 'Used as idempotency key for Razorpay. Must be unique.';

-- ============================================================================
-- NOTE FOR IMPLEMENTATION
-- ============================================================================
-- After running this script:
-- 1. Update agency_onboarding_requests to add org_id FK
-- 2. Create payment webhook endpoint at POST /api/v2/payment/verify-webhook
-- 3. Add Razorpay configuration to environment variables
-- 4. Create /app/v2/setup route for magic link password setup
-- 5. Create /app/v2/dashboard for multi-tenant access
-- 6. Add org_id to existing tables (users, clients, projects, etc.) via separate migrations
