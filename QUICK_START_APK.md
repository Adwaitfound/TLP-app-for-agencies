# 🚀 Quick Start - Build APK NOW

## Step 1: Verify Java & Android SDK (5 minutes)

```bash
# Check Java
java -version
# Should show version 11 or higher

# Check Android SDK
ls -la ~/Library/Android/sdk/
# Should show platform-tools, build-tools, etc.
```

If Java or Android SDK is missing, follow the detailed guide in `APK_PWA_BUILD_GUIDE.md`

---

## Step 2: Build APK (15-30 minutes depending on internet)

```bash
# From project root directory
./build-apk.sh
```

This script will:
1. ✅ Install npm dependencies
2. ✅ Build Next.js app
3. ✅ Set up Capacitor
4. ✅ Add Android platform
5. ✅ Build APK using Gradle

**Output:** 
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## Step 3: Test APK on Device (5 minutes)

### Option A: Using Android Emulator
```bash
# Open Android Studio and create/start an emulator
# Then in terminal:
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Option B: Using Physical Device
```bash
# Connect device via USB
adb devices  # Should show your device

# Install APK
adb install android/app/build/outputs/apk/release/app-release.apk

# Check if installed
adb shell pm list packages | grep vidpro
```

---

## What if Build Fails?

### Issue: "gradle command not found"
```bash
cd android
./gradlew wrapper --gradle-version=8.0
cd ..
./build-apk.sh
```

### Issue: "JAVA_HOME not set"
```bash
# Find Java
/usr/libexec/java_home -v 17

# Add to ~/.zprofile
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zprofile
source ~/.zprofile

# Try build again
./build-apk.sh
```

### Issue: "SDK not found"
```bash
# Install required SDK tools
sdkmanager "platforms;android-34"
sdkmanager "build-tools;34.0.0"
sdkmanager "cmdline-tools;latest"

# Accept licenses
sdkmanager --licenses  # Press 'y' for all

# Try build again
./build-apk.sh
```

---

## Files Created for APK/PWA

### Configuration
- ✅ `capacitor.config.json` - Capacitor configuration
- ✅ `next.config.ts` - Updated with PWA support
- ✅ `app/layout.tsx` - Updated with PWA meta tags

### Build Scripts
- ✅ `build-apk.sh` - Automated APK build
- ✅ `build-pwa.sh` - Automated PWA build

### PWA Files
- ✅ `public/manifest.json` - PWA manifest
- ✅ `public/sw.js` - Service worker

### Documentation
- ✅ `APK_PWA_BUILD_GUIDE.md` - Complete guide
- ✅ `QUICK_BUILD_CHECKLIST.md` - Detailed checklist
- ✅ `QUICK_START_APK.md` - This file!

### Dependencies Added
- ✅ `@capacitor/core` - Mobile framework
- ✅ `@capacitor/android` - Android support
- ✅ `@capacitor/app` - App utilities
- ✅ `@capacitor/splash-screen` - Splash screen
- ✅ `next-pwa` - PWA support for Next.js

---

## Next: Build PWA

After APK is built, build PWA:

```bash
./build-pwa.sh
```

Then test locally:
```bash
npm run build && npm start
# Open http://localhost:3000
# Check DevTools → Application → Manifest
```

---

## Need Help?

1. **APK stuck?** → See `APK_PWA_BUILD_GUIDE.md` → Troubleshooting section
2. **Want full guide?** → Read `APK_PWA_BUILD_GUIDE.md`
3. **Comprehensive checklist?** → See `QUICK_BUILD_CHECKLIST.md`

---

## Summary

**What you're building:**
- 📱 **APK** - Native Android app installable on any Android device
- 🌐 **PWA** - Progressive Web App installable on desktop/mobile web

**Why both?**
- APK: Better Android integration, offline-first, app store distribution
- PWA: Web-based, no installation needed, works on all platforms

**Time to first APK:** ~30 minutes (with dependencies)
**Time to PWA:** ~10 minutes (already mostly set up)

---

Let's go! 🚀 Run:
```bash
./build-apk.sh
```
