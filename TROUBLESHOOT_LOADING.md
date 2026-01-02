# Troubleshooting "Stuck on Loading" Issues

## Quick Diagnostics

1. **Check Browser Console (Cmd+Option+I)**

   - Look for any error messages with red text
   - Check for "[Supabase]" related messages
   - Common errors will show: "Failed to load projects", "Failed to load client info", etc.

2. **Check Network Tab**

   - Look for failed requests to Supabase
   - Check if requests are timing out (taking > 15 seconds)
   - Verify API responses are returning data

3. **Verify Authentication**
   - Make sure you're logged in (check email in top right)
   - If not logged in, log in first
   - Check that your user account is linked to a client in Supabase

## Common Issues & Fixes

### Issue: "Dashboard failed to load"

**Cause**: Network timeout or Supabase connection issue
**Fix**:

- Click the "Retry" button
- Check your internet connection
- Clear browser cache (Cmd+Shift+Delete)
- Try refreshing the page (Cmd+R)

### Issue: Stuck on "Loading..." indefinitely

**Cause**: Query taking too long or hanging
**Fix**:

- Check if client record exists in Supabase for your user
- Verify RLS policies allow your user to query projects/invoices
- Check Supabase logs for policy violations

### Issue: "No client profile found"

**Cause**: User account not linked to a client
**Fix**:

- Log in as admin (adwait@thelostproject.in)
- Create a client record for your user
- Verify user_id in clients table matches your auth user_id

## What to Check in Supabase Dashboard

1. **Auth Users**: Verify your email is in Auth > Users
2. **Clients Table**: Verify there's a record with your user_id
3. **Projects Table**: Verify at least one project exists for your client_id
4. **RLS Policies**: Check that read policies allow your user to access data

## Error Messages Guide

- `Failed to load client info`: Can't find client linked to your account
- `Failed to load projects`: RLS policy blocking projects query
- `Failed to load invoices`: RLS policy blocking invoices query
- `Request timeout`: Network is slow or Supabase is overloaded

## Still Stuck?

1. Check browser console for exact error message
2. Screenshot the error
3. Contact support with the error details
