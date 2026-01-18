# 🧪 Local Testing Guide - Data Leakage Security Fixes

## Setup Instructions

### Step 1: Install Dependencies
```bash
npm install
# or
yarn install
```

### Step 2: Setup Environment Variables
```bash
cp .env.example .env.local
```

Then edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 3: Start Development Server
```bash
npm run dev
```

Server will run at: http://localhost:3000

---

## Testing Scenarios

### Test 1: Original Agency Owner Can Access Dashboard ✅

**User**: `adwait@thelostproject.in`  
**Expected**: Access `/dashboard` with full data

**Steps**:
1. Go to http://localhost:3000
2. Login with `adwait@thelostproject.in`
3. Should see `/dashboard` with all projects, invoices, clients
4. Check Analytics page - should show their data
5. Check Admin Dashboard - should show their data

**Verify**:
- ✅ Projects shown
- ✅ Invoices shown
- ✅ Clients shown
- ✅ Analytics populated
- ✅ Admin metrics loaded

---

### Test 2: SaaS User Cannot Access Original Dashboard ❌

**User**: Any SaaS tenant (e.g., `tenant@company.com`)  
**Expected**: Redirected from `/dashboard` to `/v2/dashboard`

**Steps**:
1. Go to http://localhost:3000
2. Login with SaaS user email
3. Try to navigate to `/dashboard` manually
4. **Should be redirected to `/v2/dashboard`** immediately
5. Cannot access:
   - `/dashboard`
   - `/dashboard/projects`
   - `/dashboard/analytics`
   - `/dashboard/clients`

**Verify in Console**:
```
[MIDDLEWARE] SaaS user blocked from /dashboard, redirecting to /v2/dashboard
```

---

### Test 3: Verify Data Filtering in Analytics

**For Original Owner**:
1. Login as `adwait@thelostproject.in`
2. Go to `/dashboard/analytics`
3. Check Network Tab (DevTools → Network)
4. Look for requests to `projects`, `invoices`, `clients`
5. Verify URL includes: `.eq("user_id", "adwait...")`
6. Data should only show their records

**For SaaS User**:
1. Login as SaaS user
2. Try to access `/dashboard/analytics`
3. **Should be redirected to `/v2/dashboard`**
4. Cannot see original analytics data

---

### Test 4: Verify Admin Dashboard Filtering

**For Original Owner**:
1. Login as admin/project_manager role
2. Go to `/dashboard` (admin dashboard)
3. Open DevTools → Network tab
4. Check `admin-view.tsx` component
5. Verify queries include `.eq("user_id", userId)`
6. Projects, invoices, clients should be filtered

**In Console, watch for**:
```
Fetching admin dashboard data for user: [user_id]
Filtered projects: [number]
Filtered invoices: [number]
Filtered clients: [number]
```

---

## Code Verification Checklist

### ✅ Middleware Fix (proxy.ts)

Check the middleware has the fix:

```bash
grep -n "if (!isOriginalAgencyOwner && pathname.startsWith('/dashboard'))" proxy.ts
```

Should show line 110 WITHOUT the `!pathname.startsWith('/dashboard/')` escape clause.

```typescript
// CORRECT (no escape clause):
if (!isOriginalAgencyOwner && pathname.startsWith('/dashboard')) {
  console.log('[MIDDLEWARE] SaaS user blocked from /dashboard...');
  // redirect
}
```

---

### ✅ Analytics Queries (app/dashboard/analytics/page.tsx)

Check for user_id filters:

```bash
grep -n 'eq("user_id", user.id)' app/dashboard/analytics/page.tsx
```

Should show 3 lines:
- Line 71: projects filter
- Line 72: invoices filter
- Line 73: clients filter

```typescript
// CORRECT:
supabase.from("projects").select("*").eq("user_id", user.id),
supabase.from("invoices").select("*").eq("user_id", user.id),
supabase.from("clients").select("*").eq("user_id", user.id),
```

---

### ✅ Admin Dashboard Queries (app/dashboard/admin-view.tsx)

Check for user_id filters:

```bash
grep -n 'eq("user_id", userId)' app/dashboard/admin-view.tsx
```

Should show 3 lines:
- Line ~139: projects filter
- Line ~149: invoices filter
- Line ~159: clients filter

```typescript
// CORRECT:
.from("projects").select(...).eq("user_id", userId)
.from("invoices").select(...).eq("user_id", userId)
.from("clients").select(...).eq("user_id", userId)
```

---

## Browser DevTools Testing

### Console Checks

1. **Open DevTools** (F12 / Cmd+Option+I)
2. **Go to Console tab**
3. **Watch for middleware logs**:
   ```
   [MIDDLEWARE] Original owner accessing /dashboard - allowed
   // or
   [MIDDLEWARE] SaaS user blocked from /dashboard, redirecting to /v2/dashboard
   ```

### Network Tab Checks

1. **Open DevTools** → **Network tab**
2. **Login and navigate**
3. **Look for Supabase API calls**
4. **Check request URLs/parameters**:
   - Should see `.eq` filters in request
   - Example: `.eq("user_id", "adwait...")`

### Application Tab Checks

1. **Open DevTools** → **Application tab**
2. **Go to Cookies/Local Storage**
3. **Check `auth.session`**
4. **Verify user email matches logged-in user**

---

## Quick Test Commands

Run these in the terminal to verify fixes are in place:

```bash
# 1. Check middleware escape clause removed
grep 'if (!isOriginalAgencyOwner && pathname.startsWith' proxy.ts | grep -v '!pathname'
# Should show the line without escape clause

# 2. Count analytics filters
grep -c 'eq("user_id", user.id)' app/dashboard/analytics/page.tsx
# Should output: 3

# 3. Count admin dashboard filters
grep -c 'eq("user_id", userId)' app/dashboard/admin-view.tsx
# Should output: 3

# 4. Verify all files exist
ls -1 DATA_* SECURITY_* | wc -l
# Should be: 5+ documentation files
```

---

## Expected Results

### ✅ Original Agency Owner (adwait@thelostproject.in)
- Can access `/dashboard`
- Can access `/dashboard/projects`
- Can access `/dashboard/analytics`
- Can access `/dashboard/clients`
- Sees only their data
- Full functionality works

### ✅ SaaS Tenant (tenant@company.com)
- Cannot access `/dashboard`
- Automatically redirected to `/v2/dashboard`
- Cannot access any `/dashboard/*` routes
- Sees only their organization's data
- Cannot see original agency data

### ✅ Security Layers
- Layer 1 (Middleware): Blocks SaaS users ✅
- Layer 2 (RLS): Enforces org_id isolation ✅
- Layer 3 (Filters): Filters by user_id ✅

---

## Troubleshooting

### Issue: Server won't start

```bash
# Clear build cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Start fresh
npm run dev
```

### Issue: Supabase connection fails

**Check**:
1. `.env.local` has correct Supabase credentials
2. Supabase project is active
3. Network connectivity is good

```bash
# Verify .env.local is set
cat .env.local | grep NEXT_PUBLIC_SUPABASE
```

### Issue: Redirects not working

**Check console** for middleware logs:
```javascript
// In browser DevTools Console
// Should see [MIDDLEWARE] messages
```

**Verify proxy.ts** has the fix:
```bash
grep -A2 'Rule 3' proxy.ts
```

### Issue: Database queries not filtered

**Check DevTools Network tab**:
1. Open Network tab
2. Look for `Supabase` requests
3. Check URL includes `.eq("user_id", ...)`

**Verify code**:
```bash
grep 'eq("user_id"' app/dashboard/analytics/page.tsx
```

---

## Success Criteria ✅

You'll know the fixes work when:

1. ✅ Original owner can access `/dashboard` normally
2. ✅ SaaS user trying to access `/dashboard` is redirected to `/v2/dashboard`
3. ✅ Analytics page shows filtered data
4. ✅ Admin dashboard shows filtered data
5. ✅ Console shows `[MIDDLEWARE]` logs
6. ✅ Network requests include `.eq("user_id", ...)` filters
7. ✅ SaaS user cannot see original agency data

---

## Next Steps

After successful local testing:

1. ✅ Verify in staging environment
2. ✅ Run full test suite
3. ✅ Deploy to production
4. ✅ Monitor logs for issues
5. ✅ Confirm no data leakage

---

**Ready to test!** 🚀
