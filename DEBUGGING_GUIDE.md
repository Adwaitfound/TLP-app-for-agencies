# 🐛 Comprehensive Debugging Guide

## What's Been Added

### 1. **Debug Utility** (`lib/debug.ts`)
A powerful logging system that tracks every action with:
- Timestamp (millisecond precision)
- Context label
- Message
- Data payload
- Color-coded by level (log, warn, error, success)

### 2. **Debug Console Component** (`components/debug-console.tsx`)
Floating debug panel visible in your app:
- Shows all logs in real-time
- Collapsible for minimal footprint
- Download logs as JSON
- Clear logs anytime

### 3. **Enhanced Logging in Projects Page**
Every major operation now logs:
- `FETCH_DATA` - Initial data loading
- `FETCH_TEAM` - Team member fetching
- `ASSIGN_TEAM` - Team member assignment
- `EDIT_PROJECT` - Project editing
- And more...

### 4. **Team Members Visible in Project List**
Projects now show:
- Project creator name
- **All assigned team members with badges**
- Progress percentage

---

## How to Use

### Finding the Debug Console

Look at the bottom-right corner of the app - you'll see a 🐛 emoji button.

**Click it to:**
- Expand/collapse the debug logs
- See all recent operations
- Download logs for analysis
- Clear logs

### Understanding the Logs

**Log Format:**
```
[HH:MM:SS.mmm] CONTEXT: Message { data... }
```

**Color Coding:**
- 🔵 Blue = Normal log
- 🟡 Orange = Warning
- 🔴 Red = Error
- 🟢 Green = Success

**Examples:**
```
[14:32:15.234] FETCH_DATA: Projects fetched { count: 5 }
[14:32:16.102] ASSIGN_TEAM: Start team assignment { projectId: "abc-123", userId: "def-456" }
[14:32:16.450] ASSIGN_TEAM: Team member inserted { projectId: "abc-123", userId: "def-456" }
[14:32:16.623] FETCH_TEAM: Raw data from query { projectId: "abc-123", count: 1 }
[14:32:16.651] FETCH_TEAM: Members processed { projectId: "abc-123", members: [{email: "user@example.com"}] }
[14:32:16.751] ASSIGN_TEAM: Members updated { members: ["user@example.com"] }
```

---

## Testing Workflow

### Test 1: Initial Load
**Expected logs:**
```
FETCH_DATA: Starting data fetch...
FETCH_DATA: Projects fetched { count: X }
FETCH_DATA: Clients fetched { count: X }
FETCH_DATA: Fetching team members for projects...
FETCH_DATA: Team data received { rawCount: X }
FETCH_DATA: Team members mapped { projectsWithTeam: X, teamMap: {...} }
```

**Check:**
- ✅ Team count matches database
- ✅ Team map shows correct structure
- ✅ All teams visible in project cards

### Test 2: Assign Team Member
**Steps:**
1. Click "Team" button on a project
2. Select a user from dropdown
3. Click "Add Team Member"

**Expected logs in order:**
```
ASSIGN_TEAM: Start team assignment { projectId: "...", userId: "..." }
ASSIGN_TEAM: Team member inserted { projectId: "...", userId: "..." }
ASSIGN_TEAM: Fetching updated team members...
FETCH_TEAM: Query error (if any) OR
FETCH_TEAM: Raw data from query { projectId: "...", count: 1 }
FETCH_TEAM: Members processed { projectId: "...", members: [{...}] }
ASSIGN_TEAM: Members updated { members: ["user@email.com"] }
```

**Check:**
- ✅ User inserted to database
- ✅ Fetch returns the new member
- ✅ Member appears in dialog immediately
- ✅ Member shows in project card with badge

### Test 3: Verify Team Visibility
**Expected in project list:**
```
Project Name
Client Name
⭐ John Doe    👥 Jane Smith    📈 50% complete
```

The team member badges should show all assigned users.

---

## Troubleshooting with Logs

### Scenario 1: Team members not appearing after assignment

**What to check in logs:**
1. Did `ASSIGN_TEAM: Team member inserted` appear? 
   - If NO → Database insert failed
   - If YES → Continue

2. Did `FETCH_TEAM: Raw data from query` show count > 0?
   - If NO → Query returned no rows (why?)
   - If YES → Continue

3. Did `FETCH_TEAM: Members processed` show the member?
   - If NO → Mapping is broken
   - If YES → State update issue (check React DevTools)

### Scenario 2: Query errors

**Log Pattern:**
```
FETCH_TEAM: Query error: { code: "PGRST201", message: "..." }
```

**Solution:**
- Check the error message in logs
- If "relationship not found" → Query syntax wrong
- If "permission denied" → RLS policy issue
- Run diagnostic SQL to verify data exists

### Scenario 3: Empty team count

**Log Pattern:**
```
FETCH_DATA: Team data received { rawCount: 0 }
FETCH_DATA: Team members mapped { projectsWithTeam: 0, teamMap: {} }
```

**Solutions:**
1. Run diagnostic SQL (Query 1) to check if assignments exist
2. Check browser console for full error
3. Verify users have correct roles (admin/project_manager)

---

## Console Commands (Browser DevTools)

You can access the debug instance directly in browser console:

```javascript
// In browser console (F12 → Console tab)

// Get all logs
debug.getLogs()

// Print summary table
debug.printSummary()

// Export logs
debug.exportLogs()

// Download logs as JSON
debug.downloadLogs()

// Clear logs
debug.clearLogs()

// Get logs for specific context
debug.getLogs().filter(l => l.context === 'ASSIGN_TEAM')

// Get only errors
debug.getLogs().filter(l => l.level === 'error')

// Get last 10 logs
debug.getLogs().slice(-10)
```

**Example Usage:**
```javascript
// In browser console
const logs = debug.getLogs()
console.table(logs)  // Show as table

// Find all team-related logs
const teamLogs = logs.filter(l => l.context.includes('TEAM'))
console.table(teamLogs)

// Check for errors
const errors = logs.filter(l => l.level === 'error')
console.log('Total errors:', errors.length)
```

---

## What Each Context Tracks

### `FETCH_DATA`
Initial page load and periodic refreshes
- Projects count
- Clients count  
- Team members mapping
- Any fetch errors

### `FETCH_TEAM`
Fetching team members for a specific project
- Query execution
- Raw data count
- Processed members
- Mapping results

### `ASSIGN_TEAM`
Assigning user to project
- Start state
- Duplicate check
- Database insert
- Fetch updated members

### `EDIT_PROJECT` (to be added)
Editing project details

### `REMOVE_TEAM` (to be added)
Removing team member from project

---

## Common Log Patterns

### ✅ Healthy flow (team assignment):
```
1. ASSIGN_TEAM: Start team assignment
2. ASSIGN_TEAM: Team member inserted ✓
3. ASSIGN_TEAM: Fetching updated team members...
4. FETCH_TEAM: Raw data from query
5. FETCH_TEAM: Members processed
6. ASSIGN_TEAM: Members updated ✓
```

### ❌ Broken flow (member not appearing):
```
1. ASSIGN_TEAM: Start team assignment
2. ASSIGN_TEAM: Team member inserted ✓
3. ASSIGN_TEAM: Fetching updated team members...
4. FETCH_TEAM: Raw data from query { count: 0 } ✗
   → Data was inserted but not returned
   → Check: Database, RLS policies, query syntax
```

### ❌ Another broken flow (error on insert):
```
1. ASSIGN_TEAM: Start team assignment
2. ASSIGN_TEAM: Assignment failed { code: "23505" }
   → Unique constraint violated (user already assigned)
   → This is correctly handled with user message
```

---

## Next Steps

1. **Restart your dev server** to load all changes
2. **Click the 🐛 button** to open debug console
3. **Perform a test** (load page, assign team member)
4. **Check the logs** to see detailed flow
5. **Share logs** if something looks wrong

---

## Debug Features Summary

| Feature | Location | Purpose |
|---------|----------|---------|
| Debug Utility | `lib/debug.ts` | Core logging system |
| Debug Console | Bottom-right 🐛 | Visual log viewer |
| Enhanced Logging | `projects/page.tsx` | All operations tracked |
| Team Badges | Project cards | Shows assigned members |
| Debug Panel (dev mode) | Team dialog (yellow box) | Project-level debugging |

---

## Accessing Logs When App Crashes

Even if the app breaks, logs remain in memory:

1. Open Browser DevTools (F12)
2. Go to Console tab
3. Type: `debug.getLogs()`
4. Press Enter
5. All logs visible in console
6. Type: `debug.downloadLogs()` to save them

This persists even across page reloads (until manual refresh)!
