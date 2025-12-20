# APK and PWA Build Guide

This guide will help you build both an Android APK and Progressive Web App (PWA) for your Video Production Management App.

## Prerequisites

### For APK Build:
1. **Java Development Kit (JDK)** - Version 11 or higher
   ```bash
   # Check if Java is installed
   java -version
   ```

2. **Android SDK** - Install Android Studio or command-line tools
   - Download from: https://developer.android.com/studio
   - Or install via Homebrew (macOS):
     ```bash
     brew install android-sdk
     ```

3. **Android NDK** (optional, for native code compilation)

4. **Gradle** - Usually bundled with Android Studio

5. **Node.js** - Version 18+ (you already have this)

### For PWA Build:
- Node.js 18+ (you already have this)
- npm (you already have this)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Capacitor (for APK building)
- next-pwa (for PWA support)
- All other project dependencies

### 2. Build APK (Android Package)

```bash
chmod +x build-apk.sh
./build-apk.sh
```

**What this script does:**
1. Installs npm dependencies
2. Builds the Next.js application
3. Adds Android platform to Capacitor
4. Syncs Capacitor configuration
5. Builds the APK using Gradle

**Output:** Your APK will be located at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### 3. Build PWA (Progressive Web App)

```bash
chmod +x build-pwa.sh
./build-pwa.sh
```

**What this script does:**
1. Installs npm dependencies
2. Builds the Next.js application with PWA support
3. Generates service worker and manifest files
4. Validates PWA configuration

**Output:** PWA is ready to deploy

---

## Detailed Setup Steps

### Step 1: Install Java & Android SDK

**macOS:**
```bash
# Install Java 17
brew install openjdk@17
# Set JAVA_HOME
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install openjdk-17-jdk
```

**Windows:**
- Download from Oracle JDK or use Chocolatey:
```bash
choco install openjdk17
```

**Android SDK:**
```bash
# macOS via Homebrew
brew install --cask android-studio

# Or install command-line tools
brew install android-sdk
```

### Step 2: Configure Android Environment

Set up environment variables:

**macOS/Linux:**
```bash
# Add to ~/.bash_profile, ~/.zprofile, or ~/.bashrc
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
# export ANDROID_HOME=$HOME/Android/Sdk       # Linux

export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
export PATH=$ANDROID_HOME/platform-tools:$PATH
export PATH=$ANDROID_HOME/emulator:$PATH
```

**Windows:**
- Open Environment Variables
- Add `ANDROID_HOME`: `C:\Users\YourUsername\AppData\Local\Android\Sdk`
- Add to PATH: `%ANDROID_HOME%\cmdline-tools\latest\bin`
- Add to PATH: `%ANDROID_HOME%\platform-tools`

### Step 3: Accept Android SDK Licenses

```bash
sdkmanager --licenses
# Press 'y' to accept all licenses
```

### Step 4: Create a Signing Key

For production APK, you need a keystore:

```bash
keytool -genkey -v -keystore release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias release

# Move to safe location
mv release-key.jks ~/.android/

# Update capacitor.config.json with your credentials
```

### Step 5: Build and Test

```bash
# Development APK (unsigned)
npm run cap:add:android
npm run cap:sync

# Test on emulator or device
npx cap open android  # Opens Android Studio
```

---

## APK Build Process

### Development APK
```bash
# Build debug APK (for testing)
cd android
./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Release APK
```bash
# Build release APK (for production)
./build-apk.sh
# Output: android/app/build/outputs/apk/release/app-release.apk
```

### Deploy to Device

```bash
# Using adb (Android Debug Bridge)
adb devices  # List connected devices
adb install android/app/build/outputs/apk/release/app-release.apk

# Or install via Android Studio
# Run > Select Device > Run app
```

---

## PWA Build Process

### Local Development Testing

```bash
# Build the app
npm run build:pwa

# Start production server
npm start

# Visit http://localhost:3000
# Open DevTools → Application → Manifest to verify
# Should see "Install app" prompt in address bar
```

### Add PWA Icons

Create icons and place them in `public/icons/`:

**Required sizes:**
- `icon-192x192.png`
- `icon-256x256.png`
- `icon-384x384.png`
- `icon-512x512.png`
- `maskable-icon-192x192.png` (for adaptive icons)
- `maskable-icon-512x512.png`

**Generate icons:**
```bash
# Using ImageMagick (if you have it installed)
convert original-logo.png -resize 192x192 public/icons/icon-192x192.png
convert original-logo.png -resize 512x512 public/icons/icon-512x512.png
# etc...

# Or use online PWA icon generator:
# https://www.pwabuilder.com/imageGenerator
```

### Customize PWA Settings

Edit `public/manifest.json`:

```json
{
  "name": "Your App Name",
  "short_name": "Short Name",
  "description": "Your app description",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "icons": [
    // ... your icons
  ]
}
```

### Deploy PWA

**Vercel (Recommended for Next.js):**
```bash
npm install -g vercel
vercel

# Your app is now live with PWA support!
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy
```

**Self-hosted:**
```bash
# Build
npm run build:pwa

# Start
npm start

# Deploy to your server
```

---

## Troubleshooting

### APK Build Issues

**Issue: "gradle command not found"**
```bash
# Make sure Gradle wrapper exists
cd android
./gradlew --version

# If not, create wrapper
./gradlew wrapper --gradle-version=8.0
```

**Issue: "JAVA_HOME not set"**
```bash
# Check Java location
which java
/usr/libexec/java_home -v 17

# Set it in environment
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

**Issue: "SDK not found"**
```bash
# Install SDK packages
sdkmanager "platforms;android-34"
sdkmanager "build-tools;34.0.0"
```

### PWA Issues

**Issue: "Manifest not found"**
- Verify `public/manifest.json` exists
- Check that manifest is linked in `app/layout.tsx`
- Verify web server returns correct mime type

**Issue: "Service Worker not installing"**
- Check browser console for errors
- Verify `public/sw.js` exists
- Ensure HTTPS is used in production
- Check Application → Service Workers in DevTools

**Issue: "Icons not displaying"**
- Ensure icon files exist in `public/icons/`
- Check icon file formats (must be PNG)
- Verify paths in manifest.json match file names

---

## Configuration Files

### capacitor.config.json
Configures Capacitor for your app:
- App ID, name, and web directory
- Android-specific settings
- Plugin configuration

### next.config.ts
Next.js configuration with PWA:
- PWA settings
- Cache strategies
- Build optimization

### public/manifest.json
PWA manifest:
- App metadata
- Icons
- Display settings
- Shortcuts
- Share target configuration

### public/sw.js
Service Worker:
- Offline support
- Push notifications
- Background sync

---

## Build Scripts Reference

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",                    // Development server
    "build": "next build",                // Production build
    "start": "next start",                // Start production server
    "build:pwa": "next build",            // Build with PWA
    "build:apk": "npm run build && ...",  // Full APK build
    "cap:add:android": "npx cap add android",
    "cap:sync": "npx cap sync",
    "cap:open:android": "npx cap open android"
  }
}
```

---

## Best Practices

### APK:
1. ✅ Always build release APK for production
2. ✅ Use ProGuard/R8 for code obfuscation
3. ✅ Test on multiple Android versions (API 24+)
4. ✅ Keep APK size under 100MB if possible
5. ✅ Sign with your release keystore

### PWA:
1. ✅ Use HTTPS for production
2. ✅ Include all required icon sizes
3. ✅ Test on multiple browsers
4. ✅ Implement proper error boundaries
5. ✅ Cache static assets efficiently
6. ✅ Update service worker cache strategy as needed

---

## Monitoring & Analytics

Add analytics to both APK and PWA:

```typescript
// app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX');
          `}
        </Script>
      </body>
    </html>
  );
}
```

---

## Next Steps

1. **Set up signing key** for release APK
2. **Generate icons** for PWA and APK
3. **Test on multiple devices** (Android, iOS, web)
4. **Configure analytics** for tracking usage
5. **Set up CI/CD** for automated builds
6. **Deploy to app stores** (Google Play, App Store)

---

## Resources

- [Capacitor Documentation](https://capacitorjs.com/)
- [Next.js PWA Guide](https://nextjs.org/docs)
- [Android Developer Guide](https://developer.android.com/)
- [PWA Standards](https://www.w3.org/TR/appmanifest/)
- [Google Play Developer Console](https://play.google.com/console)

---

## Support

For issues:
1. Check the troubleshooting section above
2. Review Capacitor docs: https://capacitorjs.com/docs/basics/development-workflow
3. Check Next.js docs: https://nextjs.org/docs
4. Review browser console for errors
5. Check DevTools Application tab for service worker issues
