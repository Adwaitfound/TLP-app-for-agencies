# 🔍 Team Members Not Showing - Troubleshooting Guide

## Recent Fixes Applied

### 1. Added useEffect to Fetch Team Members
- Team members are now automatically fetched when dialog opens
- Fetches whenever `isTeamDialogOpen` or `selectedProject.id` changes

### 2. Enhanced Debug Panel
Now shows:
- Project ID
- Team member count
- Whether data exists
- Total projects with teams
- List of member emails (when data exists)

### 3. Added Manual Refresh Button
- Click the refresh icon in the dialog header to reload team members

---

## How to Diagnose the Issue

### Step 1: Check the Database
Run `DIAGNOSE_TEAM_ASSIGNMENTS.sql` in Supabase SQL Editor to see:
- All team member assignments
- Count per project
- Any orphaned data
- Duplicate assignments

### Step 2: Check Browser Console
1. Open browser console (F12)
2. Open a project's Team dialog
3. Look for these logs:
   - "Team dialog opened, fetching members for project: [ID]"
   - "=== ASSIGN TEAM MEMBER START ==="
   - "Fetched team data:"
   - "Processed team members:"

### Step 3: Check Debug Panel
In the Team Member dialog, look at the yellow debug panel:
- **Project ID**: Should match the project you selected
- **Team Count**: Should show number of assigned members
- **Has Team Data**: Should say "Yes" if members exist
- **Members**: Should list all member emails

---

## Common Issues & Solutions

### Issue 1: Team members exist in database but don't show in UI

**Check:**
```sql
-- Run in Supabase SQL Editor
SELECT * FROM project_team WHERE project_id = 'your-project-id';
```

**Solution:**
- Click the **Refresh button** in the dialog
- Check browser console for errors
- Look for "Error fetching team members" logs

### Issue 2: Query returns "relationship not found" error

**This should be FIXED now**, but if you still see it:
- Make sure you restarted the dev server
- Check that the query uses `user:users!user_id(...)`

### Issue 3: Data is fetched but state doesn't update

**Check Console for:**
- "Fetched team data: [...]" - Should show array of objects
- "Processed team members: [...]" - Should show array of users

**If data is null/empty:**
- Foreign key might be broken (user was deleted)
- Run diagnostic query #3 to check for orphaned assignments

### Issue 4: Duplicate assignments preventing fetch

**Run:**
```sql
SELECT project_id, user_id, COUNT(*) 
FROM project_team 
GROUP BY project_id, user_id 
HAVING COUNT(*) > 1;
```

**Fix:**
```sql
-- Remove duplicates, keeping the oldest
DELETE FROM project_team 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM project_team 
  GROUP BY project_id, user_id
);
```

---

## Testing Steps

1. **Restart Dev Server** (to load new code):
   ```bash
   # In terminal, press Ctrl+C
   npm run dev
   ```

2. **Open a Project's Team Dialog**:
   - Go to Projects page
   - Click the "Team" button on any project
   - Check the yellow debug panel

3. **Try Assigning a Team Member**:
   - Select a user from dropdown
   - Click "Add Team Member"
   - Check console logs for the full flow
   - Dialog should stay open
   - Debug panel should update with new count
   - Member should appear in list

4. **Try Manual Refresh**:
   - Click the refresh icon in dialog header
   - Console should show "Team dialog opened, fetching members..."
   - Data should reload

---

## If Team Members Still Don't Show

### Option A: Force Refresh All Team Data
Add this temporary button to manually reload everything:

1. Open browser console
2. Paste this code:
```javascript
// Force reload all team data
window.location.reload()
```

### Option B: Check RLS Policies
Team members might be hidden by Row Level Security:

```sql
-- Check RLS policies on project_team
SELECT * FROM pg_policies WHERE tablename = 'project_team';

-- Temporarily disable RLS to test (ONLY FOR TESTING)
ALTER TABLE project_team DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE project_team ENABLE ROW LEVEL SECURITY;
```

### Option C: Verify User Data Exists
```sql
-- Check if users table has the team members
SELECT id, email, full_name, role 
FROM users 
WHERE role IN ('admin', 'project_manager');
```

---

## Expected Behavior After Fixes

✅ **When you open Team dialog:**
- Console: "Team dialog opened, fetching members for project: [ID]"
- Debug panel shows project ID and team count
- Team members list populates immediately

✅ **When you assign a team member:**
- Console: "=== ASSIGN TEAM MEMBER START ==="
- Console: "Team member inserted successfully"
- Console: "Fetching updated team members..."
- Console: "Updated members returned: [array]"
- Dialog stays open
- Debug panel updates
- New member appears in list

✅ **When you click refresh:**
- Console: "Team dialog opened, fetching members..."
- Data reloads from database
- List updates

---

## Next Steps

1. **Restart your dev server**
2. **Run DIAGNOSE_TEAM_ASSIGNMENTS.sql** to see what's in your database
3. **Open a project's Team dialog** and check the debug panel
4. **Share the console logs** if team members still don't appear

The enhanced logging will help us pinpoint exactly where the issue is!
