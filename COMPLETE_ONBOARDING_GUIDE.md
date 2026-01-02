# Complete Project Onboarding Guide

## Welcome to The Lost Project v0.1.50

This guide provides everything you need to understand, build, test, and deploy this application across web, Android, and macOS platforms.

---

## 🎯 Project Overview

**The Lost Project** is a comprehensive team collaboration platform featuring:

### Core Features

- **Dashboard** - Project overview and management
- **Chat** - Real-time team messaging
- **Projects** - Create and manage projects
- **Sub-Projects** - Organize work in projects
- **Files** - Attach and share project files
- **Invoices** - Invoice management and tracking
- **Comments** - Discuss project details
- **Notifications** - Real-time push notifications

### Supported Platforms

1. **Web** (https://tlp-app-v2.vercel.app) - Browser-based, offline-capable
2. **Android** - PWA or native app
3. **macOS** - Native app via DMG installer

### Technology Stack

- **Frontend:** Next.js 16.0.10 + React 19.2.1 + TypeScript
- **Backend:** Supabase (PostgreSQL, Auth, Real-time)
- **Desktop:** Tauri 2.9.5 + Rust 1.92.0
- **Deployment:** Vercel (web)

---

## 🚀 Quick Start

### For Development

```bash
cd /Users/adwaitparchure/TLP\ APP/TLPappAndroidandPWAbuild
npm install
npm run dev
# Opens http://localhost:3000
```

### For Testing Web Build

```bash
npm run build
npm start
# Test production build locally
```

### For Building macOS App

```bash
chmod +x build-macos-simple.sh
./build-macos-simple.sh
# Creates DMG installer
```

### For Testing Notifications (Android)

1. Install web app as PWA
2. See notification handler (bottom-left)
3. Click "Enable Notifications"
4. Test with "Test Notification" button

---

## 📁 Project Structure

```
/TLPappAndroidandPWAbuild/
│
├── 📂 app/                          # Next.js app directory
│   ├── page.tsx                     # Login page
│   ├── layout.tsx                   # Root layout
│   ├── (auth)/                      # Auth routes
│   ├── (app)/
│   │   ├── dashboard/               # Main app (protected)
│   │   ├── chat/                    # Chat interface
│   │   └── settings/                # User settings
│   └── api/                         # API routes (20+ endpoints)
│       ├── auth/                    # Authentication
│       ├── push/                    # Push notifications
│       ├── client/
│       │   ├── projects/
│       │   ├── chat/
│       │   ├── profile/
│       │   └── invoices/
│
├── 📂 components/                   # React components
│   ├── notification-permission-handler.tsx  # Push UI
│   ├── pull-to-refresh.tsx
│   ├── dashboard/
│   ├── chat/
│   └── [other components]/
│
├── 📂 lib/                          # Utilities
│   ├── supabase.ts                  # Client
│   ├── auth.ts                      # Auth helpers
│   └── [utilities]/
│
├── 📂 public/                       # Static assets
│   ├── sw.js                        # Service Worker
│   ├── manifest.json                # PWA manifest
│   └── icons/
│
├── 📂 src-tauri/                    # Tauri (macOS)
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   ├── src/
│   │   └── lib.rs
│   └── target/
│       └── release/bundle/macos/    # DMG output
│
├── 📄 next.config.ts                # Next.js config
├── 📄 package.json                  # Dependencies (v0.1.50)
├── 📄 tsconfig.json
├── 📄 tailwind.config.ts
├── 📄 build-macos-simple.sh         # PRIMARY build script
├── 📄 check-build-status.sh
│
└── 📂 docs/                         # Documentation
    ├── MACOS_DMG_BUILD.md
    ├── ANDROID_NOTIFICATION_TESTING.md
    ├── PROJECT_STATUS_AND_REFERENCE.md
    ├── QUICK_REFERENCE.md
    └── [guides]/
```

---

## 🔧 Installation & Setup

### Prerequisites

```bash
# Node.js 20+
node --version

# Git
git --version

# For macOS builds: Rust
brew install rust
# or
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Initial Setup

```bash
# Clone repo (if not already)
git clone <repo-url>

# Navigate to project
cd /Users/adwaitparchure/TLP\ APP/TLPappAndroidandPWAbuild

# Install dependencies
npm install

# Create .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
# NEXT_PUBLIC_VAPID_KEY=...
# (Get from Supabase/Firebase console)

# For Tauri (one-time)
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin  # For Apple Silicon
```

---

## 🎮 Development Workflow

### Running Development Server

```bash
npm run dev
# Opens http://localhost:3000
# Hot reload enabled
# All API routes available
```

### Making Changes

```bash
# Edit files in /app or /components
# Changes appear instantly (hot reload)
# TypeScript errors shown in terminal

# Save frequently
git add .
git commit -m "feat: description"
git push origin main
```

### Testing Changes

```bash
# Run type checking
npm run lint

# Run E2E tests
npm run test:e2e

# Test production build
npm run build
npm start
```

### Before Deploying

```bash
# 1. Check for errors
npm run lint

# 2. Test build
npm run build

# 3. Version bump
npm version patch
# 0.1.49 → 0.1.50

# 4. Commit and push
git add -A
git commit -m "feat: description"
git push origin main
# Vercel auto-deploys!
```

---

## 📱 Building for Different Platforms

### 1. Web (Vercel)

**Status:** ✅ AUTOMATED

```bash
# Just push to main branch
git push origin main
# Vercel automatically:
# - Builds the app
# - Runs tests
# - Deploys to https://tlp-app-v2.vercel.app
```

**Monitor deployment:**

- Vercel Dashboard: https://vercel.com/foundtech/tlp-app-v2
- Check deployment status
- View build logs
- Rollback if needed

### 2. Android (PWA)

**Status:** ✅ READY

```bash
# On Android device in Chrome:
1. Open https://tlp-app-v2.vercel.app
2. Tap menu (⋮) → "Install app"
3. Accept installation
4. App appears on home screen

# Or native build (future):
npm run build:apk
```

### 3. macOS (DMG)

**Status:** 🔄 READY FOR TESTING

```bash
# Option 1: Recommended
chmod +x build-macos-simple.sh
./build-macos-simple.sh

# Option 2: Manual
npm run build
npx tauri build --bundles dmg

# Output: src-tauri/target/release/bundle/macos/*.dmg
```

**Installation on Mac:**

```bash
# 1. Open DMG
open The-Lost-Project-macOS.dmg

# 2. Drag app to Applications folder
# 3. Open from Applications
# 4. App works offline!
```

---

## 🔔 Push Notifications Setup

### Enable Notifications (User Side)

**On Android:**

1. Open app in browser or PWA
2. Look for notification handler (bottom-left)
3. Click "Enable Notifications"
4. Accept permission prompt
5. Click "Subscribe to Push"
6. Done! You'll receive notifications

**On Desktop:**

1. Open https://tlp-app-v2.vercel.app
2. See notification handler UI
3. Click "Enable Notifications"
4. Accept browser permission
5. Click "Subscribe to Push"

### How Notifications Work

```
User Action (e.g., chat message)
         ↓
Server sends notification
         ↓
Firebase/FCM receives it
         ↓
Service Worker intercepts
         ↓
Shows notification to user
```

### Debug Notifications

**In Browser Console:**

```javascript
// Check permission
Notification.permission; // "granted" or "denied"

// Check Service Worker
navigator.serviceWorker.ready.then((r) => {
  r.pushManager.getSubscription().then((sub) => console.log(sub));
});

// Check stored VAPID key
localStorage.getItem("vapid_key");
```

**In Network Tab:**

- Look for: `/api/push/subscribe`
- Status should be: 200
- Response should have: subscription object

---

## 🗄️ Database Schema

### Core Tables

#### users

```sql
- id: UUID (primary key)
- email: text
- name: text
- avatar_url: text
- created_at: timestamp
```

#### projects

```sql
- id: UUID
- title: text
- description: text
- status: text (active/completed)
- user_id: UUID (foreign key)
- created_at: timestamp
```

#### chat

```sql
- id: UUID
- user_id: UUID
- project_id: UUID
- message: text
- created_at: timestamp
```

#### web_push_subscriptions

```sql
- id: UUID
- user_id: UUID
- endpoint: text (FCM endpoint)
- auth_key: text
- p256dh_key: text
- created_at: timestamp
```

### Security (Row Level Security - RLS)

All tables have RLS enabled:

- Users can only see their own data
- Shared projects visible to team members
- Admin users see everything

```sql
-- Example RLS policy
CREATE POLICY "Users can view own records"
  ON projects FOR SELECT
  USING (user_id = auth.uid());
```

---

## 🔐 Authentication

### Magic Link Flow

```
User enters email
         ↓
Server sends magic link
         ↓
User clicks link
         ↓
User logged in (session created)
         ↓
Redirect to dashboard
```

### Session Management

```typescript
// In components
const { data: session } = await supabase.auth.getSession();

if (!session) {
  // Show login page
} else {
  // Show app
}
```

### Logout

```typescript
await supabase.auth.signOut();
// Session cleared
// Redirect to login
```

---

## 🚢 Deployment Guide

### Deploy Web Update

**Step 1: Make changes**

```bash
# Edit files
git add -A
git commit -m "feat: new feature"
```

**Step 2: Version bump**

```bash
npm version patch
# 0.1.49 → 0.1.50
# Updated in package.json
```

**Step 3: Push to main**

```bash
git push origin main
# Vercel automatically builds and deploys
```

**Step 4: Monitor deployment**

```
Visit: https://vercel.com/foundtech/tlp-app-v2
- Watch build progress
- Check logs if error
- App live within 2-5 minutes
```

### Deploy macOS DMG

**Step 1: Ensure web is deployed first**

```bash
# Confirm latest version on Vercel
# https://tlp-app-v2.vercel.app should be latest
```

**Step 2: Build DMG**

```bash
./build-macos-simple.sh
# Takes 5-10 minutes first time
# 2-3 minutes on cached builds
```

**Step 3: Locate output**

```bash
find src-tauri/target -name "*.dmg" -type f
# Copy to distribution location
```

**Step 4: Test before sharing**

```bash
open The-Lost-Project-macOS.dmg
# Double-click to mount
# Drag to Applications folder
# Launch and test
```

---

## 🐛 Troubleshooting

### "App won't build"

```bash
# Clean and retry
rm -rf .next node_modules
npm install
npm run build
```

### "Notifications don't appear"

```bash
# 1. Check permission
Notification.permission

# 2. Check Service Worker
# DevTools → Application → Service Workers

# 3. Check console for errors
# F12 → Console tab

# 4. Rebuild if needed
npm run build
```

### "DMG installation fails"

```bash
# Unmount old DMG
diskutil unmount "/Volumes/The Lost Project"

# Clean and rebuild
rm -rf src-tauri/target
./build-macos-simple.sh

# Try opening new DMG
open The-Lost-Project-macOS.dmg
```

### "API calls fail"

```bash
# Check Network tab (F12)
# Look for red/failed requests

# Check console for CORS errors
# Verify Supabase credentials in .env.local

# Test API directly
curl https://tlp-app-v2.vercel.app/api/auth/session
```

---

## 📊 Performance Tips

### Optimize Web App

```bash
# Analyze bundle size
npm run build
# Check .next folder size

# Use images optimized
# Next.js Image component handles this
```

### Speed Up Builds

```bash
# Use Turbopack (faster)
npm run dev:turbo

# Clear cache
rm -rf .next .turbo

# Use SSD (faster I/O)
```

### Optimize macOS Build

```bash
# First build (slower): 8-15 minutes
# Cached builds: 2-3 minutes

# To speed up:
# - Only build Intel target (done)
# - Don't rebuild Next.js if no changes
```

---

## 📚 Important Documentation

| Document                                                           | Purpose                        |
| ------------------------------------------------------------------ | ------------------------------ |
| [MACOS_DMG_BUILD.md](MACOS_DMG_BUILD.md)                           | Complete macOS DMG build guide |
| [ANDROID_NOTIFICATION_TESTING.md](ANDROID_NOTIFICATION_TESTING.md) | Notification handler testing   |
| [PROJECT_STATUS_AND_REFERENCE.md](PROJECT_STATUS_AND_REFERENCE.md) | Full technical reference       |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md)                           | Quick lookup card              |
| [BUILD_REFERENCE_CARD.md](BUILD_REFERENCE_CARD.md)                 | Build commands cheatsheet      |

---

## 🔗 Important Links

### Tools & Dashboards

- **Web App:** https://tlp-app-v2.vercel.app
- **Vercel:** https://vercel.com/foundtech/tlp-app-v2
- **Supabase:** https://app.supabase.com
- **GitHub:** [Your repo URL]

### Documentation

- **Next.js:** https://nextjs.org/docs
- **Tauri:** https://tauri.app
- **Supabase:** https://supabase.io/docs
- **Service Workers:** https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API

---

## ⏱️ Timeline & Milestones

| Version | Date   | Status     | Notes                      |
| ------- | ------ | ---------- | -------------------------- |
| 0.1.50  | Dec 29 | 🔄 CURRENT | Documentation complete     |
| 0.1.49  | Dec 29 | ✅ LIVE    | Web deployment fixed       |
| 0.1.48  | Dec 28 | ✅ PREV    | Notification handler added |
| 0.1.47  | Dec 27 | ✅         | UI improvements            |

---

## 🎯 Current Status

### ✅ Completed

- Web app fully functional
- Notification infrastructure complete
- Android PWA ready
- macOS Tauri setup complete
- Build scripts created
- Documentation written

### 🔄 In Progress

- macOS DMG testing
- "Resource busy" error investigation
- Android device testing

### ⏳ Pending

- Finalize macOS app
- Android device verification
- In-app update mechanism
- Distribute DMG to users

---

## 🚀 Next Steps

### For You

1. **Test the web app:** https://tlp-app-v2.vercel.app
2. **Try notifications:** Enable on Android device
3. **Build macOS DMG:** Run `./build-macos-simple.sh`
4. **Test installation:** Try installing on macOS
5. **Report issues:** Document any errors in console

### For Team

1. **Share web URL:** Send https://tlp-app-v2.vercel.app
2. **Test on devices:** Try on Android/iOS/Mac
3. **Gather feedback:** Collect user issues
4. **Plan updates:** Next features to build

---

## 💡 Pro Tips

1. **Keep hot reload running** while developing: `npm run dev`
2. **Monitor logs** in DevTools while testing
3. **Clear cache** if things seem stale: `rm -rf .next`
4. **Test offline** by disconnecting network briefly
5. **Check console** for errors before asking for help
6. **Use git branches** for features: `git checkout -b feature/name`

---

## 📞 Getting Help

### Check These First

1. Browser console (F12) for error messages
2. Network tab for failed API calls
3. Service Worker status in DevTools
4. Build logs in terminal output
5. Documentation files in this repo

### Common Errors & Fixes

- **"Cannot find module"** → `npm install`
- **"Port 3000 in use"** → `lsof -i :3000` then kill process
- **"Build fails"** → `rm -rf .next && npm run build`
- **"Permissions denied"** → `chmod +x build-*.sh`

---

## 🎓 Learning Resources

### Understand the Stack

- **Next.js:** Pages in `/app`, API routes in `/app/api`
- **Supabase:** Real-time database with auth included
- **Tauri:** Native window + web frontend
- **React:** Components in `/components`
- **TypeScript:** Type-safe JavaScript

### Try Examples

- Chat: Real-time messages via Supabase Realtime
- Projects: Full CRUD with database
- Notifications: Service Worker + Push API
- Auth: Magic links via Supabase

---

**Welcome to The Lost Project! Start building! 🚀**

---

**Document Version:** 1.0  
**Last Updated:** December 29, 2025  
**For Version:** 0.1.50  
**Status:** Complete and ready for use
