# 🚀 Test Deployment Verification Checklist

**Date**: December 28, 2025  
**Version**: 0.1.36  
**Status**: Deployed to Vercel

---

## ✅ Pre-Deployment Verification

- [x] Code builds successfully (npm run build)
- [x] TypeScript compilation passes
- [x] 27 routes compiled without errors
- [x] Service worker included (public/sw.js)
- [x] All API endpoints included
- [x] Commits pushed to main branch
- [x] Version bumped to 0.1.36

---

## 📋 Test Environment Setup

### Step 1: Access the Deployment

```
1. Go to Vercel dashboard
2. Find project: tlp-app-v2-cli
3. Check recent deployments
4. Open preview/staging URL
```

### Step 2: Verify Basic Functionality

- [ ] App loads without errors
- [ ] Login page displays
- [ ] Dashboard renders
- [ ] No console errors (F12 DevTools)
- [ ] Service Worker active (DevTools → Application → Service Workers)

### Step 3: Configure VAPID Keys

```bash
# Generate if not done:
npx web-push generate-vapid-keys

# Add to Vercel environment variables:
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@yourdomain.com
NEXT_PUBLIC_APP_URL=https://[staging-url]
```

### Step 4: Database Setup

- [ ] Chat messages table exists
- [ ] Web push subscriptions table exists
- [ ] Notifications table has chat types
- [ ] Migrations applied

---

## 🧪 Feature Testing

### Chat Notifications

- [ ] Permission prompt appears on login
- [ ] User can grant permission
- [ ] Service Worker registers subscription
- [ ] Send chat message succeeds
- [ ] Notification appears in system tray
- [ ] Notification works on other tabs
- [ ] Click notification opens chat

### @Mentions

- [ ] Send message with @user format
- [ ] @Mentioned user gets special notification
- [ ] Notification title shows mention
- [ ] Non-mentioned users get regular notification

### Diagnostics Tool

- [ ] Click 🔍 button (bottom-right)
- [ ] All 6 checks display
- [ ] Service Worker shows ✅
- [ ] Notification Permission shows status
- [ ] VAPID Configuration shows ✅
- [ ] Fix instructions provided if issues

### Dashboard Performance

- [ ] Dashboard loads fast
- [ ] Lazy loading working for images
- [ ] Real-time updates responsive
- [ ] No excessive re-renders
- [ ] Network requests optimized

---

## 🔍 Browser DevTools Verification

### Service Workers Tab

```
✓ sw.js should show "activated and running"
✓ No errors in service worker
✓ Update on reload: enabled
```

### Application Tab → Manifest

```
✓ Name: Video Production Management App
✓ Icons: Present
✓ Notifications: Supported
```

### Network Tab

```
✓ /api/push/subscribe called on login
✓ /api/push/send called on message send
✓ No 404 errors
✓ Reasonable response times
```

### Console Tab

```
✓ No TypeScript errors
✓ No runtime errors
✓ Service worker logs visible
```

### Storage Tab → Cookies

```
✓ Auth tokens present
✓ Session cookies valid
```

---

## 🐛 Troubleshooting

### Service Worker Not Active

```
1. Hard refresh: Ctrl+Shift+R
2. Check browser console for errors
3. Verify public/sw.js exists
4. Clear cache and try again
```

### Permission Not Showing

```javascript
// In console:
Notification.requestPermission().then(console.log);
// Should return 'granted'
```

### Push Not Working

```
1. Check VAPID keys in environment
2. Verify /api/push/send is callable
3. Check web_push_subscriptions table
4. Look for errors in server logs
```

### Build Errors

```
1. Clear .next folder
2. npm install
3. npm run build
4. Check for missing dependencies
```

---

## 📊 Test Results Template

After testing, fill in:

```
Test Environment: [URL]
Date Tested: [Date]
Tested By: [Name]

Service Worker:     [ ] Pass  [ ] Fail
Permissions:        [ ] Pass  [ ] Fail
Web Push:           [ ] Pass  [ ] Fail
Chat Messages:      [ ] Pass  [ ] Fail
@Mentions:          [ ] Pass  [ ] Fail
Diagnostics Tool:   [ ] Pass  [ ] Fail
Performance:        [ ] Pass  [ ] Fail
Mobile Compat:      [ ] Pass  [ ] Fail

Notes:
[Any issues or observations]

Ready for Prod:     [ ] Yes   [ ] No
```

---

## 🎯 Success Criteria

**All of the following should be true for production readiness**:

- [x] Code builds without errors
- [x] All routes compile correctly
- [ ] Service Worker active and functioning
- [ ] Permission request appears
- [ ] Push subscription saves to DB
- [ ] Chat messages trigger notifications
- [ ] Notifications appear on other tabs
- [ ] @Mentions work correctly
- [ ] Diagnostic tool shows all ✅
- [ ] No console errors
- [ ] Dashboard performance good
- [ ] Mobile PWA works

---

## 📝 Sign-Off

Once testing is complete, fill in:

```
Tested: [Date]
Tested By: [Name]
Issues Found: [Number]
Critical Issues: [Number]
Ready for Production: [Yes/No]
Approver: [Name]
Approval Date: [Date]
```

---

## 🔗 Documentation Reference

- **Setup Guide**: CHAT_NOTIFICATIONS_SETUP.md
- **Quick Start**: CHAT_NOTIFICATIONS_QUICKSTART.md
- **Technical Docs**: CHAT_NOTIFICATIONS_FIX_COMPLETE.md
- **Performance**: DASHBOARD_PERFORMANCE_OPTIMIZATIONS.md
- **Deployment**: DEPLOYMENT_TEST_COMPLETE.md

---

## 📞 Support Contacts

- **For Chat Issues**: See CHAT_NOTIFICATIONS_SETUP.md
- **For Performance Issues**: See DASHBOARD_PERFORMANCE_OPTIMIZATIONS.md
- **For Deployment Issues**: Check Vercel dashboard
- **For Database Issues**: Check Supabase console

---

**Status**: Ready for Testing  
**Version**: 0.1.36  
**Environment**: Vercel Staging
