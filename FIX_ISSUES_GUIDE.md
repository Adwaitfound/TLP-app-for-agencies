# Fix Client User Association & Password Reset Issues

## Issues Found

1. ❌ **Client Password Reset**: Fixed - now uses `getUserByEmail()` API
2. ❌ **Client Dashboard Access**: Client users don't have proper database records

## Solution Required

### STEP 1: Run this SQL in Supabase SQL Editor

Go to: https://supabase.com/dashboard → Your Project → SQL Editor → New Query

Paste this SQL and click "Run":

```sql
-- Ensure all auth users have public.users records
INSERT INTO public.users (id, email, full_name, role, status, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)) as full_name,
  CASE
    WHEN au.email LIKE '%@thelostproject.in' AND au.email NOT LIKE 'admin%' THEN 'client'
    ELSE COALESCE(au.raw_user_meta_data->>'role', 'client')
  END as role,
  'approved' as status,
  au.created_at,
  NOW() as updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  role = CASE
    WHEN EXCLUDED.email LIKE '%@thelostproject.in' AND EXCLUDED.email NOT LIKE 'admin%' THEN 'client'
    ELSE EXCLUDED.role
  END,
  updated_at = NOW();

-- Ensure all client role users have clients records
INSERT INTO clients (user_id, email, company_name, contact_person, status, total_projects, total_revenue, created_at, updated_at)
SELECT
  pu.id as user_id,
  pu.email,
  COALESCE(SPLIT_PART(pu.email, '@', 1), 'Unknown Company') as company_name,
  COALESCE(pu.full_name, SPLIT_PART(pu.email, '@', 1)) as contact_person,
  'active' as status,
  0 as total_projects,
  0 as total_revenue,
  pu.created_at,
  NOW() as updated_at
FROM public.users pu
LEFT JOIN clients c ON pu.id = c.user_id
WHERE c.id IS NULL
  AND pu.role = 'client'
ON CONFLICT (user_id) DO UPDATE
SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Verify
SELECT
  au.email,
  CASE WHEN pu.id IS NOT NULL THEN '✅' ELSE '❌' END as has_public_user,
  COALESCE(pu.role, 'N/A') as role,
  CASE WHEN c.id IS NOT NULL THEN '✅' ELSE '❌' END as has_client_record
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
LEFT JOIN clients c ON au.id = c.user_id
WHERE au.email LIKE '%@thelostproject.in'
ORDER BY au.created_at DESC;
```

### STEP 2: Test the fixes

After running the SQL:

1. **Reset Password Test**:

   - Go to Admin Dashboard → Clients section
   - Click on a client (e.g., "avani")
   - Click the reset password button (key icon)
   - Should see a success message with new password

2. **Client Dashboard Access Test**:
   - Log out
   - Log in as client user (e.g., avani@thelostproject.in)
   - Should be redirected to `/dashboard/client`
   - Should see their projects, invoices, and files

## Code Changes Made

✅ **app/actions/reset-client-password.ts**

- Changed from pagination-based `listUsers()` to direct `getUserByEmail()`
- More reliable and faster
- Proper error handling

## Why These Issues Happened

1. **Password Reset Failed**: Service-to-client communication was using admin API incorrectly
2. **Client Dashboard Access Blocked**: Client users weren't linked in the `clients` table with their `user_id`

## Expected After Fix

✅ Admin can reset any client's password
✅ Clients can log in and access their dashboard
✅ All client data (projects, invoices, files) loads correctly
