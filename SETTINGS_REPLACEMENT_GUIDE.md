# Settings Page Replacement Guide

## Quick Steps

The new functional settings page is ready at `app/dashboard/settings-new.tsx`.  
The old file at `app/dashboard/settings/page.tsx` is corrupted (duplicate function declarations).

### Replace the file:

```bash
cd /workspaces/video-production-app

# Backup old file
cp app/dashboard/settings/page.tsx app/dashboard/settings/page.tsx.backup

# Replace with new file
cp app/dashboard/settings-new.tsx app/dashboard/settings/page.tsx

# Clean up
rm app/dashboard/settings-new.tsx
```

### Or manually:
1. Delete `app/dashboard/settings/page.tsx`
2. Rename `app/dashboard/settings-new.tsx` to `app/dashboard/settings/page.tsx`

## What's Fixed

### Before (Old Settings Page)
- Static mockup with hardcoded data
- No database integration
- Save buttons did nothing
- Showed `john.doe@example.com` placeholder

### After (New Settings Page)
- ✅ Loads real user data from Supabase
- ✅ Profile editing (name, phone, bio)
- ✅ Company info editing (for admins/PMs only)
- ✅ Password change functionality
- ✅ Success messages on save
- ✅ Debug logging for all operations
- ✅ Form validation
- ✅ Loading states
- ✅ Reset buttons

## Restart & Test

```bash
# Restart dev server
npm run dev
```

Then:
1. Go to `/dashboard/settings`
2. Update your profile
3. Click "Save Changes"
4. Check debug console (🐛) for logs
5. Verify data persists after page refresh

## Features

### Profile Tab
- Full name editing
- Phone number
- Bio/description
- Email (read-only)
- Role display

### Company Tab (Admin/PM only)
- Company name
- Website
- Industry selection
- Address
- Tax ID
- Company size

### Security Tab
- Password change
- Validation (min 6 chars)
- Confirmation matching

### Notifications Tab
- Placeholder for future feature

All changes save to the `users` table in Supabase.
