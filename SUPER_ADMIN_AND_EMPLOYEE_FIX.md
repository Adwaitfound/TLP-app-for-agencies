# Super Admin & Employee Project Access Fix

## Issues Fixed

### 1. ✅ Vendor Payment Edit Error

**Problem**: "Cannot coerce the result to a single JSON object" when editing vendor payments

**Root Cause**: `updatePayment()` function was using regular Supabase client instead of service role client

**Solution**: Updated `app/actions/vendor-operations.ts` to use service role client with admin verification, matching the pattern in `createPayment()` and `deletePayment()`

### 2. ✅ Employee Can't See Assigned Projects (e.g., Jay)

**Problem**: Employees like Jay cannot see projects assigned to them through `project_team` table

**Root Cause**: RLS policies on `projects` table didn't check `project_team` assignments

**Solution**: Created comprehensive RLS policies that allow employees to view:

- Projects they're assigned to via `project_team`
- Sub-projects of their assigned projects
- Milestones, files, and comments of their assigned projects

### 3. ✅ Super Admin Role for adwait@thelostproject.in

**Problem**: Need a super admin who can delete any user including other admins

**Solution**:

- Added `super_admin` role to `user_role` enum
- Set `adwait@thelostproject.in` as super admin
- Super admin can:
  - Delete any user (including admins)
  - Update any user record
  - Access all projects and resources

### 4. ✅ Employee Can't Request Projects

**Problem**: "Request a Project" button wasn't working for employees

**Root Cause**:

- Button had no onClick handler
- RLS policies didn't allow employees to create tasks

**Solution**:

- Added onClick handler to navigate to tasks tab where employees can propose projects
- Updated employee_tasks RLS policies to allow employees to INSERT/UPDATE/DELETE their own tasks
- Employees can now propose projects through task creation with "Propose New Project" option

### 5. ✅ Employee Can't Add Tasks

**Problem**: Employees couldn't create tasks

**Root Cause**: RLS policies on `employee_tasks` table didn't allow employee INSERTs

**Solution**: Updated RLS policies to allow employees to create, update, and delete their own tasks

## Database Migration

**File**: `supabase/migrations/20250105_add_super_admin_and_fix_employee_projects.sql`

## How to Apply

### Option 1: Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy entire contents of `supabase/migrations/20250105_add_super_admin_and_fix_employee_projects.sql`
4. Paste and click **Run**

### Option 2: Supabase CLI

```bash
supabase db push
```

## Role Hierarchy After Migration

1. **super_admin** - Full access, can delete anyone
   - Example: adwait@thelostproject.in
2. **admin** - Can manage projects, users (except admins/super admin)
   - Can create projects, manage vendors, etc.
   - Cannot delete other admins or super admin
3. **project_manager** - Can manage projects and teams
   - Can create projects, assign team members
4. **employee** - Can view and work on assigned projects
   - Can see projects they're assigned to via `project_team`
   - Can comment, view files, milestones of their projects
5. **client** - Can view their own projects
   - Can see projects where they are the client

## What Employees Can Now See

When an employee (like Jay) is added to a project via the "Team" section:

✅ **Projects** - Projects they're assigned to
✅ **Sub-projects** - Sub-projects of their assigned projects
✅ **Milestones** - Milestones of their assigned projects
✅ **Files** - Files uploaded to their assigned projects
✅ **Comments** - Comments on their assigned projects
✅ **Can Comment** - Can add comments to their assigned projects
✅ **Can Create Tasks** - Can create and manage their own tasks
✅ **Can Request Projects** - Can propose new projects through task creation

## Super Admin Permissions

The super admin (`adwait@thelostproject.in`) can:

✅ Delete any user (admin, employee, client, PM)
✅ Update any user's role or details
✅ View and manage all projects
✅ Access all resources without restriction

## Testing

### Test Employee Access

1. Create a test employee user
2. Assign them to a project via **Project Details** → **Team** tab
3. Log in as that employee
4. Verify they can see:
   - The assigned project in their dashboard
   - Project details, files, milestones
   - Can add comments

### Test Employee Task Creation

1. Log in as an employee
2. Go to **My Work** dashboard
3. Click **+ New Task** in the Task Manager section
4. Create a task:
   - Regular task: Select an existing project
   - Project proposal: Click "Propose New Project" and fill in project name
5. Verify:
   - Task appears in task list
   - Project proposals show "pending" status
   - Admin can review and approve/reject proposals

### Test "Request a Project" Button

1. Log in as an employee with no projects
2. Navigate to **Projects** tab
3. Click **Request a Project** button
4. Verify:
   - Redirects to Tasks tab
   - Can create a task with "Propose New Project" option
   - Can submit project request

### Test Super Admin

1. Log in as `adwait@thelostproject.in`
2. Go to **Users** section
3. Verify you can:
   - Delete any user (including admins)
   - Update any user's role
   - Access all projects

## Technical Details

### RLS Policy Pattern (Projects Example)

```sql
CREATE POLICY "Allow users to view projects" ON projects
    FOR SELECT
    USING (
        -- Super admins can see everything
        (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
        OR
        -- Admins can see everything
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
        OR
        -- Employees can see projects they're assigned to
        EXISTS (
            SELECT 1 FROM project_team
            WHERE project_team.project_id = projects.id
            AND project_team.user_id = auth.uid()
        )
        OR
        -- Clients can see their own projects
        EXISTS (
            SELECT 1 FROM clients
            WHERE clients.id = projects.client_id
            AND clients.user_id = auth.uid()
        )
    );
```

### User Deletion RLS

```sql
CREATE POLICY "Allow super admin to delete users" ON users
    FOR DELETE
    USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
    );
```

### Employee Tasks RLS

```sql
-- Employees can create their own tasks
CREATE POLICY "Allow employees to create tasks" ON employee_tasks
    FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'project_manager')
    );

-- Employees can update their own tasks
CREATE POLICY "Allow employees to update their own tasks" ON employee_tasks
    FOR UPDATE
    USING (
        user_id = auth.uid()
        OR
        (SELECT role FROM users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'project_manager')
    );
```

## Modified Files

1. **app/actions/vendor-operations.ts** - Fixed `updatePayment()` to use service role
2. **supabase/migrations/20250105_add_super_admin_and_fix_employee_projects.sql** - Complete migration for super admin, employee access, and task creation
3. **components/dashboard/employee-dashboard-tabs.tsx** - Fixed "Request a Project" button onClick handler

## Next Steps After Applying Migration

1. ✅ Run the migration in Supabase
2. ✅ Verify `adwait@thelostproject.in` has super_admin role:
   ```sql
   SELECT email, role FROM users WHERE email = 'adwait@thelostproject.in';
   ```
3. ✅ Test employee (Jay) can see assigned projects
4. ✅ Test employee can create tasks (click "+ New Task" in Task Manager)
5. ✅ Test "Request a Project" button redirects to tasks tab
6. ✅ Test super admin can delete users
7. ✅ Redeploy application to Vercel
8. ✅ Test vendor payment editing works without errors

## Verification Queries

```sql
-- Check super admin is set
SELECT email, role FROM users WHERE role = 'super_admin';

-- Check employee project assignments
SELECT
    u.email,
    u.role,
    p.name as project_name
FROM project_team pt
JOIN users u ON u.id = pt.user_id
JOIN projects p ON p.id = pt.project_id
WHERE u.role = 'employee';

-- Check all role values in enum
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
ORDER BY enumlabel;
```
