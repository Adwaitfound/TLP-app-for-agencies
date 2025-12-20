# Server Action Debug Guide

## Issue: "Invalid Server Actions request" when adding client

### Steps to Fix:

1. **Stop the dev server completely**
   - Press Ctrl+C in the terminal running `npm run dev`
   - Wait a few seconds for it to fully terminate

2. **Clear the build cache**
   ```bash
   rm -rf .next
   ```

3. **Restart the dev server**
   ```bash
   npm run dev
   ```

4. **Watch the server logs** for `[SERVER]` prefixed messages:
   - When you click "Add Client", you should see:
   ```
   [SERVER] createClientAccount called with: { company_name: '...', email: '...' }
   [SERVER] Creating admin client...
   [SERVER] Creating auth user...
   [SERVER] Auth user created, inserting user record...
   [SERVER] User record created, inserting client record...
   [SERVER] Client record created successfully
   [SERVER] Returning result: { success: true, email: '...' }
   ```

5. **If you still see "Invalid Server Actions request":**
   - Check browser console (F12) for the full error
   - Check the browser Network tab to see the failed request to `_actions/...`
   - The response should contain the actual error

### What Changed:

- Added comprehensive logging to `app/actions/create-client.ts`
- Improved error handling in `app/dashboard/clients/page.tsx`
- Added middleware to catch server action errors

### Files Modified:

- `app/actions/create-client.ts` - Added logging, improved error handling
- `app/dashboard/clients/page.tsx` - Added error catching and debug logging
- `components/dashboard/header.tsx` - Profile button now navigates to settings

