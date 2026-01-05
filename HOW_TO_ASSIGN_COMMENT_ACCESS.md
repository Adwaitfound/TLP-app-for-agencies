# How to Assign Team Members to View Comments

## Overview

Team member comment access is automatically granted when you assign them to a project. This guide shows you exactly how to do it and manage their access levels.

## Step-by-Step Guide

### Step 1: Open Project Details

```
Dashboard → Projects
    ↓
Click on any project
    ↓
Project details modal opens
```

### Step 2: Go to Team Members Section

```
In the project details modal, scroll down to:
"Team Members" section
```

### Step 3: Click "Assign Member" Button

```
┌─────────────────────────────────┐
│ Team Members                    │
│ [+ Assign Member]     ← Click   │
└─────────────────────────────────┘
```

### Step 4: Select Team Member to Add

```
A dialog appears:

Select Team Member *
[Dropdown Menu ↓]
    - John Developer
    - Sarah Manager
    - Mike Viewer
    - (all available team members)
```

### Step 5: Choose Access Level (Important!)

Two options appear:

#### Option A: Full Access (DEFAULT)

```
☑ Full Access
  └─ Can view comments
  └─ Can reply to comments
  └─ Can edit/delete own replies
  └─ Use for: Producers, Team Leads, Editors
```

#### Option B: Viewer Role

```
☑ Viewer Only (Read-Only)
  └─ Can view comments (read-only)
  └─ Can see file names & timestamps
  └─ CANNOT reply to comments
  └─ Use for: Directors, Clients, Stakeholders
```

### Step 6: Click "Assign"

```
The dialog shows:
- Selected member name
- Selected access level
- [Assign] button

Click "Assign" to confirm
```

### Step 7: Verify in Comment Access Panel

```
After assigning, scroll down to:
"Comment Access" section
    ↓
You should see the newly assigned member
with their access level displayed
```

---

## Full Example Workflow

### Scenario: Add producer with full comment access

**1. Open Project**

```
Projects → Click "Client Brand Video"
```

**2. Find Team Section**

```
Scroll to "Team Members"
Click [+ Assign Member]
```

**3. Select & Configure**

```
Select Team Member: "John Producer"
Access Level: Full Access (default)
Click [Assign]
```

**4. Verify**

```
✅ John Producer now appears in Team Members
✅ In Comment Access section: "John Producer [Full Access]"
✅ John can now see all comments and reply
```

---

### Scenario: Add director for approval (read-only)

**1. Open Project**

```
Projects → Click "Brand Video Project"
```

**2. Find Team Section**

```
Scroll to "Team Members"
Click [+ Assign Member]
```

**3. Select & Configure**

```
Select Team Member: "Sarah Director"
Access Level: ☑ Viewer Only
Click [Assign]
```

**4. Verify**

```
✅ Sarah Director now appears in Team Members
✅ In Comment Access section: "Sarah Director [Viewer (R-O)]"
✅ Sarah can view comments but cannot reply
```

---

## Managing Comment Access After Assignment

### To Change Access Level:

1. **Remove** the team member (click trash icon)
2. **Re-add** with the correct access level

### To Remove Team Member:

```
Team Members section
    ↓
Click [trash icon] next to member name
    ↓
Member removed from project
    ↓
They lose access to comments
```

### To View Current Access:

```
Scroll to "Comment Access" section
    ↓
See all team members with their access level
    ↓
Shows who can reply vs who can only view
```

---

## Access Levels Explained

### Full Access

```
Who gets it:
- Producers
- Team Leads
- Account Managers
- Project Managers

Permissions:
✅ View all comments
✅ See file references & timestamps
✅ Reply to comments
✅ Edit own replies
✅ Delete own replies
✅ Admin can delete any reply
```

### Viewer (Read-Only)

```
Who gets it:
- Directors (approval only)
- Stakeholders (oversight)
- Clients (internal team)
- QA/Review personnel

Permissions:
✅ View all comments
✅ See file references & timestamps
❌ Cannot reply to comments
❌ Cannot edit anything
❌ Cannot delete anything
```

---

## Common Scenarios

### Adding New Team Member to Existing Project

1. Project is already running
2. New producer joins team
3. They need to see all client feedback
4. **Solution**: Assign to project with "Full Access"
5. They immediately get comment access

### Client Wants to See Feedback

1. Client team member needs to view comments
2. But only internal team should reply
3. **Solution**: Assign with "Viewer" role
4. They can read but not reply

### Removing Access Temporarily

1. Team member on leave
2. Don't want them seeing new feedback
3. **Solution**: Remove from project (trash icon)
4. Re-add when they return

---

## Troubleshooting

### Team Member Can't See Comments

**Check**:

1. Is member assigned to project? (Check Team Members section)
2. Look at Comment Access panel
3. If not there: Click "Assign Member" to add them
4. If there: Check their access level

### Want to Remove Reply Permission

**Solution**:

1. Remove member from project
2. Re-add with "Viewer" role only

### Can't Find Team Member in Dropdown

**Solutions**:

- Member must be created first (Users page)
- Member must have proper role (admin, project_manager, employee)
- Member email must be verified

---

## Quick Reference Table

| Access Level | View | File Info | Timestamp | Reply | Edit   | Delete |
| ------------ | ---- | --------- | --------- | ----- | ------ | ------ |
| Full Access  | ✅   | ✅        | ✅        | ✅    | ✅ Own | ✅ Own |
| Viewer       | ✅   | ✅        | ✅        | ❌    | ❌     | ❌     |
| Not Assigned | ❌   | ❌        | ❌        | ❌    | ❌     | ❌     |

---

## Best Practices

### 1. Principle of Least Privilege

- Start with Viewer role
- Upgrade to Full Access only if needed

### 2. Role Clarity

- **Producer**: Full Access (needs to manage responses)
- **Director**: Viewer (approval only)
- **Client Team**: Viewer (transparency)

### 3. Regular Review

- Check Comment Access monthly
- Remove inactive members
- Update roles if responsibilities change

### 4. Documentation

- Note in team comments who can reply
- Inform clients about their access level
- Brief team on comment etiquette

---

## Tips & Tricks 💡

1. **Batch Assignment**: Assign multiple team members one-by-one
2. **Quick Access View**: Comment Access panel shows everyone at once
3. **Status Badges**: Color-coded badges show access level instantly
4. **Auto-Inherit**: All new members start with Full Access unless you change it

---

**Last Updated**: January 5, 2026
**Related Docs**: [Admin Comment Features](ADMIN_COMMENT_FEATURES.md)
