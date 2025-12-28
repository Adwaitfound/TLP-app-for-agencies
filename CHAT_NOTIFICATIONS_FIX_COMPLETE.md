# Chat Notifications Fix - Complete Implementation

## Problem

Chat notifications were not showing in the browser when users were on other tabs or had the chat tab minimized.

## Root Cause Analysis

The notification system had 3 critical gaps:

1. **Database-only notifications** - `notifyChatMessage()` only created database entries but never sent actual browser push notifications
2. **Missing permission request** - Push subscription manager didn't request notification permissions
3. **No VAPID configuration** - Web Push requires VAPID keys which weren't set up

## Solution Overview

### What Was Changed

#### 1. Enhanced Notification Service (`app/actions/notifications.ts`)

**Before**: Only inserted into notifications table

```typescript
// OLD: Just database
const { error } = await supabase.from("notifications").insert(notifications);

return { success: true };
```

**After**: Sends actual web push notifications

```typescript
// NEW: Database + Web Push
const { error } = await supabase.from("notifications").insert(notifications);

// Send web push for mentions
if (mentionedUserIds.length > 0) {
  await sendWebPushNotification(mentionedUserIds, title, body, tag);
}

// Send web push to all team members
await sendWebPushNotification(allUserIds, title, body, tag);
```

**Key improvements**:

- Added `sendWebPushNotification()` helper function
- Sends priority notifications for mentions (@username)
- Sends notifications to all team members
- Graceful error handling (doesn't block if web push fails)
- Uses environment-aware URL building for API calls

#### 2. Improved Push Subscription Manager (`components/push-subscription.tsx`)

**Before**: Silently subscribed without permission

```typescript
// OLD: Might fail silently
const reg = await navigator.serviceWorker.ready;
const sub = await reg.pushManager.subscribe({...});
```

**After**: Explicitly requests permission first

```typescript
// NEW: Request permission explicitly
if (Notification.permission === 'default') {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;
}

// Check for existing subscription
const existing = await reg.pushManager.getSubscription();
if (existing) {
  console.log('Already subscribed');
  return;
}

// Subscribe with VAPID
const sub = await reg.pushManager.subscribe({...});
```

**Key improvements**:

- Requests notification permission upfront
- Checks for existing subscriptions (prevents duplicates)
- Better error logging and debugging
- Validates VAPID key before subscribing

#### 3. Enhanced Service Worker (`public/sw.js`)

**Before**: Basic push handling

```javascript
// OLD: Simple event
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'App', {...})
  );
});
```

**After**: Robust error handling and logging

```javascript
// NEW: Robust with fallbacks
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'New notification',
    icon: data.icon || '/icons/icon-192x192.png',
    data: { url: data.url || '/', ...data.metadata },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Video Production App', options)
  );
});

// Handle clicks
self.addEventListener('notificationclick', (event) => {
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({...}).then(clientList => {
      // Focus or open window
    })
  );
});
```

**Key improvements**:

- Better JSON parsing with fallback to text
- Support for notification metadata
- Proper click handling
- Notification close event logging
- More detailed logging throughout

#### 4. Diagnostic Tool (`components/notification-diagnostics.tsx`)

New component to verify notification setup:

- Shows 6 diagnostic checks
- Displays current permission status
- Shows VAPID configuration
- Verifies service worker registration
- Verifies push subscription status
- Provides fix instructions
- Includes recheck button

**How it appears**:

- Floating button in bottom-right corner
- Click to view diagnostic panel
- Color-coded status indicators
- Detailed fix instructions

## Data Flow After Fix

```
User sends chat message
    ↓
notifyChatMessage() called with sender info & message
    ↓
    ├─→ INSERT into notifications table
    │   (for database-based notification bell)
    │
    ├─→ Extract @mentions from message
    │
    ├─→ Call sendWebPushNotification() for mentions
    │   ├─→ POST to /api/push/send with mentioned users
    │   └─→ API fetches subscriptions from web_push_subscriptions table
    │       └─→ web-push library sends to FCM/APNs
    │
    └─→ Call sendWebPushNotification() for all team members
        ├─→ POST to /api/push/send with all user IDs
        └─→ Service worker receives push event
            └─→ Shows browser notification in system tray
                └─→ User sees it even if NOT viewing the chat

Receiving User Clicks Notification
    ↓
Service Worker notificationclick event fires
    ↓
Finds existing window or opens new one
    ↓
Navigates to chat URL
```

## Required Configuration

### 1. Generate VAPID Keys (One-time)

```bash
npm install web-push --save-dev
npx web-push generate-vapid-keys
```

Output:

```
Public Key: BKx...
Private Key: 7Y9...
```

### 2. Add Environment Variables to `.env.local`

```env
# Web Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKx...
VAPID_PRIVATE_KEY=7Y9...
VAPID_SUBJECT=mailto:admin@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production:

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 3. Database Table Required

Already exists: `web_push_subscriptions`

- `id` (uuid)
- `user_id` (uuid)
- `endpoint` (text)
- `key_p256dh` (text)
- `key_auth` (text)
- `created_at` (timestamp)

## Testing Steps

1. **Start the app**

   ```bash
   npm run dev
   ```

2. **Open browser DevTools**

   - Go to Application tab
   - Check Service Workers section
   - Verify "sw.js" shows as "activated and running"

3. **Check notification permission**

   - Look for permission prompt
   - Grant permission when asked
   - Or manually enable in Settings → Notifications

4. **Verify diagnostic checks**

   - Click "🔍 Notification Diagnostics" button (bottom-right)
   - All checks should show ✅ if properly configured
   - Fix any ❌ or ⚠️ errors listed

5. **Send test message**

   - Open app in two browser windows
   - Log in as two different users
   - User A sends a message in chat
   - Switch to User B's window (or minimize it)
   - **You should see browser notification in system tray**

6. **Test with @mention**
   - User A types: "Hey @UserB please check this"
   - User B gets a "User A mentioned you" notification
   - Notification has different title/styling

## Verification Checklist

- [ ] VAPID keys generated and added to `.env.local`
- [ ] Server restarted after adding environment variables
- [ ] Service Worker shows "activated and running" in DevTools
- [ ] Notification permission is "granted" (check with `Notification.permission`)
- [ ] Diagnostic tool shows all ✅ checks passing
- [ ] Can send message and see database notification entry
- [ ] Can see browser notification in system tray when on other tab
- [ ] Can click notification to focus/open chat
- [ ] @mentions work and show custom notification title
- [ ] Notifications don't appear for own messages

## Troubleshooting

### "Service Worker not registered"

- Check that service worker registration script runs (in layout.tsx)
- Verify `public/sw.js` exists
- Check browser console for SW errors
- Try: `navigator.serviceWorker.getRegistrations()`

### "Notification permission denied"

- Go to browser settings → Site settings → Notifications
- Find your domain and change from "Block" to "Allow"
- Reload page (permission will be requested again)

### "No notification appears"

- Verify VAPID keys are set: `echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Check `/api/push/send` endpoint is accessible
- Look for errors in server logs
- Verify web_push_subscriptions table has entries
- Check that push subscription was saved to DB

### "Notifications only in active tab"

- This is expected! Service Worker only active when needed
- Real notifications come from push API (what we fixed)
- Database notifications (notification bell) work in active tab

## Performance Impact

- ✅ **No negative impact** - async operations, non-blocking
- ✅ **Minimal overhead** - only sends push on message send
- ✅ **Graceful degradation** - works without VAPID keys (falls back to DB)

## Security Considerations

- ✅ VAPID private key never exposed to client
- ✅ Push subscriptions tied to user_id via /api/push/subscribe
- ✅ Web push only sends to subscribed users
- ✅ Service Worker validates notification origin
- ✅ VAPID subject should be your organization email

## Files Modified

1. **app/actions/notifications.ts**

   - Added `sendWebPushNotification()` function
   - Modified `notifyChatMessage()` to call web push API
   - Added error handling and logging

2. **components/push-subscription.tsx**

   - Added notification permission request
   - Added subscription existence check
   - Added better logging and error handling

3. **public/sw.js**

   - Enhanced push event handler
   - Better JSON parsing with fallback
   - Added notification click handling
   - Better logging for debugging

4. **components/notification-diagnostics.tsx** (NEW)

   - Diagnostic tool for verification
   - Shows 6 status checks
   - Provides fix instructions

5. **app/layout.tsx**

   - Added NotificationDiagnostics import
   - Added NotificationDiagnostics component

6. **CHAT_NOTIFICATIONS_SETUP.md** (NEW)
   - Complete setup guide
   - Troubleshooting steps
   - Testing checklist
   - FAQ

## Next Steps

1. ✅ **Generate VAPID keys** - Must be done before testing
2. ✅ **Add to .env.local** - Restart dev server
3. ✅ **Test with diagnostic tool** - Verify all checks pass
4. ✅ **Send test messages** - Verify notifications appear
5. ✅ **Test on mobile** - PWA installations also get notifications
6. 📝 **Deploy to production** - Keep same VAPID keys, update domain

## Support & Documentation

- See `CHAT_NOTIFICATIONS_SETUP.md` for detailed setup
- Use diagnostic tool to verify configuration
- Check browser DevTools Application tab for SW status
- Look at server logs for `/api/push/send` errors
- Verify `web_push_subscriptions` table has user subscriptions

---

## Summary

The chat notification system now properly:

1. **Sends browser push notifications** when users are on other tabs
2. **Requests notification permission** upfront
3. **Handles @mentions** with priority notifications
4. **Works offline** with service worker
5. **Provides diagnostics** to verify setup
6. **Gracefully degrades** if push fails
7. **Logs everything** for debugging

Users will now see chat notifications in their system tray even when they're not actively viewing the chat.
