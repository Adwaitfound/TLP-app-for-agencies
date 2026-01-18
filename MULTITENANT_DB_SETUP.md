# 📋 Multi-Tenant Database Setup - Complete Guide

**Date**: January 18, 2026  
**Status**: Ready to implement  
**Scope**: Set up adwait as super admin + prepare for tenant onboarding

---

## What You'll Have After Setup

### Original Agency (The Lost Project)
```
┌─────────────────────────────────────────┐
│ The Lost Project                        │
├─────────────────────────────────────────┤
│ Owner: adwait@thelostproject.in         │
│ Role: super_admin (org admin)           │
│ Status: Active                          │
│ Plan: Premium                           │
│ Data: All original tables               │
│ Access: /dashboard (original interface) │
│                                         │
│ Tables: users, clients, projects,       │
│         invoices, milestones, etc.      │
│ Filter: user_id = adwait's user_id      │
│ RLS: Enabled for isolation              │
└─────────────────────────────────────────┘
```

### Tenant Agency (Test Setup)
```
┌─────────────────────────────────────────┐
│ [Ready for onboarding]                  │
├─────────────────────────────────────────┤
│ Owner: tenant@company.com (to be added) │
│ Role: admin (org admin)                 │
│ Status: Trial                           │
│ Plan: Standard                          │
│ Data: SaaS tables only                  │
│ Access: /v2/dashboard (tenant interface)│
│                                         │
│ Tables: saas_organizations,             │
│         saas_projects, saas_invoices    │
│ Filter: org_id = tenant's org_id        │
│ RLS: Enabled for tenant isolation       │
└─────────────────────────────────────────┘
```

---

## Architecture Overview

```
SUPABASE DATABASE STRUCTURE
═══════════════════════════════════════════════════════════

Original Agency (v1)                Multi-Tenant SaaS (v2)
─────────────────────────────────   ────────────────────────
1. users                            1. saas_organizations
   ├─ Filtered by: user_id             ├─ Filtered by: org_id
   └─ RLS Policy: self only            └─ RLS Policy: members
                                    
2. clients                          2. saas_organization_members
   ├─ Filtered by: user_id             ├─ Filtered by: org_id
   └─ RLS Policy: same user            └─ RLS Policy: members
                                    
3. projects                         3. saas_projects
   ├─ Filtered by: user_id             ├─ Filtered by: org_id
   └─ RLS Policy: same user            └─ RLS Policy: org members
                                    
4. invoices                         4. saas_invoices
   ├─ Filtered by: user_id             ├─ Filtered by: org_id
   └─ RLS Policy: same user            └─ RLS Policy: org members

═════════════════════════════════════════════════════════════

ISOLATION MECHANISMS
═════════════════════════════════════════════════════════════

Original Agency
├─ Layer 1: Middleware routing (blocks SaaS from /dashboard)
├─ Layer 2: user_id filtering in queries
└─ Layer 3: RLS policies at database level

Tenant Agency
├─ Layer 1: Middleware routing (blocks from /dashboard)
├─ Layer 2: org_id filtering in queries
└─ Layer 3: RLS policies at database level

═════════════════════════════════════════════════════════════
```

---

## Complete Implementation Checklist

### 🔧 Part 1: Database Setup (Estimate: 50 minutes)

#### Preparation (5 min)
- [ ] Get Supabase project credentials
- [ ] Get adwait's user ID from Supabase Auth
- [ ] Save these credentials securely

#### Create SaaS Tables (10 min)
- [ ] Run saas_core_tables.sql in Supabase SQL Editor
- [ ] Verify tables created successfully

#### Setup Original Organization (10 min)
- [ ] Create organization record: "The Lost Project"
- [ ] Save the returned org_id
- [ ] Add adwait as organization admin
- [ ] Verify membership created

#### Enable Security (10 min)
- [ ] Run RLS policy creation queries
- [ ] Verify policies are active in Supabase

#### Verify Everything (5 min)
- [ ] Check organization record exists
- [ ] Check adwait is organization admin
- [ ] Check RLS policies enabled

#### Configure App (5 min)
- [ ] Create .env.local with Supabase credentials
- [ ] Verify proxy.ts has correct original owner email

### 🧪 Part 2: Testing & Validation (Estimate: 30 minutes)

#### Local Testing (15 min)
- [ ] Run: npm run dev
- [ ] Login as adwait@thelostproject.in
- [ ] Verify middleware allows /dashboard access
- [ ] Check analytics page shows filtered data
- [ ] Check admin dashboard shows filtered data
- [ ] Verify DevTools Network shows .eq("user_id", ...)

#### Tenant Isolation Testing (15 min)
- [ ] Create test tenant organization (optional)
- [ ] Try to login with test user
- [ ] Verify cannot access /dashboard
- [ ] Verify redirected to /v2/dashboard
- [ ] Check middleware logs in console
- [ ] Verify RLS blocks direct database access

### 🚀 Part 3: Deployment Ready (Estimate: 20 minutes)

#### Code Review
- [ ] All three security fixes in place
- [ ] No breaking changes
- [ ] All documentation complete

#### Documentation
- [ ] DATABASE_SETUP_GUIDE.md reviewed
- [ ] DATABASE_SETUP_STEPS.md reviewed
- [ ] LOCAL_TESTING_GUIDE.md available
- [ ] All documentation files committed

#### Readiness Check
- [ ] Database setup complete
- [ ] Local testing passed
- [ ] No console errors
- [ ] No security warnings
- [ ] Ready for staging deployment

---

## Database Setup Files

| File | Purpose | When Needed |
|------|---------|-------------|
| [saas_core_tables.sql](saas_core_tables.sql) | Core table definitions | During setup |
| [setup_multitenant_db.sql](setup_multitenant_db.sql) | Setup script with placeholders | During setup |
| [DATABASE_SETUP_GUIDE.md](DATABASE_SETUP_GUIDE.md) | Architecture & overview | Reference |
| [DATABASE_SETUP_STEPS.md](DATABASE_SETUP_STEPS.md) | Step-by-step instructions | During setup |
| [MULTITENANT_DB_SETUP.md](MULTITENANT_DB_SETUP.md) | This file | Planning |

---

## Key Implementation Details

### Original Owner Configuration
```
Email: adwait@thelostproject.in
Auth User ID: {ADWAIT_USER_ID} (from Supabase Auth)
Organization: The Lost Project
Org ID: {ORIGINAL_ORG_ID} (UUID generated)
Role: admin (in saas_organization_members)
Status: active
```

### Data Isolation Strategy
```
Original Agency
├─ Query Filter: WHERE user_id = '{ADWAIT_USER_ID}'
├─ RLS Filter: org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
└─ Middleware: Route to /dashboard only

Tenant Agency
├─ Query Filter: WHERE org_id = '{ORG_ID}'
├─ RLS Filter: org_id IN (SELECT org_id FROM members WHERE user_id = auth.uid())
└─ Middleware: Route to /v2/dashboard only
```

### Security Layers
```
Layer 1: Middleware (proxy.ts)
├─ Checks user email
├─ Blocks SaaS users from /dashboard
└─ Redirects to appropriate interface

Layer 2: Query Filtering (Application)
├─ Filters by user_id (original agency)
├─ Filters by org_id (SaaS tenants)
└─ Application-level isolation

Layer 3: RLS Policies (Database)
├─ Enforces user_id isolation
├─ Enforces org_id isolation
└─ Database-level enforcement
```

---

## Critical Points

### ⚠️ Important: adwait's User ID

1. Go to Supabase → Authentication → Users
2. Find: adwait@thelostproject.in
3. Copy the UUID (first column)
4. This UUID must be used in setup_multitenant_db.sql

**Example**: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

### ⚠️ Important: Organization ID

1. After creating organization in setup_multitenant_db.sql
2. The query returns: `original_org_id`
3. Copy this UUID
4. Use it in next step to add adwait as admin

**Example**: `z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4`

### ⚠️ Important: Middleware Configuration

In [proxy.ts](proxy.ts), line 12:
```typescript
const ORIGINAL_AGENCY_OWNER_EMAIL = 'adwait@thelostproject.in';
```

This must match the actual email in Supabase Auth.

---

## Testing Scenarios

### Scenario 1: Original Owner Normal Access ✅
```
1. User: adwait@thelostproject.in
2. Action: Navigates to /
3. Middleware: Detects original owner
4. Result: ✅ Redirected to /dashboard
5. Dashboard: Shows original data only
```

### Scenario 2: SaaS User Blocked from Original ✅
```
1. User: tenant@company.com (no org)
2. Action: Navigates to /
3. Middleware: Detects SaaS user without org
4. Result: ✅ Redirected to /v2/onboarding
5. Onboarding: User creates organization
```

### Scenario 3: Tenant with Organization ✅
```
1. User: tenant@company.com (with org)
2. Action: Navigates to /
3. Middleware: Detects SaaS user with org
4. Result: ✅ Redirected to /v2/dashboard
5. Dashboard: Shows only their org data
```

### Scenario 4: Data Cannot be Leaked ✅
```
1. Attack: Direct database query
2. Query: SELECT * FROM original_projects
3. RLS: Applies policy
4. Result: ✅ No rows returned (wrong org)
```

---

## Deployment Stages

### Stage 1: Local Development ✓
- [x] Code fixes applied
- [ ] Database configured
- [ ] Local testing passed

### Stage 2: Staging Environment
- [ ] Deploy to staging
- [ ] Run full test suite
- [ ] Test with real Supabase staging project
- [ ] Monitor logs

### Stage 3: Production
- [ ] Deploy to production
- [ ] Enable monitoring
- [ ] Watch logs for errors
- [ ] Monitor for 7 days
- [ ] Gradually onboard tenants

---

## Support & Reference

### If You Get Stuck

1. **Table doesn't exist?**
   - Run saas_core_tables.sql in Supabase SQL Editor

2. **Foreign key error?**
   - Check that UUIDs are correct
   - Verify user exists in auth.users

3. **RLS issues?**
   - Re-run RLS policy creation queries
   - Check Supabase "Policies" tab

4. **Middleware not routing?**
   - Check proxy.ts configuration
   - Verify email matches exactly

5. **Cannot login?**
   - Check .env.local credentials
   - Verify user exists in Supabase Auth

### Documentation Structure

```
📚 Database Documentation
├─ DATABASE_SETUP_GUIDE.md (← Start here for overview)
├─ DATABASE_SETUP_STEPS.md (← Follow these steps)
├─ setup_multitenant_db.sql (← Run this script)
├─ saas_core_tables.sql (← Run this first)
└─ MULTITENANT_DB_SETUP.md (← This checklist)
```

---

## Success Criteria ✅

After completing all steps, you should have:

✅ **Original Agency Setup**
- adwait@thelostproject.in can login
- Access /dashboard normally
- See only their original data
- Admin dashboard shows filtered data

✅ **Database Security**
- RLS policies enabled
- Middleware routing working
- Query filtering active
- No cross-org data leakage

✅ **Ready for Tenants**
- SaaS tables created
- Organization structure ready
- Payment tracking ready
- Magic link system ready

✅ **Monitoring & Logs**
- Middleware logs visible
- Database queries show filters
- No security warnings
- Performance acceptable

---

## Next Steps

1. **Now**: Read [DATABASE_SETUP_STEPS.md](DATABASE_SETUP_STEPS.md)
2. **Then**: Follow each phase in order (Phase 1-8)
3. **After**: Run local tests from [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md)
4. **Finally**: Deploy to staging/production

---

## Timeline

```
Today (Jan 18):
├─ Database setup (50 min)
└─ Local testing (30 min)

Week of Jan 20:
├─ Code review & verification
├─ Staging deployment
└─ Integration testing

Week of Jan 27:
└─ Production deployment
```

---

## Status

```
✅ Code fixes: COMPLETE
✅ Documentation: COMPLETE
✅ Database schema: READY
✅ Setup scripts: READY

⏳ Database setup: PENDING
⏳ Local testing: PENDING
⏳ Tenant onboarding: PENDING
```

---

**Ready to implement?** Start with [DATABASE_SETUP_STEPS.md](DATABASE_SETUP_STEPS.md)! 🚀
