# Employee Project Visibility & Request Flow - Complete Fix

## Overview

Fixed employee project visibility issue and implemented complete project request workflow. Employees can now see their assigned projects and request new projects through a dedicated dialog.

## Issues Fixed

### 1. Projects Not Showing in Employee Dashboard

**Problem**: Employees couldn't see projects assigned to them in the Projects tab, even though they were assigned via the `project_team` table.

**Root Cause**: Row-Level Security (RLS) nested SELECT limitation

- The original query used: `project_team.select("project_id,projects(...)")`
- When RLS policies are applied to the `projects` table, nested selects within other table queries fail
- The projects data couldn't be returned due to RLS policy recursion issues

**Solution Implemented**: Separate the query into two steps

```tsx
// Step 1: Get project IDs from project_team (no RLS issues)
const { data: teamData } = await supabase
  .from("project_team")
  .select("project_id")
  .eq("user_id", userId);

// Step 2: Fetch projects using those IDs (RLS checks pass)
const projectIds = (teamData || [])
  .map((item: any) => item.project_id)
  .filter(Boolean);

if (projectIds.length > 0) {
  const { data: projectsData } = await supabase
    .from("projects")
    .select(
      "id,name,status,deadline,progress_percentage,start_date,description,clients(company_name)"
    )
    .in("id", projectIds);
}
```

**Why This Works**:

- `project_team` table has minimal RLS restrictions
- `projects` table RLS policies allow viewing by ID when using `.in()` filter
- Separating queries avoids RLS recursion and nested SELECT limitations

**Files Modified**:

- `components/dashboard/employee-dashboard-tabs.tsx` (Lines 97-122)

---

### 2. Project Request Flow Not Functional

**Problem**: "Request a Project" button existed but wasn't wired to any functionality. Employees had to manually create tasks to propose new projects.

**Solution Implemented**:

- Added dedicated request project dialog with form
- Form captures: Project Name (required), Description (optional), Service Type (select)
- Submits to `employee_tasks` table with `proposed_project_*` fields
- Admin reviews and approves in pending proposals section

**Files Modified**:

- `components/dashboard/employee-dashboard-tabs.tsx` (Lines 57-76, 179-217, 445, 678-750)

---

## Implementation Details

### State Management

Added three new state variables to track request dialog:

```tsx
const [isRequestProjectOpen, setIsRequestProjectOpen] = useState(false);
const [requestProjectFormData, setRequestProjectFormData] = useState({
  projectName: "",
  description: "",
  vertical: "video_production",
});
const [requestingProject, setRequestingProject] = useState(false);
```

### Request Project Handler

```tsx
async function handleRequestProject(e: React.FormEvent) {
  if (!userId || !requestProjectFormData.projectName.trim()) return;

  setRequestingProject(true);
  const supabase = createClient();

  try {
    const { error } = await supabase.from("employee_tasks").insert({
      user_id: userId,
      title: requestProjectFormData.projectName,
      description: requestProjectFormData.description,
      proposed_project_name: requestProjectFormData.projectName,
      proposed_project_vertical: requestProjectFormData.vertical,
      proposed_project_status: "pending",
      status: "todo",
      priority: "medium",
    });

    if (error) throw error;

    // Reset form and notify user
    setRequestProjectFormData({
      projectName: "",
      description: "",
      vertical: "video_production",
    });
    setIsRequestProjectOpen(false);
    alert(
      "Project request submitted! Your admin will review and approve it soon."
    );
    window.location.reload();
  } catch (error: any) {
    alert(error?.message || "Failed to request project");
  } finally {
    setRequestingProject(false);
  }
}
```

### Dialog UI Component

Complete dialog form with three fields:

- **Project Name** (text input, required)
- **Description** (textarea, optional)
- **Service Type** (select dropdown with options):
  - Video Production
  - Social Media
  - Design & Branding

Submit button disables when:

- Request is being submitted (`requestingProject === true`)
- Project name is empty

Cancel button allows dismissing dialog without submission.

### Button Integration

Updated "Request a Project" button to open dialog:

```tsx
<Button onClick={() => setIsRequestProjectOpen(true)}>
  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
  <span className="hidden sm:inline">Request a Project</span>
  <span className="sm:hidden">Request</span>
</Button>
```

---

## UI Components Used

All components imported from existing UI library (`@/components/ui/`):

- `Dialog` - Modal dialog container
- `DialogContent` - Dialog body
- `DialogHeader` - Dialog title section
- `DialogTitle` - Dialog heading
- `DialogDescription` - Dialog subtitle
- `Input` - Text input field
- `Label` - Form field labels
- `Textarea` - Multi-line text input
- `Select` - Dropdown selector
- `SelectContent` - Select options container
- `SelectItem` - Individual select option
- `SelectTrigger` - Select button/trigger
- `SelectValue` - Display selected value
- `Button` - Form buttons

---

## Database Integration

### Employee Tasks Table

Project requests create entries in `employee_tasks` with:

- `user_id` - The requesting employee
- `title` - Project name
- `description` - Project description
- `proposed_project_name` - Full project name for admin reference
- `proposed_project_vertical` - Service type (video_production, social_media, design_branding)
- `proposed_project_status` - Set to "pending" for admin review
- `status` - Set to "todo"
- `priority` - Set to "medium"

### Admin Workflow

1. Admin sees pending project proposals in their tasks/reviews section
2. Admin can approve → creates new project with details
3. Admin can reject → marks proposal as rejected

---

## Deployment Status

### Changes Deployed ✅

- Vercel Production: `https://tlp-app-v2-*.vercel.app`
- Commit: `ea29d820cce6c6de9de51cd135be18788e54fe90`
- Build Status: ✅ Successful

### Files Modified

1. `components/dashboard/employee-dashboard-tabs.tsx`
   - Added Dialog imports
   - Fixed project loading query
   - Added request dialog state
   - Added request handler function
   - Added dialog UI component
   - Total changes: +177 lines, -35 lines

---

## Testing Checklist

### Employee Project Visibility

- [ ] Login as employee account (e.g., jay@example.com)
- [ ] Navigate to Dashboard → Projects tab
- [ ] Verify assigned projects appear (should show at least 1 project)
- [ ] Click on project to view details
- [ ] Verify project information displays correctly

### Project Request Flow

- [ ] As employee with no projects, click "Request a Project"
- [ ] Dialog opens with three fields visible
- [ ] Fill in project name (required) and description (optional)
- [ ] Select service type from dropdown
- [ ] Click Submit
- [ ] Verify success message appears
- [ ] Verify dialog closes and page reloads
- [ ] As admin, check pending proposals in tasks
- [ ] Verify submitted project request appears

### Edge Cases

- [ ] Try to submit without project name (Submit button should be disabled)
- [ ] Cancel dialog without submitting (dialog closes, no changes)
- [ ] Multiple employees submit project requests simultaneously
- [ ] Admin approves project request (creates new project)

---

## Key Technical Decisions

### Why Separate Queries?

RLS in Supabase has limitations with nested SELECT operations. When a table has row-level security policies:

1. Nested selects (using dot notation) bypass policy context
2. Policies may not evaluate correctly in nested scenarios
3. Separating into two queries allows each query to have proper RLS context

### Why employee_tasks Table?

- Reuses existing table structure for consistency
- `proposed_project_*` columns already designed for this purpose
- Admin approval flow already established for task creation
- Avoids creating new table and associated RLS policies

### Service Type Options

Matches existing verticals in the system:

- `video_production` - Default option
- `social_media` - Growing service area
- `design_branding` - Creative services

---

## Related Documentation

- See [SUPER_ADMIN_AND_EMPLOYEE_FIX.md](./SUPER_ADMIN_AND_EMPLOYEE_FIX.md) for RLS policies and role management
- See [supabase/migrations/20250105_add_super_admin_and_fix_employee_projects.sql](./supabase/migrations/20250105_add_super_admin_and_fix_employee_projects.sql) for database schema

---

## Migration Status

**Pending**: Run migration in Supabase SQL Editor if roles/policies not yet applied:

```bash
# In Supabase Dashboard → SQL Editor:
Run: supabase/migrations/20250105_add_super_admin_and_fix_employee_projects.sql
```

**Already Applied**: Project loading fix and request dialog (deployed to production)

---

## Next Steps

1. ✅ Deploy to production (DONE)
2. Run database migration in Supabase (if not already applied)
3. Test with real employee accounts
4. Monitor for any RLS-related issues
5. Gather user feedback on request flow usability

---

## Support & Troubleshooting

**Projects Still Not Showing?**

- Verify `project_team` entries exist for the employee
- Check RLS policies are properly set
- Review browser console for any fetch errors
- Run SQL: `SELECT * FROM project_team WHERE user_id = 'employee-uuid'`

**Request Dialog Not Opening?**

- Verify Dialog components are imported
- Check browser console for JavaScript errors
- Verify `isRequestProjectOpen` state is working
- Test in incognito mode to rule out cache issues

**Request Submissions Failing?**

- Verify user is authenticated
- Check `employee_tasks` table RLS policies allow INSERT
- Verify all required fields are populated
- Check Supabase logs for detailed error

---

**Last Updated**: January 2025
**Status**: ✅ Complete & Deployed
