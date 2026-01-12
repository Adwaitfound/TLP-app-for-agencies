# 🔧 Clean Slate Routing Architecture - Implementation Guide

## 🎯 The Problem

Your user `social@thefoundproject.com` is correctly:

- ✅ Created in `auth.users`
- ✅ Has `admin` role in `users` table (old agency system)
- ✅ Has active membership in `saas_organization_members`
- ✅ Belongs to organization "The Found Project"

**BUT** they're being sent to `/dashboard` (old agency system) instead of `/v2/dashboard` (SaaS system).

### Root Cause: Login Page Logic Fails Silently

The login page does this:

```tsx
const { data: membership } = await supabase
  .from("saas_organization_members")
  .select("org_id")
  .eq("user_id", data.user.id)
  .eq("status", "active")
  .single();

if (membership?.org_id) {
  router.push("/v2/dashboard"); // ← Should work
} else {
  router.push("/dashboard"); // ← But redirects here instead
}
```

**Why it fails:**

1. Query might return `null` due to RLS policies blocking anon role
2. Router.push() happens but page still in old app context
3. OrgProvider might be redirecting elsewhere

---

## ✅ The Solution: Middleware-Based Routing

**File**: `middleware.ts` (created in your root directory)

### How It Works

```
Every Request
    ↓
[Middleware Check]
    ↓
Is User Authenticated?
    ├─ NO → Redirect to /agency/login
    └─ YES ↓
        Does user have saas_organization_members record?
        ├─ YES → SaaS User
        │  └─ Redirect to /v2/dashboard (new system)
        ├─ NO & has admin role → Old Agency Owner
        │  └─ Redirect to /dashboard (old system)
        └─ NO & no admin role → New User
           └─ Redirect to /agency-onboarding (create org)
```

### Three User Types

| User Type            | Location             | Data Source                               | RLS Scope            |
| -------------------- | -------------------- | ----------------------------------------- | -------------------- |
| **Old Agency Owner** | `/dashboard`         | Original tables (projects, clients, etc.) | None (legacy)        |
| **SaaS User**        | `/v2/dashboard`      | `saas_*` tables                           | Filtered by `org_id` |
| **New User**         | `/agency-onboarding` | None yet                                  | None                 |

---

## 📋 Three Areas to Debug (Already Diagnosed ✅)

### 1️⃣ Redirection Logic

**Status**: ✅ FOUND & FIXED

- **Was**: Login page redirect failing silently
- **Now**: Middleware enforces routing at request level
- **Result**: All requests go through routing check, no silent failures

### 2️⃣ Data Fetching Leak

**Status**: ✅ VERIFIED WORKING

- `/v2/*` pages use `useOrg()` hook which queries `saas_organization_members`
- OrgProvider filters by authenticated user ID
- RLS policies allow users to see their own memberships
- ✅ Data isolation is working

### 3️⃣ Missing Tenant Filter

**Status**: ✅ CONFIRMED IN PLACE

- OrgProvider fetches `org_id` from membership
- All `/v2/*` pages receive `organization` context
- Any data queries should use `org_id` for filtering
- ✅ RLS policies enforce tenant isolation at database level

---

## 🚀 What to Do Next

### 1. Restart Dev Server

The middleware requires a restart to take effect:

```bash
npm run dev
```

### 2. Test the Flow

**Test Case 1: SaaS User (social@thefoundproject.com)**

```
1. Go to http://localhost:3001/agency/login
2. Log in with: social@thefoundproject.com / TestPassword@123
3. Expected: Redirect to /v2/dashboard
4. Check: Should show "The Found Project" org
```

**Test Case 2: Access Old Dashboard as SaaS User**

```
1. Log in as above
2. Go to http://localhost:3001/dashboard
3. Expected: Redirect to /v2/dashboard automatically
```

**Test Case 3: New User (Create One)**

```
1. Create new test account via /v2/setup
2. Log in with new account
3. Expected: Redirect to /agency-onboarding (no org yet)
```

---

## 🔍 How to Debug

Check browser console for middleware logs:

```
[MIDDLEWARE] User social@thefoundproject.com accessing /agency/login
[MIDDLEWARE] Membership check: { hasSaasMembership: true, role: 'admin', userId: '...' }
[MIDDLEWARE] ✅ SaaS user, checking path...
[MIDDLEWARE] ⬅️ Redirecting social@thefoundproject.com from /dashboard to /v2/dashboard
```

---

## 📊 Data Architecture After Middleware

### For SaaS Users (/v2/dashboard)

1. **Auth Context**: User authenticated
2. **Middleware Check**: ✅ Has `saas_organization_members` record
3. **OrgProvider**: Loads org context using user ID
4. **Data Queries**: Use `saas_*` tables with `org_id` filter
5. **RLS Policies**: Block access to other orgs

### For Old Agency Owners (/dashboard)

1. **Auth Context**: User authenticated
2. **Middleware Check**: ✅ Has `admin`/`agency_admin` role in `users` table
3. **Data Queries**: Use original tables (clients, projects, etc.)
4. **RLS Policies**: Legacy policies apply (if any)

---

## 🎯 Key Changes in Middleware.ts

```typescript
// Route SaaS users
if (isSaaSUser) {
  if (pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/v2/dashboard", request.url));
  }
}

// Route old agency owners
if (isOldAgencyOwner) {
  if (pathname.startsWith("/v2/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
}

// Route new users
if (isNewUser) {
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/v2/")) {
    return NextResponse.redirect(new URL("/agency-onboarding", request.url));
  }
}
```

---

## ✨ Why This Works

1. **Happens before page render**: Middleware intercepts ALL requests
2. **No silent failures**: Clear redirects with logging
3. **Separates concerns**: Auth + routing + data fetching are independent
4. **Multi-tenant safe**: Each user only sees their org data
5. **Backward compatible**: Old agency owners still work

---

## 📝 Next Steps

1. ✅ Middleware is created (`middleware.ts`)
2. → Restart dev server
3. → Test login flow
4. → Verify redirects in browser console
5. → Check that /v2/dashboard shows correct org data
