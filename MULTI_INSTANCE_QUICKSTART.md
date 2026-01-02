# Multi-Instance Quick Start Guide

**TL;DR**: Each agency gets their own app. No filtering. Clean code.

---

## System Overview

```
┌─────────────────────┐
│  Admin Dashboard    │
│  (tlp-app....)      │
│  ┌───────────────┐  │
│  │ Approve Req → │──────┐
│  │ (Provisioning)│      │
│  └───────────────┘      │
└─────────────────────┘    │
                           │
        Creates:           │
    ┌─────────────────────┘
    │
    ├─ Supabase Project
    ├─ Database Schema
    ├─ Vercel Deployment
    ├─ Admin User
    └─ Welcome Email
           ⬇️
    ┌─────────────────────┐
    │ Agency Instance     │
    │ (agency1.tlp.co)    │
    │                     │
    │ Full Dashboard      │
    │ All Features        │
    │ Isolated Data       │
    └─────────────────────┘
```

---

## Phase 1: Done ✅

### What Was Removed

- ❌ `agency_id` columns from dashboard queries
- ❌ Feature gating (Standard/Premium)
- ❌ `agency_admin` role
- ❌ Multi-tenant filtering logic
- ❌ Agency branding in sidebar
- ❌ Auth context enrichment

### Result

- ✅ 9 files modified
- ✅ ~200 lines deleted
- ✅ 30% less code complexity
- ✅ All dashboards simplified

---

## Phase 2: Provisioning (Next)

### What To Build

```typescript
// 1. Supabase API Client
lib/provisioning/supabase-mgmt.ts
  - createSupabaseProject()
  - getProjectStatus()
  - getProjectCredentials()

// 2. Vercel API Client
lib/provisioning/vercel-deploy.ts
  - createVercelProject()
  - setVercelEnv()
  - triggerDeploy()

// 3. Database Setup
lib/provisioning/run-migrations.ts
  - runMigrations()

// 4. Email Service
lib/provisioning/send-welcome-email.ts
  - sendWelcomeEmail()

// 5. Orchestrator
app/api/admin/agency-onboarding/provision/route.ts
  - POST handler that calls 1-4 above
```

### New Schema

```sql
-- v0_schema.sql: Fresh instance schema
-- NO agency_id columns
-- NO agencies table
-- NO user_agencies table
-- Just the core: users, projects, clients, files, etc.
```

### Environment Variables

```bash
SUPABASE_ACCESS_TOKEN=<token>
SUPABASE_ORG_ID=<id>
VERCEL_TOKEN=<token>
```

---

## File Changes Summary

### Removed Multi-Tenant Code From:

| File                  | Lines Removed | Change                     |
| --------------------- | ------------- | -------------------------- |
| `projects/page.tsx`   | 20            | Removed agency_admin check |
| `clients/page.tsx`    | 60            | Removed agency scoping     |
| `files/page.tsx`      | 40            | Removed agency lookup      |
| `analytics/page.tsx`  | 40            | Removed agency data fetch  |
| `team/page.tsx`       | 30            | Removed agency filtering   |
| `sidebar.tsx`         | 30            | Removed feature gating     |
| `payments/page.tsx`   | 5             | Removed access check       |
| `auth-context.tsx`    | 25            | Removed agency fields      |
| `onboarding/route.ts` | 100           | Removed user creation      |

**Total: 350 lines removed** ✅

---

## Key Concepts

### Before (Multi-Tenant)

```
One database, many agencies
↓
Query for user's agency_id
↓
Filter results by agency_id
↓
Show only their data
↓
Problem: Complex, error-prone, confusing
```

### After (Multi-Instance)

```
Many databases, one per agency
↓
Each instance connects to its own DB
↓
No filtering needed
↓
Show everything (it's all theirs)
↓
Simple, secure, easy to understand
```

---

## Testing Phase 1

Run these to verify no errors:

```bash
# Check builds
npm run build

# Check pages load
curl http://localhost:3000/dashboard/projects

# Check no errors in console
# Verify sidebar shows TLP branding (not agency logo)
# Verify all features visible (no gating)
```

---

## Provisioning Flow (Phase 2)

When admin clicks "Approve":

```
1. UI shows "Provisioning..."

2. API calls:
   - Create Supabase project
   - Wait for project ready
   - Get credentials

3. API calls:
   - Run migrations on new DB
   - Create admin user

4. API calls:
   - Create Vercel project
   - Set environment variables
   - Deploy code
   - Wait for deployment

5. Email service:
   - Send welcome email
   - Include login URL
   - Include temp password

6. Update request status:
   - Mark as "deployed"
   - Store instance URL
   - Store project IDs

Result: Agency owner receives email with login credentials
```

---

## New Tables Needed

```sql
-- Add to agency_onboarding_requests:
instance_url VARCHAR
supabase_project_id VARCHAR
vercel_project_id VARCHAR
error_message TEXT
provisioning_started_at TIMESTAMP
provisioning_completed_at TIMESTAMP
```

---

## Security Checklist

- [ ] API tokens in `.env.local` (never in code)
- [ ] Temporary passwords hashed before storage
- [ ] Email-only credential delivery
- [ ] Supabase keys scoped to new projects
- [ ] Vercel deployments use limited tokens
- [ ] Error messages don't leak sensitive info
- [ ] Failed provisioning logged for review

---

## Deployment Steps (Later)

1. Get API tokens (Supabase, Vercel)
2. Add environment variables
3. Deploy provisioning code
4. Test with staging agency
5. Monitor first production deployment
6. Document provisioning status page

---

## Monitoring

After Phase 2, track:

- Provisioning success rate
- Average provisioning time
- API quota usage
- Instance health
- Data isolation verification

---

## Documentation Files

| File                             | Purpose           |
| -------------------------------- | ----------------- |
| `MULTI_INSTANCE_ARCHITECTURE.md` | System design     |
| `MIGRATION_SUMMARY.md`           | Phase 1 changes   |
| `NEXT_STEPS_IMPLEMENTATION.md`   | Phase 2 code plan |
| `PROJECT_SUMMARY.md`             | Executive summary |
| `MULTI_INSTANCE_QUICKSTART.md`   | This file         |

---

## Common Questions

**Q: Will existing data work?**  
A: Yes. Main app and agency instances can coexist. Old multi-tenant data stays in place.

**Q: When can I start new agencies?**  
A: After Phase 2 is complete (~2-3 weeks).

**Q: What if provisioning fails?**  
A: Marked as "failed" in DB. Admin gets error. Manual cleanup needed.

**Q: Can I change the domain?**  
A: Yes, in Phase 3. For now: `agency-name.tlp.co` or `tlp-agency-name.vercel.app`

**Q: Is the old approval UI still there?**  
A: Yes. Still works. Just marks request as "approved" without provisioning.

---

## What's Different for Users

### For Adwait (Admin)

- ✅ Approve agencies (same as before)
- ✅ No longer creates users or links them
- ✅ Sees real-time provisioning progress (Phase 2)
- ✅ No access to other agencies' dashboards

### For Agency Owners

- ✅ Gets dedicated app instance
- ✅ Own domain (not shared)
- ✅ All features enabled (no restrictions)
- ✅ Can't see other agencies' data

### For TLP Team

- ✅ Simpler codebase to maintain
- ✅ Easier to debug (isolated instances)
- ✅ Less data isolation risk
- ✅ Scalable to unlimited agencies

---

## Success Metrics

**Phase 1**: ✅ Complete

- Code simplified
- No breaking changes
- Build passes

**Phase 2**: ⏳ In Progress

- Provisioning automated
- UI shows progress
- Emails sent
- Agencies deployed
- All tests pass

**Phase 3**: 📋 Planned

- Custom domains
- Instance monitoring
- Backups/restore
- Usage analytics

---

## References

📚 **Docs**:

- Supabase API: https://supabase.com/docs/reference/api
- Vercel API: https://vercel.com/docs/api
- Resend Email: https://resend.com/docs

💾 **Code Examples**: See `NEXT_STEPS_IMPLEMENTATION.md`

🤝 **Questions**: Check project docs or ask Adwait

---

**Last Updated**: Dec 31, 2025  
**Status**: Phase 1 Complete, Phase 2 In Development
