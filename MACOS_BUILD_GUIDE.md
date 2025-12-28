# macOS DMG Build Guide

This guide explains how to build and distribute The Lost Project app for macOS.

## Prerequisites

1. **macOS** (required for building .dmg and .app files)
2. **Rust** (install via `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)
3. **Xcode Command Line Tools** (install via `xcode-select --install`)

## Quick Build

### Development Mode
```bash
npm run tauri:dev
```

### Production DMG
```bash
npm run build:macos:dmg
```

The DMG file will be created in: `src-tauri/target/release/bundle/dmg/`

## Features

### ✅ Native macOS App
- Full native performance with Rust backend
- Small bundle size (~10MB vs 100MB+ for Electron)
- Native system tray integration
- macOS-native notifications
- Menu bar icon with quick actions

### ✅ Auto-Updater
- Checks for updates on app startup
- In-app update notifications
- Silent background downloads
- One-click update installation

### ✅ System Integration
- **System Tray**: Shows in menu bar, click to open/hide
- **Notifications**: Native macOS notification center integration
- **Close Behavior**: Closing window hides app (stays in tray)
- **Dock Icon**: Full dock integration with badge support

### ✅ Offline Support
- Service Worker caching
- Local session storage
- Works without internet connection

## Build Commands

```bash
# Development with hot reload
npm run tauri:dev

# Production build (DMG + App)
npm run build:macos

# DMG only (for distribution)
npm run build:macos:dmg

# Full Tauri build (all formats)
npm run tauri:build
```

## Distribution

### Local Installation
1. Build the DMG: `npm run build:macos:dmg`
2. Find it in: `src-tauri/target/release/bundle/dmg/The Lost Project_0.1.47_universal.dmg`
3. Double-click to mount
4. Drag app to Applications folder

### Code Signing (for App Store)
1. Get Apple Developer account
2. Create certificates in Xcode
3. Update `tauri.conf.json`:
```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
      "entitlements": "entitlements.plist"
    }
  }
}
```
4. Build with signing: `npm run build:macos:dmg`

### Auto-Updater Setup

The app checks for updates automatically. To enable:

1. **Generate Update Keys**:
```bash
cd src-tauri
cargo install tauri-cli
cargo tauri signer generate -w ~/.tauri/myapp.key
```

2. **Add Public Key to tauri.conf.json**:
```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

3. **Host Update Manifest**:
Create endpoint at: `https://tlp-app-v2.vercel.app/api/tauri-update/darwin/{{current_version}}`

Response format:
```json
{
  "version": "0.1.48",
  "notes": "Bug fixes and improvements",
  "pub_date": "2025-01-15T12:00:00Z",
  "platforms": {
    "darwin-universal": {
      "signature": "SIGNATURE_HERE",
      "url": "https://your-cdn.com/The-Lost-Project_0.1.48_universal.dmg"
    }
  }
}
```

## System Tray Menu

The app adds a menu bar icon with these options:

- **Show**: Opens the app window
- **Hide**: Hides the app (keeps running in background)
- **---** (separator)
- **Quit**: Completely quits the app

## Keyboard Shortcuts

- **⌘W**: Hide window (doesn't quit)
- **⌘Q**: Quit app completely
- **⌘R**: Refresh (reload page)
- **⌘,**: Open settings (if implemented)

## Troubleshooting

### Build Fails with "xcrun: error"
```bash
xcode-select --install
sudo xcode-select --reset
```

### Rust Not Found
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### DMG Won't Open on Other Macs
You need to code-sign the app. See "Code Signing" section above.

### Notifications Don't Work
1. Check System Preferences → Notifications → The Lost Project
2. Enable "Allow Notifications"
3. Grant permission when prompted

### App Won't Start
1. Check Console.app for errors
2. Remove quarantine flag: `xattr -dr com.apple.quarantine /Applications/The\ Lost\ Project.app`
3. Rebuild: `npm run build:macos:dmg`

## File Structure

```
src-tauri/
├── Cargo.toml              # Rust dependencies
├── tauri.conf.json         # Tauri configuration
├── src/
│   ├── main.rs             # App entry point
│   └── lib.rs              # Main app logic with tray/notifications
├── icons/                  # App icons (auto-generated)
└── target/
    └── release/
        └── bundle/
            ├── dmg/        # DMG installers
            └── macos/      # .app bundles
```

## Next Steps

1. ✅ Build works locally
2. ⏳ Set up code signing for distribution
3. ⏳ Create update server endpoint
4. ⏳ Generate update signing keys
5. ⏳ Test auto-updater flow
6. ⏳ Distribute via website or App Store

## Resources

- [Tauri Documentation](https://tauri.app/v1/guides/)
- [Auto-Updater Guide](https://tauri.app/v1/guides/distribution/updater)
- [macOS Bundling](https://tauri.app/v1/guides/building/macos)
- [Code Signing](https://developer.apple.com/support/code-signing/)
