# Android Notification Handler Testing Guide

## Overview

The app now includes a **NotificationPermissionHandler** debug component that helps you:

- ✅ Request notification permissions properly
- ✅ Subscribe to push notifications
- ✅ Test notifications locally
- ✅ Debug permission and subscription issues
- ✅ View real-time status logs

## Location

The handler appears in the **bottom-left corner** on mobile/tablet devices.

## How It Works

### 1. Request Permission

**Button:** "Enable Notifications"

When clicked:

1. Browser requests permission from your Android device
2. You'll see a system dialog: "Allow 'The Lost Project' to send notifications?"
3. Tap "Allow" to grant permission
4. Debug log updates with status

### 2. Subscribe to Push

**Button:** "Subscribe to Push"

After permission is granted:

1. App generates a subscription token
2. Sends it to our server (`/api/push/subscribe`)
3. Server stores the token in database
4. You're now registered for push notifications

### 3. Test Notification

**Button:** "Test Notification"

Sends yourself a test notification:

1. Creates a local notification immediately
2. Shows: "Test notification - " + timestamp
3. Notification appears in your status bar
4. You can dismiss or tap to open app

### 4. View Status

**Buttons:** "Refresh Status", Debug Log

See in real-time:

- ✅ Permission status (Granted/Denied/Default)
- ✅ Push subscription active
- ✅ Service Worker registered
- ✅ VAPID key configured
- ✅ Last 20 status messages with timestamps

## Step-by-Step Testing

### Desktop (PC/Mac)

1. Open https://tlp-app-v2.vercel.app in Chrome or Edge
2. Scroll to bottom-left (or use browser DevTools Console)
3. Check if you see the handler UI
4. Click "Enable Notifications"
5. Accept browser permission prompt
6. Click "Subscribe to Push"
7. Check debug log for success
8. Click "Test Notification"
9. Look for notification in system tray

### Android Phone/Tablet

1. Open https://tlp-app-v2.vercel.app in Chrome or Firefox
2. Scroll to **bottom-left corner** to find the handler
3. Tap "Enable Notifications"
4. Accept system permission prompt
5. Tap "Subscribe to Push"
6. Wait 2-3 seconds
7. Check debug log:
   - Should see "✓ Push subscription successful"
   - Should show your subscription endpoint
8. Tap "Test Notification"
9. Check system notification bar (pull down from top)
10. Notification should appear with app icon and your message

### iOS Safari

1. Open https://tlp-app-v2.vercel.app
2. Notification handler visible (bottom-left)
3. **Note:** iOS PWAs have limited notification support
4. For full notifications, need native iOS app (future)

## Debugging: What to Check

### If You Don't See the Handler

1. **On mobile?** Scroll to very bottom-left of screen
2. **Using mobile view?** Try: Right-click → Inspect → Toggle device toolbar
3. **In PWA mode?** Install as PWA first (tap menu → "Install app")
4. **JavaScript enabled?** Check: Settings → Privacy & Security → JavaScript

### If Permission Request Doesn't Appear

1. **Already granted?** Check debug log - should show "Permission: granted"
2. **Already denied?**
   - Android: Settings → Apps → [Browser] → Permissions → Notifications → turn on
   - Then refresh page and try again
3. **Browser doesn't support?** Try Chrome or Firefox instead

### If Subscription Fails

**Error shown:** "Failed to subscribe to push notifications"

Check these:

1. **Service Worker not registered?**

   - Open DevTools (F12) → Application → Service Workers
   - Should show registered service worker
   - If not: Refresh page or clear cache

2. **VAPID key missing?**

   - Server might not have key configured
   - Check: Deployed version has valid VAPID keys in environment

3. **API endpoint unreachable?**

   - Check browser console for fetch errors
   - Verify `/api/push/subscribe` is working
   - May need to check server logs

4. **Database issue?**
   - Subscription saved but query failed
   - Check server/Supabase logs
   - Verify user is authenticated

### If Test Notification Doesn't Show

1. **Is subscription active?** Check debug log
2. **Is app in foreground?**
   - Notifications may be suppressed when app active
   - Minimize app to background, try again
3. **Check notification settings:**
   - Android: Settings → Apps → [App] → Notifications → enabled
4. **Browser notification muted?** Check browser settings
5. **Do not disturb enabled?** Check system settings

### View Debug Details

**Debug Log includes:**

```
[2024-12-29 14:35:21] Notification permission requested
[2024-12-29 14:35:22] ✓ Permission: granted
[2024-12-29 14:35:23] Service Worker: registered
[2024-12-29 14:35:24] VAPID key: valid (ov...)
[2024-12-29 14:35:25] Push subscription initiated
[2024-12-29 14:35:27] ✓ Push subscription successful
[2024-12-29 14:35:28] Endpoint: https://fcm.googleapis.com/...
[2024-12-29 14:35:29] ✓ Test notification sent
```

**Key status to look for:**

- ✅ `Permission: granted`
- ✅ `Service Worker: registered`
- ✅ `VAPID key: valid`
- ✅ `Push subscription successful`

## Common Issues & Solutions

### Issue 1: Permission Shows "Denied"

**Cause:** You tapped "Block" when asked, or app previously blocked

**Solution:**

- **Android:** Settings → Apps → [Browser app] → Permissions → Notifications → Allow
- **Desktop:** Browser settings → Notifications → https://tlp-app-v2.vercel.app → Allow
- Refresh page and retry

### Issue 2: "Failed to fetch push service"

**Cause:** Browser doesn't support web push API

**Solution:**

- Use Chrome, Edge, or Firefox (not Safari on mobile)
- Update browser to latest version
- Check: DevTools → Console for specific error

### Issue 3: Subscription endpoint looks broken

**Cause:** Network issue or server misconfiguration

**Solution:**

- Check your internet connection
- Try again in a few seconds
- If problem persists: Check server logs for /api/push/subscribe

### Issue 4: Notification appears but disappears immediately

**Cause:** Service Worker notification handler issue

**Solution:**

- Check DevTools → Service Workers
- Look for errors in Application tab
- Try restarting browser or clearing cache

## Advanced Testing

### Test Notification from Another User

1. Open another browser/device logged in as different user
2. Find their user ID or subscription token
3. Send them a notification:
   ```bash
   curl -X POST https://tlp-app-v2.vercel.app/api/push/send \
     -H "Content-Type: application/json" \
     -d '{"to":"THEIR_USER_ID", "title":"Test", "body":"Hello"}'
   ```

### Check Sent Notifications

1. Open browser DevTools (F12)
2. Go to Application → Manifest
3. Start URL should be: https://tlp-app-v2.vercel.app
4. Check Service Worker tab for registered workers

### Monitor in Real-Time

1. DevTools → Console
2. Type: `navigator.serviceWorker.getRegistration().then(reg => console.log(reg))`
3. Check: Should show active service worker
4. Watch for "push" event logs when notifications arrive

## Notification Features

### What You'll See

- **Icon:** App icon in notification
- **Title:** "Test notification - [timestamp]"
- **Body:** Full message content
- **Badge:** Small app badge on status bar
- **Vibration:** Phone vibrates (if enabled)
- **Actions:** "Open Chat" and "Dismiss" buttons (on some phones)

### Notification Behavior

- **Foreground:** May show silently (depending on browser)
- **Background:** Shows in status bar
- **When app closed:** Still shows (if permission granted)
- **Custom sounds:** Will use system notification sound

## For Developers

### Component Location

File: `components/notification-permission-handler.tsx`

### How to Access Handler

```typescript
// In any component:
import { useEffect } from "react";

// Handler automatically adds itself to the page
// but you can also manually check status:
const checkStatus = async () => {
  const permission = Notification.permission;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  console.log({
    permission,
    serviceWorkerActive: !!registration.active,
    hasSubscription: !!subscription,
  });
};
```

### Debug Information Available

```javascript
// In browser console:
window.notificationDebug = {
  permission: Notification.permission,
  serviceWorker: navigator.serviceWorker.controller,
  subscription: await navigator.serviceWorker.ready.then((r) =>
    r.pushManager.getSubscription()
  ),
};
```

### Key Environment Variables

```
NEXT_PUBLIC_VAPID_KEY = (public key in .env.local)
VAPID_PRIVATE_KEY = (private key - server only)
```

## Success Indicators

When everything works correctly, you should see:

✅ "Enable Notifications" button → Permission: granted  
✅ "Subscribe to Push" button → "✓ Push subscription successful"  
✅ "Test Notification" button → Notification appears in 1-2 seconds  
✅ Debug log shows all status messages with green checkmarks  
✅ Receiving notifications from chat messages  
✅ Notification persists even when app closed

## Next Steps

1. **Test on actual device** - Best way to verify
2. **Check with another user** - Verify chat notifications work
3. **Test in background** - Minimize app and send test
4. **Test when offline** - Disconnect network briefly
5. **Report any issues** - Document error messages from console

## Support

If notifications still don't work:

1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Copy full error and share with support
5. Also check: Network tab → api/push/subscribe → Status should be 200

---

**Handler Version:** Deployed in v0.1.48+  
**Last Updated:** December 29, 2025
