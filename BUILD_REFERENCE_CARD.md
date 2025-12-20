# 📱 APK & 🌐 PWA Build Reference Card

## 🎯 QUICK ACCESS

| Need | Command | Doc |
|------|---------|-----|
| **Build APK** | `./build-apk.sh` | [Guide](APK_PWA_BUILD_GUIDE.md) |
| **Build PWA** | `./build-pwa.sh` | [Guide](APK_PWA_BUILD_GUIDE.md) |
| **Test Locally** | `npm run build && npm start` | [Quick Start](QUICK_START_APK.md) |
| **Install on Device** | `adb install app-release.apk` | [Guide](APK_PWA_BUILD_GUIDE.md) |
| **Deploy PWA** | `npx vercel` | [Guide](APK_PWA_BUILD_GUIDE.md) |

---

## ✅ PRE-BUILD CHECKLIST (5 min)

```bash
# 1. Check Java
java -version          # Need 11+

# 2. Check Android SDK
sdkmanager --list_installed

# 3. Check Node.js
node --version         # Need 18+

# 4. Set Java path (if needed)
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

---

## 🚀 BUILD APK (First Time: 30 min)

```bash
# From project root
./build-apk.sh

# Expected output
# android/app/build/outputs/apk/release/app-release.apk
```

### If Build Fails:
```bash
# Clear and retry
cd android
./gradlew clean
./gradlew assembleRelease

# Or just rerun
../build-apk.sh
```

---

## 🌐 BUILD PWA (10 min)

```bash
# After APK is done
./build-pwa.sh

# Add icons to public/icons/
# - icon-192x192.png
# - icon-256x256.png
# - icon-384x384.png
# - icon-512x512.png
```

---

## 🧪 TEST LOCALLY (5 min)

```bash
# Build + Run
npm run build && npm start

# Open browser
# http://localhost:3000

# Check PWA (DevTools)
# Application → Manifest → Should show "Video Production App"
# Application → Service Workers → Should show active
```

---

## 📲 INSTALL ON DEVICE (1 min)

### Android Emulator:
```bash
# Start emulator first, then:
adb install android/app/build/outputs/apk/release/app-release.apk
```

### Physical Device:
```bash
# Connect via USB, enable USB debugging, then:
adb devices                 # List devices
adb install app-release.apk # Install
```

---

## 🌍 DEPLOY PWA (2 min)

### Option 1: Vercel (Recommended)
```bash
npm install -g vercel
vercel
# Follow prompts - app deployed!
```

### Option 2: Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

---

## 📂 KEY FILES CREATED

| File | Purpose |
|------|---------|
| `capacitor.config.json` | Android app config |
| `next.config.ts` | PWA settings |
| `app/layout.tsx` | PWA meta tags |
| `public/manifest.json` | App metadata |
| `public/sw.js` | Service worker |
| `build-apk.sh` | APK build script |
| `build-pwa.sh` | PWA build script |

---

## 🔧 COMMON ISSUES

### ❌ "gradle command not found"
```bash
cd android && ./gradlew wrapper --gradle-version=8.0 && cd ..
./build-apk.sh
```

### ❌ "JAVA_HOME not set"
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
./build-apk.sh
```

### ❌ "SDK not found"
```bash
sdkmanager "platforms;android-34"
sdkmanager "build-tools;34.0.0"
sdkmanager --licenses  # Press y
./build-apk.sh
```

### ❌ "Manifest not found"
- Ensure `public/manifest.json` exists
- Check `app/layout.tsx` has manifest reference
- Clear browser cache
- Rebuild: `npm run build`

---

## 📊 OUTPUT LOCATIONS

```
APK:  android/app/build/outputs/apk/release/app-release.apk
PWA:  Deploy from repo root using vercel/netlify
Logs: Browser DevTools → Console
      Device: adb logcat
```

---

## 🎯 WHAT EACH BUILD DOES

### APK:
✅ Native Android app
✅ Works offline
✅ Installable on any Android device
✅ Can be distributed via Google Play Store
✅ Better device integration

### PWA:
✅ Web app (works in browser)
✅ Installable on home screen
✅ Works offline (after first visit)
✅ Cross-platform (Android, iOS, Desktop)
✅ Easy to deploy and update

---

## 📚 FULL DOCUMENTATION

| Document | Purpose |
|----------|---------|
| [APK_PWA_BUILD_GUIDE.md](APK_PWA_BUILD_GUIDE.md) | Complete setup & troubleshooting |
| [QUICK_BUILD_CHECKLIST.md](QUICK_BUILD_CHECKLIST.md) | Detailed step-by-step checklist |
| [QUICK_START_APK.md](QUICK_START_APK.md) | Quick start guide |
| [APK_PWA_BUILD_SETUP_SUMMARY.md](APK_PWA_BUILD_SETUP_SUMMARY.md) | Setup summary |

---

## ⏱️ TIME ESTIMATE

| Task | Time |
|------|------|
| Prerequisites check | 5 min |
| First APK build | 30 min |
| PWA build | 10 min |
| Local testing | 10 min |
| Deploy PWA | 5 min |
| **Total** | **~60 min** |

---

## 💡 PRO TIPS

1. **APK Size:** Keep under 100MB for Play Store approval
2. **Icons:** Use https://www.pwabuilder.com/imageGenerator
3. **Testing:** Always test on real device before release
4. **Signing:** Backup your release-key.jks securely
5. **Analytics:** Add Google Analytics for tracking
6. **CI/CD:** Set up GitHub Actions for auto-builds

---

## 📞 HELP & RESOURCES

- 🔗 [Capacitor Docs](https://capacitorjs.com/)
- 🔗 [Next.js PWA](https://nextjs.org/docs)
- 🔗 [Android Dev](https://developer.android.com/)
- 🔗 [PWA Builder](https://www.pwabuilder.com)
- 🔗 [Google Play Console](https://play.google.com/console)

---

## 🎯 NEXT STEPS

1. ✅ Check prerequisites: `java -version`
2. ✅ Build APK: `./build-apk.sh`
3. ✅ Build PWA: `./build-pwa.sh`
4. ✅ Test: `npm run build && npm start`
5. ✅ Deploy: `npx vercel`

---

## 🚦 STATUS: READY TO BUILD ✅

All files configured. Run `./build-apk.sh` to start!

**Updated:** December 19, 2025
