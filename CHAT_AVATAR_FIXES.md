# Chat & Avatar Fixes - Quick Reference

## ✅ What Was Fixed

### 1. **Profile Picture Upload**

**Problem:** Avatar image wasn't updating after upload
**Root Cause:** State update order was wrong - we were setting the old profile data with new URL
**Solution:**

- Update `profileData` state first with cache-busted URL
- Then update `user` context with same cache-busted URL
- Key prop on Avatar component ensures re-render when URL changes

### 2. **Chat Messages Not Showing**

**Problem:** Messages sent but not appearing in chat
**Root Cause:**

- `chat_messages` table doesn't exist yet
- Realtime not enabled on the table
  **Solution:** Run [SETUP_CHAT.sql](SETUP_CHAT.sql) in Supabase SQL Editor

---

## 🚀 Setup Instructions

### Enable Chat Feature

1. **Open Supabase Dashboard**

   - Go to your project at https://supabase.com
   - Navigate to SQL Editor

2. **Run Setup Script**

   - Copy all content from [SETUP_CHAT.sql](SETUP_CHAT.sql)
   - Paste into SQL Editor
   - Click "Run"

3. **Verify Setup**

   - Go to Database → Tables
   - Confirm `chat_messages` table exists
   - Check that Realtime is enabled (Database → Replication)

4. **Test Chat**
   - Refresh your app
   - Navigate to "Team Chat" in sidebar
   - Send a message
   - It should appear immediately

---

## 📝 Changes Made

### Files Modified

- [app/dashboard/settings/page.tsx](app/dashboard/settings/page.tsx)
- [app/dashboard/client/settings/page.tsx](app/dashboard/client/settings/page.tsx)
- [app/dashboard/employee/settings/page.tsx](app/dashboard/employee/settings/page.tsx)
- [components/dashboard/sidebar.tsx](components/dashboard/sidebar.tsx)

### Files Created

- [app/dashboard/chat/page.tsx](app/dashboard/chat/page.tsx) - Full chat UI
- [SETUP_CHAT.sql](SETUP_CHAT.sql) - Database setup
- [supabase/migrations/20251224200000_create_chat_messages.sql](supabase/migrations/20251224200000_create_chat_messages.sql)

---

## 🎯 How It Works Now

### Avatar Upload Flow

1. User selects image → validates type/size
2. Deletes old avatar from storage (if exists)
3. Uploads new image to `avatars/{userId}/{timestamp}.ext`
4. Stores clean public URL in database
5. Updates UI state with cache-busted URL `?t={timestamp}`
6. Avatar component re-renders due to key prop change

### Chat Message Flow

1. User types message → sends via form submit
2. Message inserted into `chat_messages` table
3. Supabase realtime broadcast triggers
4. All connected clients receive new message event
5. Message appears in chat with sender info

---

## 🔧 Testing

### Test Avatar Upload

1. Go to Settings → Profile tab
2. Click avatar circle → select new image
3. Upload completes
4. **New image should display immediately in top-right corner**

### Test Chat

1. Open chat in one browser/user
2. Open chat in another browser/user
3. Send message from user 1
4. **Message should appear instantly for user 2**

---

## ⚠️ Important Notes

- **Chat only available to:** Admins, Project Managers, and Employees
- **Clients cannot access chat** (enforced by RLS policies)
- **Avatar max size:** 2MB
- **Avatar formats:** Any image type (jpg, png, gif, webp, etc.)
- **Chat history:** Last 200 messages loaded on page load
- **Realtime:** Must be enabled in Supabase for chat to work

---

## 🐛 Troubleshooting

### Avatar Still Not Showing?

1. Check browser console for errors
2. Verify file uploaded to Storage → avatars bucket
3. Check if URL is saved in users table
4. Try hard refresh (Cmd+Shift+R / Ctrl+Shift+F5)

### Chat Messages Not Appearing?

1. Verify you ran [SETUP_CHAT.sql](SETUP_CHAT.sql)
2. Check Database → Tables for `chat_messages`
3. Verify Realtime enabled: Database → Replication
4. Check browser console for Supabase errors
5. Ensure your role is not "client"

### Realtime Not Working?

1. Supabase Dashboard → Project Settings → API
2. Ensure Realtime is enabled
3. Add `chat_messages` to publication if needed:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
   ```
