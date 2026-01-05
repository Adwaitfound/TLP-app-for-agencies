# Admin Dashboard Comment Features - Update Guide

## Overview

The comment system has been enhanced to display client comments with all associated metadata (file and timestamp information) and provide clear access control management for team members.

## New Features in Admin Dashboard

### 1. **Enhanced Comment Display**

Admin dashboard now shows complete comment information from clients:

#### Comment Details Displayed:

- **Author Information**: Client name and role badge
- **Timestamp**: When the comment was created
- **Comment Text**: Full comment content
- **Associated File** (if linked):
  - File name
  - File type badge (PDF, DOC, IMG, VID, etc.)
  - Direct link to view file
- **Timestamp Marker** (if provided):
  - Video/document timestamp in seconds
  - Useful for feedback on specific parts of videos

#### Example Structure:

```
┌─ Comment Card
│  ├─ Author: Client Name [Client Badge]
│  ├─ Posted: Jan 5, 2026, 10:47 AM
│  ├─ Comment: "sdcsddds"
│  ├─ Linked file: Halter Neck Racerback [VIDEO]
│  └─ Timestamp: 34s
└─ [Show Responses] button with count
```

### 2. **Comment Access Management**

New "Comment Access" section in project details for admins:

#### Features:

- **View All Team Members**: See who has access to comments
- **Access Levels**:
  - **Full Access**: Can view, reply, and edit comments
  - **Viewer (Read-Only)**: Can view comments but cannot reply
- **Quick Reference**: Shows role assignment for each team member

#### How to Grant Access:

1. Open project details
2. Go to "Comment Access" section
3. Team members shown with their access level
4. Access is automatically granted when assigning team members to projects:
   - Default role = Full Access
   - "Viewer" role = Read-Only Access

### 3. **Database Query Updates**

Updated `fetchProjectComments` to include:

```typescript
.select(`*,
  user:users!user_id(id, full_name, email, role),
  file:project_files!file_id(id, file_name, file_type, file_url)
`)
```

This now fetches:

- Complete user information
- Linked file details (name, type, URL)
- Timestamp information
- All metadata needed for display

## UI Improvements

### Comment Card Layout:

```
[Avatar] Name                                    [Role Badge]
         Posted: Date and Time

Comment text here...

Linked file: FileName                         [FILE TYPE]
Timestamp: 34s

[Show Responses (2)] ← Expandable replies section
```

### Comment Access Panel:

```
Comment Access

All assigned team members can view and respond to comments
by default. Viewers can see comments but cannot reply.

[Avatar] Team Member Name        [Full Access]
[Avatar] Another Member          [Viewer (Read-Only)]

💡 Tip: Assign team members with "Viewer" role to restrict
comment editing to admins only.
```

## Access Control Matrix

| Role              | View Comments    | Reply to Comments | Edit Replies | Delete Replies |
| ----------------- | ---------------- | ----------------- | ------------ | -------------- |
| Admin             | ✅ All           | ✅                | ✅ Own & All | ✅ Own & All   |
| Project Manager   | ✅ Own Projects  | ✅                | ✅ Own       | ✅ Own         |
| Employee (Full)   | ✅ Assigned Only | ✅                | ✅ Own       | ✅ Own         |
| Employee (Viewer) | ✅ Assigned Only | ❌                | ❌           | ❌             |
| Client            | ✅ Own Project   | ✅                | ❌           | ❌             |

## File Information Display

### Supported File Metadata:

- **File Name**: Complete original filename
- **File Type**: Detected automatically
- **File URL**: Clickable link to view
- **File Size**: Optional

### File Type Indicators:

- 📄 PDF - `pdf`
- 📝 DOC/DOCX - `document`
- 🖼️ Image - `image`
- 🎥 Video - `video`
- 📊 Other - `other`

## Timestamp Markers

### Purpose:

Allow clients to reference specific moments in videos or documents

### Format:

- **Input**: Decimal seconds (e.g., 34.5, 120)
- **Display**: "Timestamp: 34.5s"
- **Use Case**: "Please check at 1:23 (83s) where the transition seems rough"

### Example Client Comments:

1. "Check the color grading at 45.5s - looks too dark"
2. "Logo doesn't display correctly at 2:15 on iPad"
3. "Music sync issue around 1:30"

## How to Use in Practice

### For Admins:

1. **Review Client Feedback**: Open project → Comments tab
2. **See Full Context**: File name and timestamp let you jump to exact location
3. **Manage Team Access**: Use Comment Access panel to control who can reply
4. **Respond to Comments**: Click "Show Responses" → Type response as admin

### For Team Members:

1. **Viewer Access**: Can see all comments and responses, cannot reply
2. **Full Access**: Can see comments, file details, timestamps, and reply to comments
3. **Profile Assignment**: Your access level shown in Comment Access panel

### For Clients:

- Comments include optional file association
- Can specify exact timestamp for feedback
- See all admin responses in real-time

## API Endpoints Modified

### `fetchProjectComments(projectId)`

**Before**: Only fetched basic comment and user data
**After**: Fetches complete comment with:

- User profile (full_name, email, role)
- Associated file details (file_name, file_type, file_url)
- Timestamp information
- All metadata for rich display

## Migration Guide

No database changes required - all fields already exist:

- ✅ `project_comments.file_id` - Already in table
- ✅ `project_comments.timestamp_seconds` - Already in table
- ✅ `project_files` table - Already has file metadata
- ✅ `project_team` table - Already has role tracking

## Troubleshooting

### Comments not showing file/timestamp:

- **Issue**: File information not displaying
- **Solution**: Check that `file_id` and `timestamp_seconds` are populated in database
- **Verify**: `SELECT file_id, timestamp_seconds FROM project_comments WHERE id = 'xxx'`

### Team member not seeing comments:

- **Issue**: Team member can't view comments
- **Solution**: Verify team member is assigned to project in "Team Members" section
- **Check**: Look for member in Comment Access panel

### File link broken:

- **Issue**: File name shows but link doesn't work
- **Solution**: Check that file_id references valid project_files record
- **Verify**: File still exists in project and hasn't been deleted

## Future Enhancements

Potential improvements:

- [ ] Click timestamp to preview file at exact time
- [ ] Batch export comments with file references
- [ ] Comment threading by file
- [ ] Notification when client responds to admin reply
- [ ] Comment resolution workflow
- [ ] Comment search across all projects
- [ ] Comment analytics (avg response time, comment volume, etc.)

## Related Documentation

- [Comment System Guide](COMMENT_SYSTEM_GUIDE.md) - Full comment architecture
- [Team Management](README.md#team-management) - How to assign team members
- [File Management](README.md#files) - Working with project files

---

**Last Updated**: January 5, 2026
**Status**: Complete ✅
