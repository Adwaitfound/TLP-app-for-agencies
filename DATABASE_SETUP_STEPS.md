# 🚀 Database Implementation - Step by Step

**Date**: January 18, 2026  
**Goal**: Set up multi-tenant database with adwait as super admin

---

## Prerequisites ✅

- [x] Supabase project created
- [x] Code fixes applied (middleware, analytics, admin dashboard)
- [x] npm dependencies installed
- [x] .env.local ready (waiting for credentials)

---

## Implementation Steps

### Phase 1: Prepare (5 minutes)

#### Step 1.1: Get Your Supabase Credentials

1. Go to: https://app.supabase.com
2. Select your project
3. Go to: **Settings** → **API**
4. Copy and save:
   - `Project URL` → Use as `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → Use as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role key` → Use as `SUPABASE_SERVICE_ROLE_KEY`

#### Step 1.2: Get adwait's User ID

1. In Supabase, go to: **Authentication** → **Users**
2. Find: `adwait@thelostproject.in`
3. Copy the UUID in the first column (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
4. Save this as `{ADWAIT_USER_ID}`

---

### Phase 2: Create SaaS Tables (10 minutes)

#### Step 2.1: Run SaaS Core Tables Migration

1. In Supabase, go to: **SQL Editor**
2. Click: **+ New Query**
3. Copy entire contents of [saas_core_tables.sql](saas_core_tables.sql)
4. Paste into the editor
5. Click: **Run**
6. Wait for: `✅ 0 rows affected` (indicates success)

**Result**: ✅ SaaS tables created

---

### Phase 3: Setup Original Organization (10 minutes)

#### Step 3.1: Create Original Agency Record

1. In Supabase SQL Editor, create new query
2. Run this SQL:

```sql
INSERT INTO saas_organizations (
    name,
    slug,
    plan,
    status,
    subscription_started_at,
    billing_cycle
) VALUES (
    'The Lost Project',
    'the-lost-project',
    'premium',
    'active',
    NOW(),
    'yearly'
)
RETURNING id;
```

3. Copy the returned `id` value
4. Save it as `{ORIGINAL_ORG_ID}`

**Example Result**:
```
id
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

---

#### Step 3.2: Add adwait as Organization Admin

1. In Supabase SQL Editor, create new query
2. Replace `{ORIGINAL_ORG_ID}` with value from Step 3.1
3. Replace `{ADWAIT_USER_ID}` with value from Step 1.2
4. Run this SQL:

```sql
INSERT INTO saas_organization_members (
    org_id,
    user_id,
    role,
    status,
    accepted_at
) VALUES (
    '{ORIGINAL_ORG_ID}',
    '{ADWAIT_USER_ID}',
    'admin',
    'active',
    NOW()
);
```

**Result**: ✅ adwait is admin of The Lost Project org

---

### Phase 4: Enable Row Level Security (10 minutes)

#### Step 4.1: Create RLS Policies

Run this SQL in Supabase SQL Editor:

```sql
-- Enable RLS for SaaS tables
ALTER TABLE saas_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_organization_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_organization_payments ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can see their own orgs
CREATE POLICY org_isolation_read ON saas_organizations
FOR SELECT USING (
    id IN (
        SELECT org_id FROM saas_organization_members
        WHERE user_id = auth.uid()
    )
);

-- Organization Members: Users can see members of their orgs
CREATE POLICY member_isolation_read ON saas_organization_members
FOR SELECT USING (
    org_id IN (
        SELECT org_id FROM saas_organization_members
        WHERE user_id = auth.uid()
    )
);

-- Usage: Users can see usage of their orgs
CREATE POLICY usage_isolation_read ON saas_organization_usage
FOR SELECT USING (
    org_id IN (
        SELECT org_id FROM saas_organization_members
        WHERE user_id = auth.uid()
    )
);

-- Payments: Only admins can see payments
CREATE POLICY payment_isolation_read ON saas_organization_payments
FOR SELECT USING (
    org_id IN (
        SELECT org_id FROM saas_organization_members
        WHERE user_id = auth.uid()
        AND role = 'admin'
    )
);
```

**Result**: ✅ RLS policies enabled for tenant isolation

---

### Phase 5: Verify Setup (5 minutes)

#### Step 5.1: Check Organization Created

Run this query:

```sql
SELECT 
    id,
    name,
    slug,
    plan,
    status,
    created_at
FROM saas_organizations
WHERE slug = 'the-lost-project';
```

**Expected Result**:
```
id                                    | name              | slug              | plan      | status
a1b2c3d4-e5f6-7890-abcd-ef1234567890  | The Lost Project  | the-lost-project  | premium   | active
```

---

#### Step 5.2: Check Admin Membership

Run this query (replace `{ORIGINAL_ORG_ID}`):

```sql
SELECT 
    om.id,
    om.role,
    om.status,
    u.email,
    om.accepted_at
FROM saas_organization_members om
JOIN auth.users u ON om.user_id = u.id
WHERE om.org_id = '{ORIGINAL_ORG_ID}';
```

**Expected Result**:
```
id                                    | role  | status | email                         | accepted_at
z9y8x7w6-v5u4-t3s2-r1q0-p9o8n7m6l5k4  | admin | active | adwait@thelostproject.in | 2026-01-18 ...
```

---

### Phase 6: Configure Application (5 minutes)

#### Step 6.1: Create .env.local

In your project root, create `.env.local`:

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_key_here
EOF
```

Replace with actual values from Phase 1, Step 1.1

---

#### Step 6.2: Update proxy.ts Configuration

In [proxy.ts](proxy.ts), verify line 12:

```typescript
const ORIGINAL_AGENCY_OWNER_EMAIL = 'adwait@thelostproject.in';
```

**Status**: ✅ Already configured

---

### Phase 7: Start Local Testing (5 minutes)

#### Step 7.1: Start Dev Server

```bash
npm run dev
```

Opens: http://localhost:3000

---

#### Step 7.2: Test Original Owner Access

1. **Login**: adwait@thelostproject.in
2. **Expected**: Redirected to `/dashboard`
3. **Verify**:
   - [ ] Dashboard loads
   - [ ] Console shows: `[MIDDLEWARE] Original owner accessing /dashboard - allowed`
   - [ ] Can see analytics page
   - [ ] Can see admin dashboard
   - [ ] Sees only their data

---

#### Step 7.3: Test SaaS User Isolation (Optional)

If you have a test tenant account:

1. **Login**: test@tenant.com (or any non-adwait user)
2. **Try to access**: /dashboard manually
3. **Expected**: Redirected to `/v2/dashboard`
4. **Verify**:
   - [ ] Cannot access original `/dashboard`
   - [ ] Console shows: `[MIDDLEWARE] SaaS user blocked from /dashboard...`
   - [ ] Sees `/v2/dashboard` (or onboarding if no org)

---

### Phase 8: Monitor Logs (Ongoing)

#### Step 8.1: Check Middleware Logs

Open browser DevTools → Console

Look for:
- ✅ `[MIDDLEWARE] Original owner accessing /dashboard - allowed`
- ✅ `[MIDDLEWARE] SaaS user blocked from /dashboard...`

#### Step 8.2: Check Database Queries

Open DevTools → Network tab

Look for:
- ✅ Supabase API calls include `.eq("user_id", ...)`
- ✅ Analytics page queries filtered by user
- ✅ Admin dashboard queries filtered by user

---

## Troubleshooting

### Problem: "Table 'saas_organizations' does not exist"

**Solution**:
1. Make sure you ran the full [saas_core_tables.sql](saas_core_tables.sql)
2. Check Supabase SQL Editor for errors
3. Try running the migration again

---

### Problem: "Foreign key constraint violation"

**Solution**:
1. Make sure `{ADWAIT_USER_ID}` is a real UUID from auth.users
2. Check that the user exists in Supabase Authentication
3. Verify you didn't mistype the UUID

---

### Problem: Cannot login to /dashboard

**Solution**:
1. Verify .env.local has correct Supabase credentials
2. Check that adwait@thelostproject.in exists in Supabase Auth
3. Try logout and login again
4. Check browser console for Supabase errors

---

### Problem: SaaS user can see /dashboard

**Solution**:
1. Verify middleware rule 3 in [proxy.ts](proxy.ts) doesn't have escape clause
2. Check that user is NOT adwait@thelostproject.in
3. Clear browser cookies and try again

---

## Success Checklist ✅

- [ ] SaaS tables created in Supabase
- [ ] Original organization record exists
- [ ] adwait@thelostproject.in is organization admin
- [ ] RLS policies enabled
- [ ] .env.local configured with Supabase credentials
- [ ] npm run dev starts without errors
- [ ] adwait can login and access /dashboard
- [ ] Analytics page shows filtered data
- [ ] Admin dashboard shows filtered data
- [ ] No data leakage to other users

---

## Timeline

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Prepare credentials | 5 min | ⏳ Ready |
| 2 | Create SaaS tables | 10 min | ⏳ Ready |
| 3 | Setup organization | 10 min | ⏳ Ready |
| 4 | Enable RLS | 10 min | ⏳ Ready |
| 5 | Verify setup | 5 min | ⏳ Ready |
| 6 | Configure app | 5 min | ⏳ Ready |
| 7 | Start testing | 5 min | ⏳ Ready |
| 8 | Monitor logs | Ongoing | ⏳ Ready |

**Total Time**: ~50 minutes

---

## Next Steps

After database setup is complete:

1. ✅ Run local tests (see [LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md))
2. ✅ Test tenant onboarding flow
3. ✅ Deploy to staging environment
4. ✅ Run integration tests
5. ✅ Deploy to production

---

## Reference Files

| File | Purpose |
|------|---------|
| [saas_core_tables.sql](saas_core_tables.sql) | SaaS table definitions |
| [setup_multitenant_db.sql](setup_multitenant_db.sql) | Setup script with placeholders |
| [DATABASE_SETUP_GUIDE.md](DATABASE_SETUP_GUIDE.md) | Detailed architecture guide |
| [proxy.ts](proxy.ts) | Middleware with original owner logic |
| [app/dashboard/analytics/page.tsx](app/dashboard/analytics/page.tsx) | Analytics with user filtering |
| [app/dashboard/admin-view.tsx](app/dashboard/admin-view.tsx) | Admin dashboard with user filtering |

---

**Status**: 🟢 Ready to implement

Start with Phase 1 whenever you have time! 🚀
