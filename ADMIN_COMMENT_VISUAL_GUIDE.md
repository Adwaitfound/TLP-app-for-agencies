# Quick Visual Guide - Admin Comment Dashboard

## What You'll See Now in Admin Comments Tab

### 1. Comment Card Layout

```
┌─────────────────────────────────────────────────┐
│                                                  │
│ [A] Client Name            [CLIENT ROLE BADGE]  │
│     Posted: Jan 5, 10:47 AM                     │
│                                                  │
│ sdcsddds                                         │
│                                                  │
│ ┌────────────────────────────────────────────┐  │
│ │ 📄 Linked file: Halter Neck Racerback [VIDEO]│
│ │ 🕐 Timestamp: 34s                            │
│ └────────────────────────────────────────────┘  │
│                                                  │
│ [Show Responses (2)]                            │
│                                                  │
│   └─ Admin Response 1                           │
│   └─ Admin Response 2                           │
│                                                  │
│ [Reply Input Area - Admin Only]                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 2. Comment Access Panel (Admins Only)

```
┌─────────────────────────────────────────────────┐
│ Comment Access                                  │
│                                                  │
│ All assigned team members can view and respond  │
│ to comments by default. Viewers can see         │
│ comments but cannot reply.                      │
│                                                  │
│ [J] John Developer              [Full Access]   │
│ [S] Sarah Viewer               [Viewer (R-O)]   │
│ [M] Mike Manager               [Full Access]    │
│                                                  │
│ 💡 Tip: Assign team members with "Viewer"      │
│    role to restrict comment editing to          │
│    admins only.                                 │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Where to Find It

1. **Admin Dashboard** → Projects tab
2. Click on any project → Opens project details modal
3. Scroll down to **"Project Comments"** section
4. Below Team Members, you'll see **"Comment Access"** panel

## Key Information Displayed

### In Each Comment:

- ✅ **Client Name & Avatar** - Who posted it
- ✅ **Posted Date & Time** - When comment was made
- ✅ **Comment Text** - The actual feedback
- ✅ **Linked File** - Which file it refers to (with type)
- ✅ **Timestamp** - Exact moment in video/document (in seconds)
- ✅ **Client Role** - Shows if they're a client or employee

### In Comment Access Panel:

- ✅ **Team Member Names** - All assigned to project
- ✅ **Access Level** - Full Access or Read-Only (Viewer)
- ✅ **Quick Reference** - See who can reply vs just view
- ✅ **Status Badges** - Clearly marked access levels

## File & Timestamp Example

### Client Comment:

```
"Check the color at 45s - looks too dark on iPad"

Linked file: Final_Edit_v2.mp4 [VIDEO]
Timestamp: 45s
```

### What This Means:

- Client uploaded feedback about a specific video file
- Issue is at exactly 45 seconds into the video
- You can tell team members: "Look at 45 seconds in Final_Edit_v2.mp4"

## Team Member Access Levels

### Full Access ✅

- See all comments
- See file names & timestamps
- **Can reply to comments**
- Can edit/delete own replies
- Can view attachments

### Viewer (Read-Only) 👁️

- See all comments
- See file names & timestamps
- **Cannot reply to comments**
- Cannot edit/delete
- Can view attachments
- Perfect for: Producers, Directors (oversight only)

## How Access is Managed

1. **Default**: All team members get **Full Access**
2. **To limit access**: When assigning team member to project, select **"Viewer"** role
3. **Automatic**: Panel shows current access level for each member

## File Types Shown

When client links a file, you'll see:

- 📄 **PDF** - Documents, PDFs
- 📝 **DOCUMENT** - Word docs, text files
- 🖼️ **IMAGE** - JPG, PNG, etc.
- 🎥 **VIDEO** - MP4, MOV, etc.
- 📊 **OTHER** - Any other file type

---

## Pro Tips 💡

1. **For Review-Only Teams**: Assign with "Viewer" role
2. **For Client Feedback**: Look for timestamp to find exact issue
3. **For Video Projects**: Timestamp helps locate scene/cut quickly
4. **For File Issues**: File name tells you exactly which version they're talking about
5. **For Team Coordination**: Comment Access panel is single source of truth for who can reply

---

**Summary**: Clients now send targeted feedback with exact file references and timestamps. You see everything in one organized dashboard with clear team member access controls.
