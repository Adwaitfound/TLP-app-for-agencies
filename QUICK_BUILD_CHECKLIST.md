# APK & PWA Build Checklist

## Pre-Build Setup

### One-Time Setup (Do This First)
- [ ] Install JDK 17+
  ```bash
  brew install openjdk@17
  export JAVA_HOME=$(/usr/libexec/java_home -v 17)
  ```
- [ ] Install Android SDK
  ```bash
  brew install --cask android-studio
  ```
- [ ] Accept Android licenses
  ```bash
  sdkmanager --licenses
  ```
- [ ] Set up environment variables
  ```bash
  echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zprofile
  echo 'export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH' >> ~/.zprofile
  ```

### Before Building
- [ ] Navigate to project directory
- [ ] Pull latest code from git
- [ ] Review changes in layout.tsx
- [ ] Ensure `.env` variables are set (if needed)

---

## APK Build Checklist

### Prerequisites
- [ ] Java is installed and JAVA_HOME is set
- [ ] Android SDK is installed
- [ ] Android licenses accepted
- [ ] At least 5GB free disk space
- [ ] Android device or emulator available

### Build Steps
- [ ] Run: `./build-apk.sh`
- [ ] Script completes without errors
- [ ] APK file generated at: `android/app/build/outputs/apk/release/`
- [ ] Note the APK file size and name

### Testing
- [ ] APK copied to device/emulator
- [ ] Installed successfully on device
- [ ] App launches without crashes
- [ ] Navigation and UI work correctly
- [ ] Backend API calls work (Supabase)
- [ ] Authentication flows work
- [ ] File uploads/downloads work (if applicable)

### Release Preparation
- [ ] Create signing key: `keytool -genkey -v -keystore release-key.jks...`
- [ ] Update capacitor.config.json with keystore password
- [ ] Build release APK (signed)
- [ ] Test signed APK on device
- [ ] Check file size (target: <100MB)
- [ ] Verify no sensitive data in APK

### Deployment
- [ ] Register with Google Play Console
- [ ] Complete app store listing
- [ ] Add screenshots and description
- [ ] Upload APK to Play Store
- [ ] Set pricing and countries
- [ ] Submit for review
- [ ] Monitor review status

---

## PWA Build Checklist

### Prerequisites
- [ ] Next.js and next-pwa installed
- [ ] Node.js 18+ installed
- [ ] 2GB free disk space

### Icon Setup
- [ ] Create 6 icon files in `public/icons/`:
  - [ ] icon-192x192.png
  - [ ] icon-256x256.png
  - [ ] icon-384x384.png
  - [ ] icon-512x512.png
  - [ ] maskable-icon-192x192.png
  - [ ] maskable-icon-512x512.png
- [ ] Verify all icons are PNG format
- [ ] Test icons with PWA Icon Generator: https://www.pwabuilder.com/imageGenerator

### Build Steps
- [ ] Run: `./build-pwa.sh`
- [ ] Script completes without errors
- [ ] Verify manifest.json exists and is valid
- [ ] Verify service worker is generated
- [ ] Check build output for warnings

### Testing
- [ ] Run: `npm run build && npm start`
- [ ] Open app in Chrome/Edge on desktop
- [ ] Check DevTools → Application → Manifest
- [ ] Install prompt appears
- [ ] Add to home screen works
- [ ] App works offline (after visiting online first)
- [ ] Test on mobile Safari (iOS)
- [ ] Test on Chrome (Android)

### Configuration
- [ ] Review and update manifest.json:
  - [ ] Correct app name and short_name
  - [ ] Accurate description
  - [ ] Correct start_url
  - [ ] Proper theme_color and background_color
  - [ ] All icons listed
- [ ] Test share target (if implemented)
- [ ] Test shortcuts (if implemented)
- [ ] Verify push notifications (if implemented)

### Deployment
- [ ] Choose hosting (Vercel recommended):
  ```bash
  npm install -g vercel
  vercel
  ```
- [ ] Or deploy to Netlify:
  ```bash
  npm install -g netlify-cli
  netlify deploy
  ```
- [ ] Verify HTTPS is enabled (required for PWA)
- [ ] Test install on deployed version
- [ ] Monitor analytics for PWA installations

---

## Testing Checklist (Both APK & PWA)

### Functionality
- [ ] Login/Signup works
- [ ] Dashboard loads and displays data
- [ ] Can create/edit/delete items
- [ ] Search functionality works
- [ ] File uploads work
- [ ] File downloads work (if applicable)
- [ ] Real-time updates work (if using Supabase subscriptions)
- [ ] Forms validate correctly
- [ ] Error messages display properly

### Performance
- [ ] App loads in < 3 seconds
- [ ] Navigation between pages is smooth
- [ ] No memory leaks detected
- [ ] API calls complete in reasonable time
- [ ] Images load quickly

### User Experience
- [ ] Responsive on all screen sizes
- [ ] Touch interactions work on mobile
- [ ] Text is readable
- [ ] Buttons are easy to tap (48px+ recommended)
- [ ] Consistent styling across pages
- [ ] Dark mode works (if enabled)

### Security
- [ ] No sensitive data logged to console
- [ ] API calls use HTTPS
- [ ] Auth tokens not exposed
- [ ] File uploads validated
- [ ] CSRF protection enabled
- [ ] No hardcoded credentials

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Focus indicators visible
- [ ] Alternative text for images

---

## Quick Troubleshooting

### APK Won't Build
```bash
# Check Java
java -version

# Check Android SDK
sdkmanager --list_installed

# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleRelease
```

### PWA Icons Not Showing
- [ ] Verify file paths in manifest.json
- [ ] Check file sizes (images should be < 1MB each)
- [ ] Verify image format (must be PNG)
- [ ] Clear browser cache
- [ ] Rebuild: `npm run build`

### App Crashes on Install
- [ ] Check logcat: `adb logcat | grep "app-name"`
- [ ] Verify manifest.xml is valid
- [ ] Check API compatibility
- [ ] Review console for errors

### Service Worker Not Installing
- [ ] Ensure HTTPS (for production)
- [ ] Check DevTools → Application → Service Workers
- [ ] Verify public/sw.js exists
- [ ] Clear service worker cache
- [ ] Check browser console for errors

---

## Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Next.js PWA**: https://nextjs.org/docs
- **Android Dev Console**: https://developer.android.com/
- **PWA Builder**: https://www.pwabuilder.com
- **Google Play Console**: https://play.google.com/console
- **Vercel Deployment**: https://vercel.com/docs

---

## Important Notes

⚠️ **Before Release:**
1. Update version numbers in both APK and PWA
2. Test on multiple devices and browsers
3. Verify all links and APIs are production-ready
4. Back up signing keys in secure location
5. Set up error tracking (Sentry, etc.)
6. Configure analytics

📝 **After Release:**
1. Monitor crash reports
2. Check user feedback
3. Watch performance metrics
4. Plan next iteration
5. Set up automated CI/CD pipeline

---

## Build Commands Reference

```bash
# Install dependencies
npm install

# Development
npm run dev                    # Local dev server
npm run build:pwa              # Build PWA

# Build for production
npm run build                  # Next.js build
npm start                      # Production server

# APK Commands
./build-apk.sh                 # Full APK build
npm run cap:add:android        # Add Android platform
npm run cap:sync               # Sync Capacitor
npm run cap:open:android       # Open in Android Studio

# Gradle commands (if needed)
cd android
./gradlew assembleDebug        # Debug APK
./gradlew assembleRelease      # Release APK
./gradlew clean                # Clean build
```

---

**Last Updated:** December 19, 2025
**Status:** Ready for APK & PWA builds ✅
