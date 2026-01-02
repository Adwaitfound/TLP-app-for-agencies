# Quick Reference Card - The Lost Project v0.1.49

## 🚀 Current Status

- **Web App:** ✅ LIVE (https://tlp-app-v2.vercel.app)
- **macOS DMG:** 🔄 IN PROGRESS (build scripts ready)
- **Android Notifications:** ✅ READY (test on device)
- **Version:** 0.1.49

## 📱 Web App

**URL:** https://tlp-app-v2.vercel.app  
**Features:** Dashboard, Chat, Projects, Invoices, Files  
**Login:** Magic link via email  
**Offline:** Works with cached data

## 🖥️ macOS App Build

### Quick Build

```bash
cd /Users/adwaitparchure/TLP\ APP/TLPappAndroidandPWAbuild
chmod +x build-macos-simple.sh
source ~/.cargo/env
./build-macos-simple.sh
```

**Duration:** 5-10 min (first), 2-3 min (cached)  
**Output:** `The-Lost-Project-macOS.dmg` (~50-70MB)

### Install on Mac

1. Double-click `.dmg` file
2. Drag "The Lost Project" to Applications
3. Open from Applications folder

### Troubleshooting

```bash
# If "Resource busy" error:
diskutil unmount "/Volumes/The Lost Project"
open The-Lost-Project-macOS.dmg
```

## 🔔 Android Notifications

### Enable on Device

1. Open https://tlp-app-v2.vercel.app on Android
2. Scroll to **bottom-left corner**
3. Tap "Enable Notifications"
4. Accept system permission
5. Tap "Subscribe to Push"
6. Tap "Test Notification"

### Debug

- Open browser DevTools (F12)
- Check Console tab for errors
- Look for red error messages
- Check `/api/push/subscribe` in Network tab

## 📂 File Locations

| Item                 | Location                                         |
| -------------------- | ------------------------------------------------ |
| Web App Code         | `/app/`                                          |
| Components           | `/components/`                                   |
| Notification Handler | `components/notification-permission-handler.tsx` |
| API Routes           | `/app/api/`                                      |
| Tauri Config         | `src-tauri/tauri.conf.json`                      |
| Build Script         | `build-macos-simple.sh`                          |
| DMG Output           | `src-tauri/target/release/bundle/macos/`         |

## 🔧 Common Tasks

### Deploy Web Update

```bash
# Edit code, then:
npm version patch
npm run build
git add -A && git commit -m "feat: description"
git push origin main
# Vercel auto-deploys
```

### Check Build Status

```bash
./check-build-status.sh
# Shows cargo process, build dirs, DMG files
```

### View Server Logs

```bash
# Check Tauri output:
grep -i error src-tauri/target/release/build/*.log

# Check Service Worker:
# DevTools → Application → Service Workers
```

### View Notifications Debug

```javascript
// In browser console:
Notification.permission; // "granted", "denied", "default"
navigator.serviceWorker.ready.then((r) => r.pushManager.getSubscription());
```

## 🔐 Environment

- **Auth:** Supabase Magic Links
- **Database:** Supabase PostgreSQL
- **Storage:** Supabase Storage (CDN)
- **Push Keys:** VAPID keys configured
- **All:** Secured with Row Level Security (RLS)

## 📊 API Endpoints

### Auth

```
POST   /api/auth/login              (magic link)
GET    /api/auth/session
POST   /api/auth/logout
```

### Push

```
POST   /api/push/subscribe          (register device)
GET    /api/push/subscriptions      (list)
POST   /api/push/send               (send notification)
POST   /api/push/test               (test)
```

### Data

```
GET/POST  /api/client/projects      (list/create)
GET       /api/client/projects/[id] (detail)
GET       /api/client/projects/[id]/comments
GET       /api/client/projects/[id]/sub-projects
GET       /api/client/projects/[id]/project-files
GET/POST  /api/client/chat
GET/PUT   /api/client/profile
POST      /api/client/profile/avatar
```

## 🧪 Testing Checklist

### Web

- [ ] Login works
- [ ] Dashboard loads
- [ ] Create project
- [ ] Send chat message
- [ ] Works offline
- [ ] Works on mobile

### Android

- [ ] Handler visible (bottom-left)
- [ ] Permissions work
- [ ] Subscription shows success
- [ ] Test notification appears
- [ ] Debug log clear

### macOS

- [ ] DMG mounts without error
- [ ] App installs to Applications
- [ ] App launches
- [ ] Works without internet
- [ ] Chat syncs when online

## 💾 Database Tables

- users, projects, sub_projects
- project_files, comments, chat
- invoices, invoice_items
- web_push_subscriptions

## 🎯 Next Steps

1. **Test macOS DMG**

   ```bash
   ./build-macos-simple.sh
   open "$(find src-tauri/target -name '*.dmg')"
   ```

2. **Test on Android**

   - Install as PWA
   - Test notification handler
   - Try sending notifications

3. **Fix Issues** (if any)
   - Check logs
   - Rebuild
   - Test again

## 📞 Debugging Guide

### Issue: App won't load

```bash
# Check Next.js build
npm run build

# Check Tauri config
cat src-tauri/tauri.conf.json | jq

# Check Service Worker
# DevTools → Application → Service Workers
```

### Issue: Notifications don't work

```bash
# Check permissions
Notification.permission

# Check subscription
navigator.serviceWorker.ready.then(r => r.pushManager.getSubscription())

# Test push endpoint
curl -X POST https://tlp-app-v2.vercel.app/api/push/test
```

### Issue: Build fails

```bash
# Clean and retry
rm -rf .next src-tauri/target
./build-macos-simple.sh

# Check Rust
rustup --version
rustup target list

# Add missing target if needed
rustup target add x86_64-apple-darwin
```

## 🚀 Version Info

| Version | Build | Deploy | Status |
| ------- | ----- | ------ | ------ |
| 0.1.49  | ✅    | ✅     | LIVE   |
| 0.1.48  | ✅    | ✅     | PREV   |

## 📚 Documentation

- [macOS DMG Build](MACOS_DMG_BUILD.md)
- [Android Notification Testing](ANDROID_NOTIFICATION_TESTING.md)
- [Project Status Reference](PROJECT_STATUS_AND_REFERENCE.md)
- [Build Reference Card](BUILD_REFERENCE_CARD.md)

## 🔗 Important URLs

- **Web App:** https://tlp-app-v2.vercel.app
- **Vercel Dashboard:** https://vercel.com/foundtech/tlp-app-v2
- **Supabase Console:** https://app.supabase.com
- **GitHub:** [Your repo URL]

## ⏱️ Build Times

- npm build: 45-60 sec
- Tauri build: 5-10 min (first), 2-3 min (cached)
- Total DMG: 8-15 min

## 📦 App Size

- Web: 500KB gzipped
- DMG: 50-70MB compressed
- Installed: 200-300MB

---

**Last Updated:** December 29, 2025  
**Status:** ✅ Updated to v0.1.49  
**Keep this handy when building/testing!**
