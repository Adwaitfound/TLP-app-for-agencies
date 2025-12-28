# Quick Start: Fix Chat Notifications

## 🚀 5-Minute Setup

### Step 1: Generate VAPID Keys (1 min)

```bash
npm install web-push --save-dev
npx web-push generate-vapid-keys
```

Copy the output:

```
Public Key: BKx...
Private Key: 7Y9...
```

### Step 2: Add to .env.local (1 min)

Edit `.env.local` and add:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BKx...
VAPID_PRIVATE_KEY=7Y9...
VAPID_SUBJECT=mailto:admin@yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Restart Dev Server (1 min)

```bash
# Kill the current dev server (Ctrl+C)
npm run dev
```

### Step 4: Test (2 min)

**Option A: Browser Testing**

1. Open app in browser
2. Look for notification permission prompt → Click "Allow"
3. Open browser DevTools → Application → Service Workers
4. Verify "sw.js" shows as "activated and running"

**Option B: Use Diagnostic Tool**

1. Look for "🔍 Notification Diagnostics" button (bottom-right)
2. Click it
3. Verify all checks show ✅
4. If not, fix the ❌ errors listed

### Step 5: Send Test Message

1. Open app in **two browser windows**
2. Log in as two different users
3. User A sends a message in chat
4. Switch to User B's window (or minimize)
5. **Look for browser notification in system tray** ✅

## ✅ Verification

Check these boxes:

- [ ] VAPID keys added to `.env.local`
- [ ] Dev server restarted
- [ ] Service Worker active in DevTools
- [ ] Permission notification was granted
- [ ] Diagnostic tool shows all ✅
- [ ] Browser notification appears when switching tabs
- [ ] Clicking notification opens chat

## 🐛 If It's Not Working

### Problem: Service Worker not showing as active

**Fix**:

```bash
# Check browser DevTools → Application → Service Workers
# If there's an error, check browser console for details
# Try hard-refreshing: Ctrl+Shift+R (Cmd+Shift+R on Mac)
```

### Problem: Permission prompt didn't appear

**Fix**:

```javascript
// In browser console:
Notification.requestPermission().then(console.log);
// Should return 'granted'
```

### Problem: Still no notifications

**Fix**:

1. Check VAPID keys are not empty: `echo $NEXT_PUBLIC_VAPID_PUBLIC_KEY`
2. Verify `/api/push/subscribe` was called (check Network tab)
3. Check `web_push_subscriptions` table has entries (use Supabase console)
4. Restart dev server if you just added env variables

## 📚 Full Documentation

See `CHAT_NOTIFICATIONS_SETUP.md` for:

- Complete troubleshooting
- Testing checklist
- Detailed architecture
- Production deployment steps

See `CHAT_NOTIFICATIONS_FIX_COMPLETE.md` for:

- What was changed and why
- Technical details
- Data flow diagrams
- Security considerations

## 🎯 What This Fixes

✅ Chat notifications now show in browser system tray  
✅ Works when user is on other browser tabs  
✅ Works when chat window is minimized  
✅ Shows @mention alerts with different notification title  
✅ Clicking notification opens/focuses chat  
✅ Works on mobile PWA installations

## ⚡ Next Steps After Setup

1. **Test in production-like environment**

   - Deploy to staging/preview
   - Test with actual users
   - Verify notifications work on mobile PWA

2. **Update production env variables**

   - Use same VAPID keys
   - Update `NEXT_PUBLIC_APP_URL` to production domain
   - Deploy

3. **Monitor in production**
   - Check server logs for `/api/push/send` errors
   - Monitor for failed push subscriptions
   - Track notification delivery rates

## 💡 Pro Tips

- VAPID keys are tied to your domain, keep them even if you update the domain
- Notification permission is per-browser, each user needs to grant it once
- Users can manage permissions in browser settings → Notifications
- Test on multiple browsers (Chrome, Firefox, Safari) - different support levels
- Mobile PWAs get the same notifications as web browsers

## 🆘 Need Help?

1. Check diagnostic tool (bottom-right button)
2. Read troubleshooting in `CHAT_NOTIFICATIONS_SETUP.md`
3. Check server logs for API errors
4. Verify Supabase `web_push_subscriptions` table has entries
5. Check browser DevTools:
   - Application → Service Workers (should be active)
   - Application → Notifications (check permissions)
   - Console (look for any JS errors)
   - Network (verify `/api/push/send` API calls)
