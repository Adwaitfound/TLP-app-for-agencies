# macOS Standalone App Build Guide

## Overview

This guide explains how to build a **native macOS app** (.dmg installer) for The Lost Project using Tauri.

## What You Get

- ✅ **Native macOS Application** - Appears as a real app in Dock and Applications folder
- ✅ **Offline Capable** - Works with cached data when internet unavailable
- ✅ **Server Built-In** - Bundles Next.js server inside the app
- ✅ **Professional Installation** - DMG installer with drag-to-install
- ✅ **Auto-Updates Ready** - Infrastructure for Tauri updater plugin

## Prerequisites

### 1. Install Rust (One-time)

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
```

### 2. Add macOS targets (One-time)

```bash
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin  # For Apple Silicon
```

## Build Methods

### Method 1: Quick Build (Recommended)

```bash
cd /Users/adwaitparchure/TLP\ APP/TLPappAndroidandPWAbuild
chmod +x build-macos-simple.sh
source ~/.cargo/env
./build-macos-simple.sh
```

**Duration:** ~5-10 minutes (first time), ~2-3 minutes after  
**Output:** `The-Lost-Project-macOS.dmg` in project root

### Method 2: Full Build with Script

```bash
chmod +x build-standalone-dmg.sh
./build-standalone-dmg.sh
```

### Method 3: Manual Steps

```bash
# Step 1: Build Next.js
npm run build

# Step 2: Build Tauri app
source ~/.cargo/env
npx tauri build --bundles dmg

# Step 3: Find DMG
find src-tauri/target -name "*.dmg" -type f
```

## Installation

1. **Mount DMG:** Double-click `The-Lost-Project-macOS.dmg`
2. **Drag to Apps:** Drag "The Lost Project" to Applications folder
3. **Launch:** Open from Applications or Spotlight
4. **First Run:** May need to approve in Security & Privacy settings

### If You Get "Resource Busy" Error

This means the previous DMG is still mounted. Solution:

```bash
# Unmount the old DMG
diskutil unmount "/Volumes/The Lost Project" 2>/dev/null || true

# Try opening the new one
open The-Lost-Project-macOS.dmg
```

## Technical Details

### What's Bundled

- **Next.js Server** (.next folder) - Full app with API routes
- **Static Assets** - icons, manifest, service worker
- **Tauri Runtime** - Native window and OS integration
- **Service Worker** - Offline functionality and caching

### How It Works

1. Tauri creates a native macOS window
2. Next.js server runs inside the app
3. Frontend connects to http://localhost:3000 locally
4. Service Worker enables offline mode
5. All files cached for offline access

### App Size

- **DMG file:** ~50-70 MB compressed
- **Installed:** ~200-300 MB (includes .next build and Tauri runtime)

## Configuration

### Edit App Settings

File: `src-tauri/tauri.conf.json`

```json
{
  "productName": "The Lost Project", // App name
  "version": "0.1.49", // App version
  "identifier": "com.foundtech.tlpapp", // Bundle ID
  "app": {
    "windows": [
      {
        "width": 1400, // Default width
        "height": 900, // Default height
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

### Icons

Place custom icons in: `src-tauri/icons/`

- `icon.icns` - macOS app icon
- `icon.png` - Fallback icon

## Troubleshooting

### Build Fails With "Target not installed"

```bash
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin
```

### "The operation couldn't be completed. Resource busy"

```bash
# Kill any mounting processes
lsof | grep "The Lost Project"
diskutil unmount -force "/Volumes/The Lost Project"

# Clean and rebuild
rm -rf src-tauri/target
./build-macos-simple.sh
```

### DMG Won't Open

1. Make sure macOS version is 10.13 or later
2. Check System Preferences → Security & Privacy
3. Try double-clicking again (may need permission)

### App Slow on First Launch

- App is loading Next.js server
- Subsequent launches will be faster
- All assets are cached

## Performance Tips

1. **Clear build cache** for fresh build:

   ```bash
   rm -rf .next src-tauri/target
   ./build-macos-simple.sh
   ```

2. **Faster subsequent builds:**

   - Rust dependencies cached locally
   - Skip Cargo.lock updates

3. **Optimized build:**
   - Next.js automatically optimizes assets
   - Service Worker caches static files
   - Database queries cached locally

## Next Steps

1. **Test the app:**

   - Open macOS app
   - Test authentication
   - Verify API calls work
   - Test offline mode (unplug network)

2. **Sign and Notarize (for distribution):**

   ```bash
   # Requires Apple Developer account
   # See: https://tauri.app/v1/guides/distribution/sign-macos
   ```

3. **Auto-Updates (optional):**
   - Configure Tauri updater plugin
   - Host updates on server
   - App checks for updates on launch

## Support

For issues:

1. Check Tauri logs: `View → Developer Tools`
2. Check console: `Cmd + Option + J`
3. Rebuild with: `./build-macos-simple.sh`

---

**Created:** December 29, 2025  
**Last Updated:** Version 0.1.49
