# How to Apply the Super Admin RLS Fix

## ⚠️ CRITICAL: You Must Run This Migration

The super_admin cannot see comments or access full features **until you run the SQL migration file in Supabase**. The code changes alone are not enough - the database RLS policies must be updated.

## Updated File

**SUPER_ADMIN_RLS_FIX.sql** - Contains 32 RLS policies for 17 tables, including full comment support

## Installation Steps

### Option 1: Supabase Dashboard (Recommended) ✅

1. Go to your **Supabase project dashboard** → https://supabase.com/dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **+ New Query**
4. Copy the entire contents of `SUPER_ADMIN_RLS_FIX.sql`
5. Paste into the SQL editor
6. Click the **Run** button (or press Ctrl+Enter)
7. You should see "Success" message for each policy drop/create
8. Refresh your app and test super_admin access

### Option 2: CLI (if you have psql installed)

```bash
cd /Users/adwaitparchure/TLP-app\ for\ agnecies
psql [YOUR_SUPABASE_CONNECTION_STRING] < SUPER_ADMIN_RLS_FIX.sql
```

Replace `[YOUR_SUPABASE_CONNECTION_STRING]` with your actual connection string from Supabase Settings → Database.

## What Gets Updated

**32 RLS Policies** across **17 tables:**

- project_files (4 policies)
- project_team (1 policy)
- time_entries (2 policies)
- leave_requests (2 policies)
- leave_balance (1 policy)
- employee_tasks (1 policy)
- salary_records (1 policy)
- projects (3 policies)
- advertisements (1 policy)
- ad_analytics (1 policy)
- ad_targets (1 policy)
- vendors (1 policy)
- vendor_payments (1 policy)
- vendor_project_assignments (1 policy)
- **project_comments (5 policies)** ← NEW for comment support
- **comment_replies (4 policies)** ← NEW for comment support
- client_services (1 policy)

## Verification

After running the script, verify the policies were created:

```sql
-- Check that super_admin is included in all updated policies
SELECT
    tablename,
    policyname,
    qual
FROM pg_policies
WHERE policyname LIKE '%super admin%'
OR policyname LIKE '%admins and super%'
ORDER BY tablename;
```

After running the query, you should see 32 policies with `super_admin` included.

## What About Comments & Invoices?

### Comments ✅

- **NOW FULLY SUPPORTED** with 9 policies updated
- Project comments and comment replies now include super_admin access
- Super admin can see all historical comments across all projects

### Invoices

- Access is email-based (adwait@thelostproject.in) for security
- This is intentional and managed separately
- Not modified in this migration

## Testing Super Admin Access

After running the migration, super admin should now be able to:

1. ✅ **View all comments** across all projects (including old comments)
2. ✅ Create/manage projects
3. ✅ Access files page
4. ✅ View invoices
5. ✅ Manage team members
6. ✅ Assign vendors & payments
7. ✅ View time entries and tasks
8. ✅ Delete other admins and users

## Troubleshooting

If super admin still can't see comments after running the migration:

1. **Verify the migration ran**: Check that you see 32 policies in the verification query above
2. **Clear browser cache**: Hard refresh (Cmd+Shift+R) the comments page
3. **Check RLS status**: Go to Supabase Dashboard → Policies, filter by table `project_comments`
4. **Verify user role**: Make sure the user is actually set to `super_admin` in the users table

---

**Last Updated:** January 9, 2026
**Status:** Ready to Deploy

---

**Date: January 9, 2026**
**Status: Fixed and Ready to Deploy**
