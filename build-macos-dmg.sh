#!/bin/bash

# Build macOS DMG that points to production web app
# This creates a native macOS wrapper for the web app

set -e

echo "🔧 Building macOS DMG for The Lost Project..."

# Source Rust environment
source "$HOME/.cargo/env"

# Create a minimal placeholder (Tauri will load URL directly)
mkdir -p out
echo "<!-- Tauri loads URL directly from config -->" > out/index.html

echo "✅ Created minimal build output"

# Build the DMG for Intel only (faster build)
echo "🔨 Building DMG with Tauri (Intel only)..."
npx tauri build --bundles dmg

echo "✅ Build complete!"
echo ""
echo "📦 DMG Location:"
find src-tauri/target -name "*.dmg" -type f 2>/dev/null | head -1 || echo "DMG not found, check build output"
echo ""
echo "To install: Double-click the DMG file and drag the app to Applications"
