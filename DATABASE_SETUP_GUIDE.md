# 🗄️ Database Setup for Multi-Tenant System

**Date**: January 18, 2026  
**Status**: Ready to configure

---

## Current Architecture

### Original Agency (v1)
- **Tables**: `users`, `clients`, `projects`, `invoices`, `milestones`, etc.
- **Owner**: adwait@thelostproject.in (super_admin role)
- **Data**: All historical data
- **Access**: `/dashboard` (original interface)

### Multi-Tenant SaaS (v2)
- **Tables**: `saas_organizations`, `saas_organization_members`, `saas_projects`, `saas_invoices`, etc.
- **Isolation**: `org_id` based
- **RLS**: Row-level security policies
- **Access**: `/v2/dashboard` (tenant interface)

---

## Setup Steps

### Step 1: Configure Original Admin User ✅

**User**: adwait@thelostproject.in  
**Role**: super_admin (in `users` table)  
**Status**: Controls original agency data

**Verify in Supabase**:
```sql
SELECT id, email, role FROM auth.users WHERE email = 'adwait@thelostproject.in';
SELECT id, email, full_name, role FROM users WHERE email = 'adwait@thelostproject.in';
```

Expected:
- ✅ Auth user exists
- ✅ `users` table entry with `role = 'super_admin'`

---

### Step 2: Enable SaaS Tables 

Run the SaaS core tables migration in Supabase:

**File**: [saas_core_tables.sql](saas_core_tables.sql)

**Steps**:
1. Go to Supabase Dashboard
2. SQL Editor
3. Copy & paste [saas_core_tables.sql](saas_core_tables.sql) content
4. Click "Run" to execute

**Tables Created**:
- ✅ saas_organizations
- ✅ saas_organization_members
- ✅ saas_magic_links
- ✅ saas_organization_usage
- ✅ saas_organization_payments

---

### Step 3: Create Original Agency Record

Run this SQL in Supabase:

```sql
-- Insert the original agency as the first organization
INSERT INTO saas_organizations (name, slug, plan, status)
VALUES (
    'The Lost Project',
    'the-lost-project',
    'premium',  -- Original agency has premium
    'active'
) RETURNING id;

-- Copy the returned ID, use it below as: {org_id}
```

**Result**: Returns the `org_id` - save this!

---

### Step 4: Add Original Admin to Organization

Replace `{org_id}` with the ID from Step 3:

```sql
-- Get adwait's user ID
SELECT id FROM auth.users WHERE email = 'adwait@thelostproject.in';

-- Use the returned user ID as {user_id} below
INSERT INTO saas_organization_members (org_id, user_id, role, status, accepted_at)
VALUES (
    '{org_id}',
    '{user_id}',
    'admin',  -- Admin of their organization
    'active',
    NOW()
);
```

---

### Step 5: Create Tenant Onboarding Record

For your test tenant agency:

```sql
-- Create test tenant organization (NOT YET ACTIVE)
INSERT INTO saas_organizations (name, slug, plan, status)
VALUES (
    'Test Tenant Agency',
    'test-tenant',
    'standard',  -- Start with standard plan
    'trial'      -- Trial status
) RETURNING id;
```

---

## Testing Setup

### Test Scenario 1: Original Owner Access

```bash
# Login as: adwait@thelostproject.in
# Expected behavior:
# ✅ Redirected to /dashboard (via middleware)
# ✅ Sees original agency data
# ✅ Sees all projects, clients, invoices
# ✅ Cannot see SaaS tables directly
```

### Test Scenario 2: Tenant Onboarding

```bash
# Simulate tenant signup:
# 1. Tenant registers (creates auth user)
# 2. System creates saas_organizations record
# 3. Create saas_magic_links for setup
# 4. Tenant clicks magic link
# 5. Completes password setup
# 6. System creates saas_organization_members record
# 7. Redirects to /v2/dashboard
# ✅ Tenant sees only their org data
# ✅ Original agency data not visible
```

---

## Database Schema Summary

### saas_organizations
```
id (UUID, PK)
├─ name: String (org name)
├─ slug: String (URL-friendly, UNIQUE)
├─ plan: 'free' | 'standard' | 'premium'
├─ status: 'active' | 'trial' | 'suspended' | 'cancelled'
├─ razorpay_customer_id: String
├─ payment_status: String
├─ trial_ends_at: TIMESTAMP
├─ subscription_ends_at: TIMESTAMP
├─ settings: JSONB
└─ timestamps: created_at, updated_at, deleted_at
```

### saas_organization_members
```
id (UUID, PK)
├─ org_id (FK → saas_organizations)
├─ user_id (FK → auth.users)
├─ role: 'admin' | 'member' | 'client'
├─ status: 'active' | 'invited' | 'suspended'
├─ invited_at: TIMESTAMP
├─ accepted_at: TIMESTAMP
└─ permissions: JSONB
```

### saas_magic_links
```
id (UUID, PK)
├─ org_id (FK → saas_organizations)
├─ email: String (invited person's email)
├─ token: String (256-bit random, hex-encoded)
├─ purpose: 'setup' | 'invite'
├─ expires_at: TIMESTAMP (24 hours)
└─ used_at: TIMESTAMP
```

### saas_organization_usage
```
id (UUID, PK)
├─ org_id (FK → saas_organizations)
├─ projects_count: Integer
├─ team_members_count: Integer
├─ storage_used_gb: Decimal
└─ updated_at: TIMESTAMP
```

### saas_organization_payments
```
id (UUID, PK)
├─ org_id (FK → saas_organizations)
├─ razorpay_order_id: String (UNIQUE - idempotency)
├─ razorpay_payment_id: String
├─ amount: Decimal
├─ status: 'pending' | 'completed' | 'failed' | 'refunded'
└─ created_at: TIMESTAMP
```

---

## RLS Policies Required

After tables are created, add Row Level Security:

### For saas_organizations
```sql
-- Admins can see their organization
ALTER TABLE saas_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_isolation ON saas_organizations
AS PERMISSIVE FOR SELECT
USING (
  id IN (
    SELECT org_id FROM saas_organization_members
    WHERE user_id = auth.uid()
  )
);
```

### For saas_organization_members
```sql
ALTER TABLE saas_organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY member_isolation ON saas_organization_members
AS PERMISSIVE FOR SELECT
USING (
  org_id IN (
    SELECT org_id FROM saas_organization_members
    WHERE user_id = auth.uid()
  )
);
```

---

## User Journey

### Original Agency Owner (adwait@)

```
User Registration (existing)
  ↓
Auth User Created
  ↓
Users Table Entry (role=super_admin)
  ↓
Login
  ↓
Middleware Check: Is adwait@thelostproject.in?
  ↓
YES → Allow /dashboard
  ↓
Dashboard loaded with original data
  ↓
Data filtered by user_id
  ↓
See only their projects, clients, invoices ✅
```

### Tenant Agency Owner (New)

```
Tenant Registration (via /v2/onboarding)
  ↓
Create Auth User
  ↓
Create saas_organizations record
  ↓
Create saas_magic_links record
  ↓
Send email with magic link
  ↓
Tenant clicks link
  ↓
/v2/setup page opens
  ↓
Tenant sets password
  ↓
Creates saas_organization_members record
  ↓
Auto-login to /v2/dashboard
  ↓
Data filtered by org_id
  ↓
See only their org's data ✅
```

---

## Verification Checklist

### Pre-Deployment
- [ ] SaaS tables created in Supabase
- [ ] Original agency record inserted
- [ ] adwait@thelostproject.in added to organization_members
- [ ] RLS policies enabled
- [ ] Test migration runs without errors

### Post-Deployment
- [ ] adwait@thelostproject.in can login to /dashboard
- [ ] Can see original agency data
- [ ] Test tenant signup flow works
- [ ] Test tenant cannot see original data
- [ ] Middleware redirects properly
- [ ] Database RLS enforces isolation

---

## Database Connection String

**For Local Testing**:
```bash
# .env.local should have:
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

**Verify Connection**:
```bash
# In your app, check console for successful Supabase init
console.log('Supabase initialized:', supabase)
```

---

## Next Steps

1. ✅ Run saas_core_tables.sql in Supabase
2. ✅ Create original agency organization record
3. ✅ Add adwait@thelostproject.in to organization_members
4. ✅ Enable RLS policies
5. ✅ Test original owner access
6. ✅ Create test tenant record
7. ✅ Test tenant onboarding flow
8. ✅ Verify data isolation
9. ✅ Monitor logs for issues

---

## Troubleshooting

### Issue: "Table does not exist"
**Solution**: Run saas_core_tables.sql migration in Supabase SQL editor

### Issue: adwait cannot login to /dashboard
**Solution**: Verify:
- Auth user exists
- Users table entry has role='super_admin'
- Middleware check includes original owner logic

### Issue: Tenant sees original data
**Solution**: Verify:
- RLS policies enabled
- Middleware redirects tenant away from /dashboard
- SaaS queries filter by org_id

### Issue: Magic link doesn't work
**Solution**: Verify:
- saas_magic_links table exists
- Token generated correctly (256-bit random)
- Link not expired (24 hour TTL)
- Email matches token

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    SUPABASE DATABASE                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Original Agency Tables        SaaS Tenant Tables       │
│  ┌──────────────────┐          ┌──────────────────┐    │
│  │ users (v1)       │          │ saas_             │    │
│  │ clients          │          │ organizations    │    │
│  │ projects         │          │ org_members      │    │
│  │ invoices         │          │ projects         │    │
│  │ milestones       │          │ invoices         │    │
│  │ (user_id filter) │          │ (org_id filter)  │    │
│  └──────────────────┘          │ magic_links      │    │
│          ↑                      │ usage            │    │
│          │                      │ payments         │    │
│          │                      └──────────────────┘    │
│  adwait@thelostproject.in              ↑                │
│  (Original Owner)                      │                │
│                                  New Tenant Agencies    │
│                                  (org_id isolation)     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                    RLS POLICIES (per table)             │
│  • Original: user_id = auth.uid()                       │
│  • SaaS: org_id IN (user's organizations)               │
└─────────────────────────────────────────────────────────┘
```

---

**Status**: Ready to implement ✅

See [QUICK_TEST_SETUP.md](QUICK_TEST_SETUP.md) for testing instructions once database is configured.
