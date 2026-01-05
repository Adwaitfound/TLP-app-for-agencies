# Comment System Implementation Guide

## Overview

This document outlines the enhanced comment system with real-time admin responses, team member access control, and proper Row-Level Security (RLS) policies.

## Features Implemented

### 1. **Comment Replies (Admin Responses)**

- Admins and Project Managers can respond directly to client comments
- Replies are stored in a separate `comment_replies` table for better organization
- Real-time updates when responses are posted (via Supabase Real-time)
- Comments show a count of responses with ability to expand/collapse

### 2. **Real-Time Updates**

- When a client posts a comment, all admins/team members assigned to the project see it immediately
- Admin responses appear in real-time to clients and other team members
- Powered by Supabase Real-time subscriptions

### 3. **Access Control**

The system implements strict Row-Level Security (RLS) policies:

#### **For Viewing Comments:**

- **Clients**: Can see their own comments and all replies from admins
- **Admins/Project Managers**: Can see all comments on projects they manage
- **Employees**: Can see comments on projects they're assigned to
- **Team Members (Viewer Role)**: Can view only (read-only access to comments)

#### **For Creating Replies:**

- **Only Admins and Project Managers** can create replies
- Regular employees cannot reply

#### **For Editing/Deleting:**

- Users can edit/delete their own replies
- Admins can edit/delete any reply

### 4. **Database Schema**

#### Main Tables:

**`project_comments`** (existing)

- `id` (UUID): Primary key
- `project_id` (UUID): Foreign key to projects
- `user_id` (UUID): Creator of comment
- `comment_text` (TEXT): The comment content
- `created_at` (TIMESTAMP): When created
- `parent_id` (UUID): For nested replies (optional)
- `status` (STRING): pending, resolved
- `assigned_user_id` (UUID): Assigned team member

**`comment_replies`** (new)

- `id` (UUID): Primary key
- `comment_id` (UUID): References project_comments
- `user_id` (UUID): Admin/PM who replied
- `reply_text` (TEXT): Response content
- `created_at` (TIMESTAMP): When created
- `updated_at` (TIMESTAMP): Last update

#### Indexes for Performance:

- `idx_comment_replies_comment_id`: Fast lookup of replies by comment
- `idx_comment_replies_user_id`: Fast lookup of replies by user
- `idx_comment_replies_created_at`: Ordering and filtering by date
- `idx_comment_replies_comment_created`: Combined index for common queries

### 5. **RLS Policies**

#### **View Replies Policy**: `View comment replies - owner and team`

```sql
-- Allows viewing if:
-- 1. User is admin/project_manager
-- 2. User created the original comment
-- 3. User is assigned to the project team
```

#### **Create Replies Policy**: `Create comment replies - admin only`

```sql
-- Only admins and project_managers can insert replies
```

#### **Update/Delete Policies**: `Update comment replies` and `Delete comment replies`

```sql
-- Users can edit/delete their own replies
-- Admins can manage all replies
```

### 6. **API Functions**

#### **Server Actions** (`app/actions/comment-replies.ts`):

```typescript
// Create a reply to a comment
createCommentReply({
  commentId: string
  replyText: string
  userId: string
})

// Get all replies for a comment
getCommentReplies(commentId: string)

// Update a reply
updateCommentReply({
  replyId: string
  replyText: string
  userId: string
})

// Delete a reply
deleteCommentReply({
  replyId: string
  userId: string
})

// Get comment with all its replies
getCommentWithReplies(commentId: string)
```

### 7. **Frontend Implementation**

#### **Comment Display** (in Project Details Modal):

- Shows all comments with avatar and timestamp
- Expandable replies section
- Each reply shows author, timestamp, and content
- Admin/PM users can delete their own replies

#### **Reply Input** (Admins/PMs Only):

- Textarea for typing response
- "Post Response" button
- Only visible to users with admin/project_manager role
- Submitting state with loading indicator

#### **UI Features**:

- Show/Hide replies toggle
- Reply count badge
- Beautiful card-based layout
- Responsive design for mobile

### 8. **User Roles & Permissions**

| Role            | Can Create Comments | Can Create Replies | Can View All Comments | Can Assign Members |
| --------------- | ------------------- | ------------------ | --------------------- | ------------------ |
| Admin           | Yes                 | Yes                | Yes                   | Yes                |
| Project Manager | Yes                 | Yes                | Yes                   | Yes                |
| Employee        | Yes                 | No                 | Own project only      | No                 |
| Client          | Yes                 | No                 | Own project only      | No                 |
| Team Viewer     | No                  | No                 | Own project only      | No                 |

### 9. **Setup Instructions**

#### **Step 1: Run Migrations**

```bash
# Apply the migrations in order:
supabase db push  # Or run via Supabase dashboard
```

Migrations to apply:

1. `20250105_add_comment_replies_table.sql` - Creates the table
2. `20250105_fix_comment_replies_rls.sql` - Sets up RLS policies
3. `20250105_enable_comment_replies_realtime.sql` - Enables real-time

#### **Step 2: Verify Policies**

Check Supabase dashboard > Authentication > Policies to confirm all policies are enabled.

#### **Step 3: Test Real-Time**

1. Open project details in two browser windows
2. Post a comment from client window
3. See it appear instantly in admin window
4. Admin posts reply
5. Verify client sees reply immediately

### 10. **Troubleshooting**

#### **Replies not showing:**

- Check that `comment_replies` table exists
- Verify RLS policies are enabled
- Check browser console for errors

#### **Can't create replies:**

- Verify user role is admin or project_manager
- Check RLS policy `Create comment replies - admin only`
- Check user has proper authentication

#### **Real-time not working:**

- Verify Supabase real-time is enabled
- Check that `comment_replies` table is published
- Verify browser WebSocket connection (DevTools > Network)

### 11. **Future Enhancements**

Potential improvements:

- [ ] Email notifications when comments are posted
- [ ] @mention functionality for team members
- [ ] Rich text editor for comments
- [ ] File attachments in comments
- [ ] Comment threading/nested replies
- [ ] Comment resolution/marking as answered
- [ ] Export comments to PDF
- [ ] Comment search and filtering
- [ ] Mention history and auto-suggestions
- [ ] Comment reactions (emoji reactions)

### 12. **Security Notes**

- All RLS policies are enforced at the database level
- No client-side filtering is used for sensitive operations
- Audit logging captures all comment/reply actions
- Only authenticated users can see comments
- Deleted comments/replies are not recoverable

---

**Last Updated**: January 5, 2025
**Implementation Status**: Complete ✅
