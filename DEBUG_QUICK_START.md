# 🚀 Quick Start - New Debugging Features

## Restart Your Dev Server

```bash
# Press Ctrl+C in the npm terminal
npm run dev
```

Wait for it to start: "Ready in X.XXXs"

---

## Open Your App

Go to http://localhost:3000 and login

---

## Find the Debug Console

Look at the **bottom-right corner** 👇

You'll see a **🐛** emoji button

Click it → logs appear in a panel

---

## Test It Out

### 1. Watch Initial Load
Just opening the app triggers logs:
```
FETCH_DATA: Starting data fetch...
FETCH_DATA: Projects fetched (5 projects)
FETCH_DATA: Clients fetched (3 clients)
FETCH_DATA: Fetching team members...
FETCH_DATA: Team members mapped (2 projects have teams)
```

### 2. Check Project Cards
Scroll down to see projects - now they show:
```
🎬 Project Name
📌 Client Name
👤 Created by: John Doe
👥 Team Members: Jane Smith, Alice Johnson  ← NEW!
📈 Progress: 75% complete
```

### 3. Test Team Assignment
1. Click **"Team"** button on any project
2. Select a user from dropdown
3. Click **"Add Team Member"**

Watch the logs in real-time:
```
✅ ASSIGN_TEAM: Start team assignment
✅ ASSIGN_TEAM: Team member inserted
✅ ASSIGN_TEAM: Fetching updated team members...
✅ FETCH_TEAM: Raw data from query { count: 1 }
✅ FETCH_TEAM: Members processed
✅ ASSIGN_TEAM: Members updated
```

The member should appear in the dialog instantly!

---

## Troubleshooting in 30 Seconds

**Team member doesn't appear after assignment?**

1. Open Debug Console (🐛)
2. Look for `FETCH_TEAM: Raw data from query`
3. Check the `count` value
   - If 0 → Database issue (run diagnostic SQL)
   - If > 0 → Rendering issue (refresh page)

---

## Browser Console Power

Press F12 → Console tab → Type:

```javascript
// See all logs as table
debug.printSummary()

// Get logs for specific operation
debug.getLogs().filter(l => l.context === 'ASSIGN_TEAM')

// Download logs to file
debug.downloadLogs()
```

---

## Files You Need to Know About

| File | Purpose |
|------|---------|
| `lib/debug.ts` | Core logging (don't touch) |
| `components/debug-console.tsx` | Visual panel (don't touch) |
| `DEBUGGING_GUIDE.md` | Complete reference |
| `DEBUG_FEATURES_SUMMARY.md` | This feature overview |

---

## What Changed

### ✅ Team Members Now Visible
Projects show all assigned team members as badges

### ✅ Real-Time Logging
Every operation is tracked with timestamps and data

### ✅ Debug Console
Floating panel for instant log viewing

### ✅ Team Visibility Confirmed
If team members show in logs but not UI → you found the bug

---

## Expected Behavior

### ✅ Healthy App
```
Logs show: "Team members mapped { projectsWithTeam: X }"
Project cards show: Assigned team members
Assignment works: Log shows full flow completing
```

### ❌ Problem Signs
```
Logs show: "Team data received { count: 0 }"
→ Team assignments not in database
→ Run: DIAGNOSE_TEAM_ASSIGNMENTS.sql

Logs show: "FETCH_TEAM: Query error"
→ Query syntax or RLS policy wrong
→ Check error code in debug logs
```

---

## That's It! 🎉

You're now set up with **enterprise-grade debugging**!

The debug console will help us fix bugs **10x faster**.

---

## Need Help?

1. **Check logs in debug console** - most issues visible there
2. **Open browser console (F12)** - type `debug.getLogs()`
3. **Share the logs** - copy from console or download JSON
4. **Check DEBUGGING_GUIDE.md** - has all the details

Let's find and fix these issues! 🚀
