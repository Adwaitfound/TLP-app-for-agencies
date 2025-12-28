#!/bin/bash

# Simple macOS app builder
# Bundles the Next.js server build into a native macOS app using Tauri

set -e

echo "🔨 Building macOS App (Tauri + Next.js)..."
echo ""

cd "$(dirname "$0")"
source "$HOME/.cargo/env"

# Step 1: Build Next.js server
echo "📦 Building Next.js production server..."
npm run build

if [ ! -d ".next" ]; then
    echo "❌ Build failed: .next directory not found"
    exit 1
fi

echo "✅ Next.js built"

# Step 2: Create minimal output folder for Tauri  
echo ""
echo "🔧 Preparing bundle..."
mkdir -p out
touch out/index.html

# Step 3: Build Tauri app
echo ""
echo "🏗️  Building Tauri macOS app..."
npx tauri build --bundles dmg

# Step 4: Find and rename DMG
echo ""
DMG=$(find src-tauri/target/release/bundle/macos -name "*.dmg" 2>/dev/null | head -1)

if [ -n "$DMG" ]; then
    SIZE=$(ls -lh "$DMG" | awk '{print $5}')
    FINAL="The-Lost-Project-macOS.dmg"
    
    mv "$DMG" "$FINAL"
    
    echo "✅ Complete!"
    echo ""
    echo "📦 App Ready: $FINAL"
    echo "   Size: $SIZE"
    echo ""
    echo "📲 Installation:"
    echo "   1. Double-click DMG to mount"
    echo "   2. Drag app to Applications folder"
    echo "   3. Launch from Applications"
else
    echo "❌ Build failed - no DMG found"
    exit 1
fi
