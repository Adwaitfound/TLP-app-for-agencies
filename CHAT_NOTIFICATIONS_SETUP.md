# Chat Notifications Fix - Setup Guide

## Problem Identified

Chat notifications were not showing in the browser when users are on other tabs because:

1. **Missing Web Push API Integration** - The `notifyChatMessage()` function was only creating database notifications but NOT sending actual browser push notifications
2. **Notification Permission Not Requested** - The push subscription wasn't requesting notification permission from the user
3. **Missing VAPID Configuration** - Web push requires VAPID (Voluntary Application Server Identification) keys which weren't configured

## Solution Implemented

### 1. Web Push Notifications Implementation

**File**: `app/actions/notifications.ts`

Added `sendWebPushNotification()` function that:

- Calls the `/api/push/send` endpoint with user IDs and message payload
- Sends to mentioned users immediately (with priority)
- Sends to all team members as secondary notifications
- Gracefully handles failures without blocking the operation

### 2. Enhanced Push Subscription Manager

**File**: `components/push-subscription.tsx`

Updated to:

- Request notification permission from user on first login
- Check for existing subscription (prevents duplicate subscriptions)
- Provide better logging for debugging
- Handle permission denial gracefully

### 3. Improved Service Worker

**File**: `public/sw.js`

Enhanced push event handler to:

- Parse JSON payloads correctly with fallback for text
- Support navigation URLs in notification data
- Log all notification events for debugging
- Handle notification clicks to navigate to chat

## Setup Instructions

### Step 1: Generate VAPID Keys

If you don't have VAPID keys, generate them using Node.js:

```bash
npm install web-push --save-dev

# Then run this command:
npx web-push generate-vapid-keys

# You'll get output like:
# Public Key: BKx...
# Private Key: 7Y9...
```

### Step 2: Configure Environment Variables

Add to your `.env.local`:

```env
# Web Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_from_above
VAPID_PRIVATE_KEY=your_private_key_from_above
VAPID_SUBJECT=mailto:your-email@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change for production
```

**Important**:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must be public (it's in the browser)
- `VAPID_PRIVATE_KEY` must be SECRET (never commit to git)
- `VAPID_SUBJECT` should be your email or app identifier
- `NEXT_PUBLIC_APP_URL` should match your production domain

### Step 3: Verify Service Worker Registration

In browser DevTools:

```
1. Open Application tab
2. Go to Service Workers
3. Verify "sw.js" is registered and active
4. Check Manifest for notifications support
```

### Step 4: Test Notifications

1. **Start the app and grant notification permission** when prompted
2. **Send a chat message** from one account
3. **Switch to another account's browser tab**
4. **Verify browser notification appears** in system notification center

### Step 5: For Production Deployment

Update `.env.local` (or CI/CD variables):

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# Keep the same VAPID keys (they're tied to your domain)
```

## Troubleshooting

### Notifications Not Showing

**Check 1: Notification Permission**

```javascript
// In browser console:
Notification.permission;
// Should be 'granted', not 'default' or 'denied'
```

**Check 2: Service Worker Active**

```javascript
// In browser console:
navigator.serviceWorker.ready.then((reg) => console.log(reg));
// Should show active registration
```

**Check 3: Web Push Subscription**

```javascript
// In browser console:
navigator.serviceWorker.ready.then((reg) =>
  reg.pushManager.getSubscription().then((sub) => console.log(sub))
);
// Should show subscription object, not null
```

**Check 4: VAPID Keys Configured**

```bash
# Check environment variables are set
echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY
echo $VAPID_PRIVATE_KEY
# Both should have values
```

**Check 5: Server Logs**

```bash
# Look for errors in:
# - NextJS server logs (npm run dev)
# - Browser console
# - Browser DevTools → Application → Service Workers
```

### Permission Denied

If user clicks "Deny":

1. Go to browser settings → Site settings → Notifications
2. Find your app domain
3. Change from "Block" to "Ask" or "Allow"
4. Reload the page (permission will be requested again)

### Not Receiving Specific Notifications

**For mentions**: User must be mentioned with `@username` format

```
Example: "Hey @JohnDoe please review this"
```

**For all messages**: All team members should receive notifications

## Data Flow

```
User sends chat message
  ↓
notifyChatMessage() called
  ↓
  ├─→ Insert into notifications DB table
  ├─→ Extract @mentions from message
  │
  ├─→ Send web push for @mentioned users (priority)
  │   └─→ /api/push/send with userIds
  │       └─→ Fetch subscriptions from DB
  │           └─→ Send via web-push library
  │
  └─→ Send web push for all team members
      └─→ /api/push/send with userIds
          └─→ Service worker receives push event
              └─→ Show browser notification
                  └─→ User sees notification in system tray
```

## Features

✅ **Browser Notifications** - Shows in system notification center  
✅ **Mention Detection** - Highlights @mentions  
✅ **Permission Handling** - Requests permission on first login  
✅ **Graceful Degradation** - Works without VAPID (falls back to DB notifications)  
✅ **Background Operation** - Sends notifications when user is on other tabs  
✅ **Click Handling** - Clicking notification focuses/opens the app

## Testing Checklist

- [ ] VAPID keys generated and configured
- [ ] `.env.local` has all required variables
- [ ] Service worker registered in DevTools
- [ ] Notification permission granted in browser
- [ ] Web push subscription exists in database
- [ ] Send test message from chat
- [ ] Notification appears in system tray
- [ ] Click notification opens chat tab
- [ ] Mention notifications have different title

## Files Modified

1. `app/actions/notifications.ts` - Added web push API integration
2. `components/push-subscription.tsx` - Enhanced permission request
3. `public/sw.js` - Improved notification handling
4. `.env.example` - (should add VAPID docs)

## Next Steps

1. Generate VAPID keys
2. Add to environment variables
3. Restart dev server
4. Test with multiple user accounts
5. Verify notifications appear in system tray

## Support

If notifications still aren't working:

1. Check browser console for errors
2. Verify Service Worker is active
3. Check that `/api/push/subscribe` was called (look in Network tab)
4. Verify VAPID keys are correct
5. Check server logs for `/api/push/send` errors
